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
                        await this.getBackLinks(docID, lastID);
                    }
                },
            });
        });
    }

    async getLastBlockID(docID: string) {
        const ids = await siyuan.getChildBlocks(docID);
        const len = ids.length;
        if (len > 0) return ids[len - 1].id;
        return "";
    }

    async getBackLinks(docID: string, lastID: string) {
        const backlink2 = await siyuan.getBacklink2(docID);
        for (const backlink of backlink2.backlinks) {
            const backlinkDoc = await siyuan.getBacklinkDoc(
                docID,
                backlink.id,
            );
            for (const bkPath of backlinkDoc.backlinks) {
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
                let md = `{{ select * from blocks where id = "${blockID}"}}`;
                md += "\n"
                md += `{: ${TOMATOBACKLINKKEY}="1"}`
                if (lastID) {
                    await siyuan.insertBlockAfter(md, lastID);
                } else {
                    await siyuan.insertBlockAsChildOf(md, lastID);
                }
            }
        }
    }
}

export const backLinkBottomBox = new BackLinkBottomBox();

