import { Plugin } from "siyuan";
import BackLinkView from "./BackLink.svelte";
import { siyuanCache } from "./libs/utils";


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
                    const title = detail?.protyle?.title?.editElement?.textContent?.trim() ?? "";
                    const docID = detail?.protyle?.block.rootID ?? "";
                    if (docID && title) {
                        await this.getBackLinks(docID, title);
                    }
                },
            });
        });
    }

    async getBackLinks(docID: string, title: string) {
        const bls = await siyuanCache.getBacklink2(30 * 1000, docID);
        for (const lnks of bls.backlinks) {
            const bdocs = await siyuanCache.getBacklinkDoc(
                60 * 1000,
                docID,
                d.id,
            );
        }
    }
}

export const backLinkBottomBox = new BackLinkBottomBox();
