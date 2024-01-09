import { ICardData, IProtyle, Plugin } from "siyuan";
import "./index.scss";

class CardPriorityBox {
    private plugin: Plugin;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: "闪卡增加一点优先级",
                icon: "iconFlashcard",
                accelerator: "⌥E",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    if (blockID) {
                        // this.blankSpaceCard(blockID, blank, detail?.range, detail?.protyle, cardType);
                    }
                },
            });
            menu.addItem({
                label: "闪卡减少一点优先级",
                icon: "iconFlashcard",
                accelerator: "⌘`",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    if (blockID) {
                        // this.blankSpaceCard(blockID, blank, detail?.range, detail?.protyle, cardType, getDailyPath());
                    }
                },
            });
        });
    }

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "",
            label: "闪卡增加一点优先级",
            click: () => {
                this.updatePriority(detail.protyle, +1);
            }
        });
        detail.menu.addItem({
            iconHTML: "",
            label: "闪卡减少一点优先级",
            click: () => {
                this.updatePriority(detail.protyle, -1);
            }
        });
    }

    private async updatePriority(_protyle: IProtyle, _delta: number) {

    }

    async updateCards(options: ICardData) {
        if (!this.plugin) return;
        return options;
    }

}

export const cardPriorityBox = new CardPriorityBox();
