import { Plugin } from "siyuan";
import { siyuan, sleep } from "@/libs/utils";
import "./index.scss";
import { events } from "@/libs/Events";

class CardBox {
    private plugin: Plugin;

    onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "removeBrokenCards",
            hotkey: "",
            globalCallback: async () => {
                const ids = await siyuan.removeBrokenCards();
                if (ids.length) {
                    siyuan.pushMsg(`${this.plugin.i18n.removedBrokenCards}${ids}`);
                } else {
                    siyuan.pushMsg(this.plugin.i18n.thereIsNoInvalidCards);
                }
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
