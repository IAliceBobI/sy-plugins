import { Lute, Plugin } from "siyuan";
import { EventType, events } from "@/libs/Events";
import * as gconst from "@/libs/gconst";
import { siyuan } from "@/libs/utils";
import * as utils from "@/libs/utils";

class LinkBox {
    private plugin: Plugin;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
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

    private async turn2static(blockID: string, links: string[], lute: Lute, element: HTMLLIElement) {
        const { dom } = await siyuan.getBlockDOM(blockID);
        let md = lute.BlockDOM2Md(dom);
        for (const lnk of links) {
            if (lnk.includes("'")) {
                const st = lnk.replace(/'/g, '"');
                md = md.replace(lnk, st);
            }
        }
        await siyuan.safeUpdateBlock(blockID, md);
        const e = element.querySelector(`[${gconst.DATA_NODE_ID}="${blockID}"]`) as HTMLElement;
        if (e) {
            document.getSelection().collapse(e, 1)
        }
    }

    private async addLink(blockID: string, element: HTMLLIElement) {
        const { markdown } = await siyuan.getBlockMarkdownAndContent(blockID);
        const { links, ids } = utils.extractLinks(markdown);
        if (ids.length <= 0) return;
        const docID = await siyuan.getDocIDByBlockID(blockID);
        if (!docID) return;
        const { content } = await siyuan.getBlockMarkdownAndContent(docID);
        if (!content) return;
        const lute = utils.NewLute();
        await this.turn2static(blockID, links, lute, element);
        for (const link of ids) {
            const row = await siyuan.sqlOne(`select type from blocks where id="${link}"`);
            const idType = row?.type ?? "";
            if (!idType) continue;
            const backLink = `((${blockID} "[${content}]"))`;
            if (idType == "d") {
                await siyuan.insertBlockAsChildOf(backLink, link);
            } else {
                const { dom } = await siyuan.getBlockDOM(link);
                const md = lute.BlockDOM2Md(dom).trim();
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
