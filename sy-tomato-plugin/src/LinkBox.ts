import { IProtyle, Lute, Plugin } from "siyuan";
import { EventType, events } from "@/libs/Events";
import * as gconst from "@/libs/gconst";
import { siyuan } from "@/libs/utils";
import * as utils from "@/libs/utils";

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
                const { selected, docName } = await events.selectedDivs(protyle);
                for (const div of selected)
                    await this.addLink(div, docName);
            },
        });
        this.plugin.eventBus.on(EventType.open_menu_content, async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.bilink,
                icon: "iconLink",
                accelerator: "⌥/",
                click: async () => {
                    const { selected, docName } = await events.selectedDivs(detail.protyle as any);
                    for (const div of selected)
                        await this.addLink(div, docName);
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
                const { selected, docName } = await events.selectedDivs(detail.protyle as any);
                for (const div of selected)
                    await this.addLink(div, docName);
            }
        });
    }

    private async turn2static(blockID: string, dom: HTMLElement, element: HTMLLIElement) {
        let changed = false;
        for (const e of dom.querySelectorAll("[data-type*=\"block-ref\"]")) {
            const type = e.getAttribute("data-subtype");
            if (type == "d") {
                e.setAttribute("data-subtype", "s");
                changed = true;
            }
        }
        if (changed) {
            const md = this.lute.BlockDOM2Md(dom.innerHTML);
            await siyuan.safeUpdateBlock(blockID, md);
            const e = element.querySelector(`[${gconst.DATA_NODE_ID}="${blockID}"]`) as HTMLElement;
            if (e) {
                document.getSelection().collapse(e, 1);
            }
        }
    }

    async extractLinksFromDom(div: HTMLElement) {
        const ids: Set<string> = new Set();
        for (const e of div.querySelectorAll(`[${gconst.DATA_TYPE}*="${gconst.BLOCK_REF}"]`)) {
            const id = e.getAttribute(gconst.DATA_ID);
            ids.add(id);
        }
        return [...ids.values()];
    }

    private async addLink(element: HTMLElement, docName: string) {
        const ids = await this.extractLinksFromDom(element);
        if (ids.length <= 0) return;
        // events.protyle.updateTransaction();
        // await this.turn2static(element);
        const rows = await siyuan.getRows(ids, "id,type", false);
        let insertCount = 0;
        for (const { id, type } of rows) {
            if (!id || !type) continue;
            if (type == "d") {
                await siyuan.sqlAttr(`select block_id from attributes where name="${gconst.LinkBoxDocLinkIAL}" and value = "${id}" and root_id="${id}"`)
                // const row = await siyuan.sqlOne(`select id from blocks where ial like '%${getDocIAL(blockID)}%' and root_id="${id}"`);
                if (!row?.id) {
                    let backLink = `((${blockID} "[${docName}]")): ((${blockID} '${dom.innerText}'))`;
                    backLink += "\n{: " + getDocIAL(blockID) + "}";
                    await siyuan.insertBlockAsChildOf(backLink, id);
                    insertCount++;
                }
            } else {
                // const backLink = `((${blockID} "[${docName}]"))`;
                // const { dom } = await siyuan.getBlockDOM(id);
                // const md = this.lute.BlockDOM2Md(dom).trim();
                // if (md.includes(backLink)) continue;
                // const parts = md.split("\n");
                // if (parts.length >= 2) {
                //     const lastLine = parts[parts.length - 2];
                //     parts[parts.length - 2] = lastLine + backLink;
                // }
                // await siyuan.safeUpdateBlock(id, parts.join("\n"));
                // insertCount++;
            }
        }
        await siyuan.pushMsg(`插入链接：${insertCount}/${ids.length}`);
    }
}

export const linkBox = new LinkBox();
