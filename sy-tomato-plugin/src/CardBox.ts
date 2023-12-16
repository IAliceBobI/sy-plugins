import { Plugin, confirm } from "siyuan";
import { getID, siyuan, sleep } from "@/libs/utils";
import "./index.scss";
import { events } from "@/libs/Events";

class CardBox {
    private plugin: Plugin;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "removeBrokenCards",
            hotkey: "",
            globalCallback: async () => {
                // todo: instead of query the db, scan all .sy files for safty.
                confirm(this.plugin.i18n.removeBrokenCards, "<strong>务必，请先看说明，或者备份好。</strong><a href=\"https://gitee.com/TokenzQdBN/sy-plugins/blob/main/sy-tomato-plugin/README_zh_CN.md#%E6%B8%85%E7%90%86%E5%A4%B1%E6%95%88%E9%97%AA%E5%8D%A1\">说明</a>", async () => {
                    const ids = await siyuan.removeBrokenCards();
                    if (ids.length) {
                        siyuan.pushMsg(`${this.plugin.i18n.removedBrokenCards}${ids}`);
                    } else {
                        siyuan.pushMsg(this.plugin.i18n.thereIsNoInvalidCards);
                    }
                });
            },
        });
        this.plugin.addCommand({
            langKey: "addFlashCard",
            hotkey: "⌘1",
            globalCallback: async () => {
                await this.addFlashCard();
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.addFlashCard,
                icon: "iconFlashcard",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    if (blockID) {
                        this.addFlashCard(blockID);
                    }
                },
            });
        });
    }

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "",
            label: this.plugin.i18n.addFlashCard,
            click: () => {
                for (const element of detail.blockElements) {
                    const blockID = getID(element);
                    if (blockID) {
                        this.addFlashCard(blockID);
                        break;
                    }
                }
            }
        });
    }

    private async addFlashCard(blockID?: string) {
        if (!blockID) blockID = events.lastBlockID;
        if (!blockID) {
            siyuan.pushMsg(this.plugin.i18n.clickOneBlockFirst);
            return;
        }
        let count = 30;
        let md = "";
        let msgSent = false;
        while (count > 0) {
            count -= 1;
            const [listID, mdret] = await siyuan.findListType(blockID);
            md = mdret;
            if (listID) {
                await siyuan.addRiffCards([listID]);
                break;
            }
            if (!msgSent) {
                siyuan.pushMsg(this.plugin.i18n.lookingForTheList, 2000);
                msgSent = true;
            }
            await sleep(200);
        }
        if (count <= 0) {
            siyuan.pushMsg(md + "<br>" + this.plugin.i18n.reindex, 0);
        }
    }
}

export const cardBox = new CardBox();
