import { Plugin } from "siyuan";
import { siyuan } from "./libs/utils";
import { DATA_NODE_ID, DATA_TYPE } from "./libs/gconst";
import { TOMATOBACKLINKKEY } from "./constants";

class BackLinkBottomBox {
    private plugin: Plugin;

    onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: "刷新底部反链",
                icon: "iconLink",
                click: async () => {
                    const docID = detail?.protyle?.block.rootID ?? "";
                    if (docID) {
                        const lastID = await this.getLastBlockID(docID);
                        await this.rmbacklink(docID);
                        await this.getBackLinks(docID, lastID);
                    }
                },
            });
        });
    }

    async rmbacklink(docID: string) {
        const rows = await siyuan.sql(`select id from blocks where ial like '%${TOMATOBACKLINKKEY}%' and root_id="${docID}"`)
        console.log(rows)
        for (const row of rows) {
            await siyuan.safeDeleteBlock(row['id'])
        }
    }

    async getLastBlockID(docID: string) {
        const idtypes = await siyuan.getChildBlocks(docID);
        idtypes.reverse();
        for (const idtype of idtypes) {
            const row = await siyuan.sqlOne(`select ial from blocks where id="${idtype.id}"`)
            const ial: string = row?.ial ?? "";
            if (!ial.includes(TOMATOBACKLINKKEY)) {
                return idtype.id
            }
        }
        return ''
    }

    async getBackLinks(docID: string, lastID: string) {
        const backlink2 = await siyuan.getBacklink2(docID);
        for (const memtion of backlink2.backmentions.reverse()) {
            const memtionDoc = await siyuan.getBackmentionDoc(docID, memtion.id);
            for (const bkPath of memtionDoc.backmentions) {
                await this.embedDom(bkPath, lastID);
            }
        }
        for (const backlink of backlink2.backlinks) {
            const backlinkDoc = await siyuan.getBacklinkDoc(docID, backlink.id);
            for (const bkPath of backlinkDoc.backlinks.reverse()) {
                await this.embedDom(bkPath, lastID);
            }
        }
        await this.insertMd("---", lastID);
    }

    private async embedDom(bkPath: Backlink, lastID: string) {
        const div = document.createElement("div") as HTMLDivElement;
        div.innerHTML = bkPath.dom;
        let blockID = div.firstElementChild.getAttribute(DATA_NODE_ID);
        const data_type = div.firstElementChild.getAttribute(DATA_TYPE);
        if (data_type == 'NodeListItem') {
            const [listID] = await siyuan.findListType(blockID);
            if (listID) {
                blockID = listID;
            }
        }
        const md = `{{ select * from blocks where id = "${blockID}"}}`;
        await this.insertMd(md, lastID);
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

