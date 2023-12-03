import { Lute, Plugin } from "siyuan";
import { NewLute, siyuan } from "./libs/utils";
import { DATA_NODE_ID, DATA_TYPE } from "./libs/gconst";
import { TOMATOBACKLINKKEY } from "./constants";
import { events } from "./libs/Events";

class BackLinkBottomBox {
    private plugin: Plugin;

    onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "bottombacklink",
            hotkey: "",
            callback: async () => {
                await this.doTheWork(events.docID);
            },
        });
        this.plugin.addCommand({
            langKey: "bottombacklinkEmb",
            hotkey: "",
            callback: async () => {
                await this.doTheWork(events.docID, true);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.bottombacklink.split("#")[0],
                icon: "iconLink",
                click: async () => {
                    const docID = detail?.protyle?.block.rootID ?? "";
                    await this.doTheWork(docID);
                },
            });
            menu.addItem({
                label: this.plugin.i18n.bottombacklinkEmb.split("#")[0],
                icon: "iconLink",
                click: async () => {
                    const docID = detail?.protyle?.block.rootID ?? "";
                    await this.doTheWork(docID, true);
                },
            });
        });
    }

    private async doTheWork(docID: string, isEmb = false) {
        if (docID) {
            const lastID = await this.getLastBlockID(docID);
            await this.rmbacklink(docID);
            await siyuan.pushMsg("正在刷新底部反链区");
            await this.getBackLinks(docID, lastID, isEmb);
        }
    }

    async rmbacklink(docID: string) {
        const rows = await siyuan.sql(`select id from blocks where ial like '%${TOMATOBACKLINKKEY}%' and root_id="${docID}"`);
        for (const row of rows) {
            await siyuan.safeDeleteBlock(row["id"]);
        }
    }

    async getLastBlockID(docID: string) {
        const idtypes = await siyuan.getChildBlocks(docID);
        idtypes.reverse();
        for (const idtype of idtypes) {
            const row = await siyuan.sqlOne(`select ial from blocks where id="${idtype.id}"`);
            const ial: string = row?.ial ?? "";
            if (!ial.includes(TOMATOBACKLINKKEY)) {
                return idtype.id;
            }
        }
        return "";
    }

    async getBackLinks(docID: string, lastID: string, isEmb = false) {
        const lute = NewLute();
        const backlink2 = await siyuan.getBacklink2(docID);
        {
            let shouldInsertSplit = false;
            for (const memtion of backlink2.backmentions.reverse()) {
                const memtionDoc = await siyuan.getBackmentionDoc(docID, memtion.id);
                for (const bkPath of memtionDoc.backmentions) {
                    shouldInsertSplit = await this.embedDom(bkPath, lastID, lute, isEmb);
                }
            }
            if (shouldInsertSplit) await this.insertMd("---", lastID);
        }
        {
            let shouldInsertSplit = false;
            for (const backlink of backlink2.backlinks.reverse()) {
                const backlinkDoc = await siyuan.getBacklinkDoc(docID, backlink.id);
                for (const bkPath of backlinkDoc.backlinks.reverse()) {
                    shouldInsertSplit = await this.embedDom(bkPath, lastID, lute, isEmb);
                }
            }
            if (shouldInsertSplit) await this.insertMd("---", lastID);
        }
    }

    private async embedDom(bkPath: Backlink, lastID: string, lute: Lute, isEmb = false) {
        if (!bkPath) return;
        const div = document.createElement("div") as HTMLDivElement;
        div.innerHTML = bkPath.dom;
        if (div.firstElementChild.getAttribute(TOMATOBACKLINKKEY)) {
            return;
        }
        await this.insertMd("---", lastID);
        const blockID = div.firstElementChild.getAttribute(DATA_NODE_ID);
        const data_type = div.firstElementChild.getAttribute(DATA_TYPE);
        if (data_type == "NodeListItem") {
            const [listID] = await siyuan.findListType(blockID);
            if (listID && listID != blockID) {
                const { dom } = await siyuan.getBlockDOM(listID);
                div.innerHTML = dom;
                const startDiv = div.querySelector(`[data-node-id="${blockID}"]`) as HTMLDivElement;
                this.keepPath2Root(startDiv);
                this.removeDataNodeIdRecursively(div);
                div.firstElementChild.setAttribute(TOMATOBACKLINKKEY, "1");
                const md = lute.BlockDOM2Md(div.innerHTML);
                await this.insertMd(md, lastID);
                if (isEmb) {
                    await this.insertMd(`{{select * from blocks where id="${blockID}"}}`, lastID);
                } else {
                    await this.insertPath(bkPath, lastID);
                }
                return true;
            }
        }
        if (isEmb) {
            await this.insertMd(`{{select * from blocks where id="${blockID}"}}`, lastID);
        } else {
            this.removeDataNodeIdRecursively(div);
            div.firstElementChild.setAttribute(TOMATOBACKLINKKEY, "1");
            const md = lute.BlockDOM2Md(div.innerHTML);
            await this.insertMd(md, lastID);
            await this.insertPath(bkPath, lastID);
        }
        return true;
    }

    private async insertPath(bkPath: Backlink, lastID: string) {
        const refList = [];
        for (const refs of bkPath.blockPaths) {
            if (refs.type == "NodeHeading" || refs.type == "NodeDocument") {
                refList.push(`((${refs.id} "[${refs.name}]"))`);
            } else {
                refList.push(`((${refs.id} "[${refs.name.slice(0, 10)}...]"))`);
            }
        }
        await this.insertMd(refList.join(" -> "), lastID);
    }

    private keepPath2Root(div: HTMLDivElement) {
        if (!div) return;
        for (const child of div.parentElement?.childNodes ?? []) {
            if (child.nodeType === 1) {
                const subDiv = child as HTMLElement;
                const id = subDiv.getAttribute(DATA_NODE_ID);
                if (id == div.getAttribute(DATA_NODE_ID)) continue;
                for (const cls of subDiv.classList) {
                    if (cls.startsWith("protyle-")) continue;
                }
                div.parentElement?.removeChild(subDiv);
            }
        }
        this.keepPath2Root(div.parentElement as HTMLDivElement);
    }

    private removeDataNodeIdRecursively(element: HTMLElement) {
        element.removeAttribute("data-node-id");
        const childElements = element.children;
        for (let i = 0; i < childElements.length; i++) {
            const childElement = childElements[i] as HTMLElement;
            this.removeDataNodeIdRecursively(childElement);
        }
    }

    private async insertMd(md: string, lastID: string) {
        md += "\n";
        md += `{: ${TOMATOBACKLINKKEY}="1"}`;
        if (lastID) {
            await siyuan.insertBlockAfter(md, lastID);
        } else {
            await siyuan.insertBlockAsChildOf(md, lastID);
        }
    }
}

export const backLinkBottomBox = new BackLinkBottomBox();

