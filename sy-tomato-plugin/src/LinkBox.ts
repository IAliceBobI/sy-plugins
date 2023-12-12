import { IProtyle, Lute, Plugin } from "siyuan";
import { EventType, events } from "@/libs/Events";
import * as gconst from "@/libs/gconst";
import { siyuan } from "@/libs/utils";
import * as utils from "@/libs/utils";

function getDocNameFromProtyle(protyle?: IProtyle) {
    return protyle?.title?.editElement?.textContent ?? "";
}

const LinkBoxDocLinkIAL = "custom-linkboxdoclinkial";

function getDocIAL(blockID: string) {
    return `${LinkBoxDocLinkIAL}="${blockID}"`;
}

class LinkBox {
    private plugin: Plugin;
    private lute: Lute;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.lute = utils.NewLute();

        this.plugin.addCommand({
            langKey: "bilink",
            hotkey: "⌥/",
            editorCallback: async (protyle) => {
                const ids = this.getSelectedIDs(protyle);
                if (ids.length == 0) ids.push(events.lastBlockID);
                const docName = getDocNameFromProtyle(protyle);
                for (const id of ids)
                    await this.addLink(id, docName, protyle?.wysiwyg?.element);
            },
        });
        this.plugin.eventBus.on(EventType.open_menu_content, async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.bilink,
                icon: "iconLink",
                accelerator: "⌥/",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    if (blockID) this.addLink(blockID, getDocNameFromProtyle(detail?.protyle), detail?.protyle?.wysiwyg?.element);
                },
            });
        });
    }

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "",
            label: this.plugin.i18n.bilink,
            click: () => {
                const docName = getDocNameFromProtyle(detail?.protyle);
                for (const element of detail.blockElements) {
                    const blockID = utils.getID(element);
                    if (blockID) {
                        this.addLink(blockID, docName, detail?.protyle?.wysiwyg?.element);
                    }
                }
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

    async extractLinksFromDom(blockID: string) {
        const { dom } = await siyuan.getBlockDOM(blockID);
        const div = document.createElement("div") as HTMLElement;
        div.innerHTML = dom;
        const ids: Set<string> = new Set();
        for (const e of div.querySelectorAll("[data-type*=\"block-ref\"]")) {
            const id = e.getAttribute(gconst.DATA_ID);
            ids.add(id);
        }
        return { ids, dom: div };
    }

    private async addLink(blockID: string, docName: string, element: HTMLLIElement) {
        const { ids, dom } = await this.extractLinksFromDom(blockID);
        if (ids.size <= 0) return;
        await this.turn2static(blockID, dom, element);
        const idRows = utils.chunks(await Promise.all(Array.from(ids.keys()).map((id) => {
            return [id, siyuan.sqlOne(`select type from blocks where id="${id}"`)];
        }).flat()), 2) as [string, Block][];
        let insertCount = 0;
        for (const [id, row] of idRows) {
            const idType = row?.type ?? "";
            if (!idType) continue;
            if (idType == "d") {
                const row = await siyuan.sqlOne(`select id from blocks where ial like '%${getDocIAL(blockID)}%' and root_id="${id}"`);
                if (!row?.id) {
                    let backLink = `((${blockID} "[${docName}]")): ((${blockID} '${dom.innerText}'))`;
                    backLink += "\n{: " + getDocIAL(blockID) + "}";
                    await siyuan.insertBlockAsChildOf(backLink, id);
                    insertCount++;
                }
            } else {
                const backLink = `((${blockID} "[${docName}]"))`;
                const { dom } = await siyuan.getBlockDOM(id);
                const md = this.lute.BlockDOM2Md(dom).trim();
                if (md.includes(backLink)) continue;
                const parts = md.split("\n");
                if (parts.length >= 2) {
                    const lastLine = parts[parts.length - 2];
                    parts[parts.length - 2] = lastLine + backLink;
                }
                await siyuan.safeUpdateBlock(id, parts.join("\n"));
                insertCount++;
            }
        }
        await siyuan.pushMsg(`插入链接：${insertCount}/${ids.size}`);
    }

    private getSelectedIDs(protyle: any) {
        const multiLine = protyle?.element?.getElementsByTagName("div") as HTMLDivElement[] ?? [];
        const ids = [];
        for (const div of multiLine) {
            if (div.classList.contains(gconst.PROTYLE_WYSIWYG_SELECT)) {
                const id = div.getAttribute(gconst.DATA_NODE_ID);
                div.classList.remove(gconst.PROTYLE_WYSIWYG_SELECT);
                ids.push(id);
            }
        }
        return ids;
    }
}

export const linkBox = new LinkBox();
