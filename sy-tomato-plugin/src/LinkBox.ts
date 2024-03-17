import { IProtyle, Lute, Plugin } from "siyuan";
import { EventType, events } from "@/libs/Events";
import * as gconst from "@/libs/gconst";
import { extractLinksFromElement, siyuan } from "@/libs/utils";
import * as utils from "@/libs/utils";
import { AttrBuilder } from "./libs/listUtils";

class LinkBox {
    private plugin: Plugin;
    private lute: Lute;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.lute = utils.NewLute();

        this.plugin.addCommand({
            langKey: "bilink",
            hotkey: "⌥/",
            editorCallback: async (protyle: IProtyle) => {
                const { selected, docName, docID } = await events.selectedDivs(protyle);
                for (const div of selected)
                    await this.addLink(div, docID, docName);
            },
        });
        this.plugin.eventBus.on(EventType.open_menu_content, async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.bilink,
                iconHTML: "🔗",
                accelerator: "⌥/",
                click: async () => {
                    const { selected, docName, docID } = await events.selectedDivs(detail.protyle as any);
                    for (const div of selected)
                        await this.addLink(div, docID, docName);
                },
            });
        });
    }

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "🔗",
            label: this.plugin.i18n.bilink,
            click: async () => {
                const { selected, docName, docID } = await events.selectedDivs(detail.protyle as any);
                for (const div of selected)
                    await this.addLink(div, docID, docName);
            }
        });
    }

    async addLink(element: HTMLElement, docID: string, docName: string) {
        element = findPara(element);
        const srcID = element.getAttribute(gconst.DATA_NODE_ID);
        const ids = extractLinksFromElement(element);
        if (ids.length <= 0) return;
        const rows = await siyuan.getRows(ids, "id,type", false);
        let insertCount = 0;
        const newAnchors = new Map<string, string>;
        const ops = [];
        for (const { id, type } of rows) {
            if (!id || !type) continue;
            if (type == "d") {
                const attrRows = await siyuan.sqlAttr(`select block_id from attributes 
                    where name="${gconst.LinkBoxDocLinkIAL}" and value = "${srcID}" and root_id="${id}"`);
                const row = attrRows.pop();
                if (row) {
                    newAnchors.set(id, row.block_id);
                    insertCount++;
                } else {
                    const editable = utils.getContenteditableElement(element);
                    const backLink = `⚓((${docID} '${docName}'))::((${srcID} '${editable.textContent}'))`;
                    const ab = new AttrBuilder("", true);
                    ab.add(gconst.LinkBoxDocLinkIAL, srcID);
                    await siyuan.appendBlock(`${backLink}\n${ab.build()}`, id);
                    newAnchors.set(id, ab.id);
                }
            } else {
                const { div } = await utils.getBlockDiv(id);
                const idInIAL = div.getAttribute(gconst.LinkBoxDocLinkIAL);
                if (idInIAL == srcID) continue;
                const ids = extractLinksFromElement(div);
                if (ids.includes(srcID)) continue;
                div.setAttribute(gconst.LinkBoxDocLinkIAL, srcID);
                const editable = utils.getContenteditableElement(div);
                const span = editable.appendChild(document.createElement("span"));
                span.setAttribute(gconst.DATA_TYPE, gconst.BLOCK_REF);
                span.setAttribute(gconst.DATA_SUBTYPE, "s");
                span.setAttribute(gconst.DATA_ID, srcID);
                span.textContent = `[${docName}]`;
                ops.push(...siyuan.transUpdateBlocks([{ id, domStr: div.outerHTML }]));
                insertCount++;
            }
        }
        await siyuan.transactions(ops);
        await this.turn2static(srcID, element, newAnchors);
        await siyuan.pushMsg(`插入链接：${insertCount}/${ids.length}`);
    }

    private async turn2static(srcID: string, element: HTMLElement, anchors: Map<string, string>) {
        let changed1 = false;
        let changed2 = false;
        for (const e of element.querySelectorAll(`[${gconst.DATA_TYPE}~="${gconst.BLOCK_REF}"]`)) {
            const type = e.getAttribute("data-subtype");
            if (type == "d") {
                e.setAttribute(gconst.DATA_SUBTYPE, "s");
                changed1 = true;
            }
            const anchorID = anchors.get(e.getAttribute(gconst.DATA_ID));
            if (anchorID) {
                e.setAttribute(gconst.DATA_ID, anchorID);
                changed2 = true;
            }
        }
        if (changed1 || changed2) {
            const md = this.lute.BlockDOM2Md(element.outerHTML);
            await siyuan.safeUpdateBlock(srcID, md);
            const e = element.querySelector(`[${gconst.DATA_NODE_ID}="${srcID}"]`) as HTMLElement;
            if (e) {
                document.getSelection().collapse(e, 1);
            }
        }
        if (changed1) {
            await siyuan.pushMsg("改为静态引用");
        }
        if (changed2) {
            await siyuan.pushMsg("修改引用位置");
        }
    }
}

export const linkBox = new LinkBox();

function findPara(element: HTMLElement) {
    if (element.getAttribute(gconst.DATA_TYPE) == gconst.BlockNodeEnum.NODE_LIST_ITEM) {
        const e = element.querySelector(`[${gconst.DATA_TYPE}="${gconst.BlockNodeEnum.NODE_PARAGRAPH}"]`) as HTMLElement;
        if (e) element = e;
    }
    return element;
}
