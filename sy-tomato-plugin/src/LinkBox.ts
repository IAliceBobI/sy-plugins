import { Lute, Plugin } from "siyuan";
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
            editorCallback: async (protyle) => {
                const ids = this.getSelectedIDs(protyle);
                if (ids.length == 0) ids.push(events.lastBlockID);
                for (const id of ids)
                    await this.addLink(id, protyle?.wysiwyg?.element);
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
                    if (blockID) this.addLink(blockID, detail?.protyle?.wysiwyg?.element);
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
                for (const element of detail.blockElements) {
                    const blockID = utils.getID(element);
                    if (blockID) {
                        this.addLink(blockID, detail?.protyle?.wysiwyg?.element);
                    }
                }
            }
        });
    }

    private async turn2static(blockID: string, md: string, links: string[], element: HTMLLIElement) {
        let mdTemp = md;
        for (const lnk of links) {
            if (lnk.includes("'")) {
                const st = lnk.replace(/'/g, '"');
                mdTemp = mdTemp.replace(lnk, st);
            }
        }
        if (mdTemp != md) {
            await siyuan.safeUpdateBlock(blockID, mdTemp);
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
        const ids = [];
        const links = [];
        for (const e of div.querySelectorAll("[data-type*=\"block-ref\"]")) {
            const id = e.getAttribute(gconst.DATA_ID);
            const txt = e.textContent;
            const type = e.getAttribute("data-subtype");
            ids.push(id);
            if (type == "d") {
                links.push(`((${id} '${txt}'))`);
            } else {
                links.push(`((${id} "${txt}"))`);
            }
        }
        return { links, ids, md: this.lute.BlockDOM2Md(dom).trim(), content: div.innerText };
    }

    private async addLink(blockID: string, element: HTMLLIElement) {
        const { links, ids, md, content } = await this.extractLinksFromDom(blockID);
        if (ids.length <= 0) return;
        const docID = await siyuan.getDocIDByBlockID(blockID);
        if (!docID) return;
        const { content: docName } = await siyuan.getBlockMarkdownAndContent(docID);
        if (!docName) return;
        await this.turn2static(blockID, md, links, element);
        for (const link of ids) {
            const row = await siyuan.sqlOne(`select type from blocks where id="${link}"`);
            const idType = row?.type ?? "";
            if (!idType) continue;
            if (idType == "d") {
                const backLink = `((${blockID} '${content}'))`;
                await siyuan.insertBlockAsChildOf(backLink, link);
            } else {
                const backLink = `((${blockID} "[${docName}]"))`;
                const { dom } = await siyuan.getBlockDOM(link);
                const md = this.lute.BlockDOM2Md(dom).trim();
                if (md.includes(backLink)) continue;
                const parts = md.split("\n");
                if (parts.length >= 2) {
                    const lastLine = parts[parts.length - 2];
                    parts[parts.length - 2] = lastLine + backLink;
                }
                await siyuan.safeUpdateBlock(link, parts.join("\n"));
            }
        }
        await siyuan.pushMsg(`已经插入${ids.length}个链接。`);
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
