import { IProtyle, Plugin } from "siyuan";
import { isProtylePiece } from "./helper";

class PieceMovingBox {
    private plugin: Plugin;
    private settings: SettingCfgType;

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        const protyle: IProtyle = detail.protyle;
        if (isProtylePiece(protyle)) {
            detail.menu.addItem({
                iconHTML: "",
                label: "移动到上一分片内",
                click: () => {
                    this.move(protyle, -1);
                }
            });
            detail.menu.addItem({
                iconHTML: "",
                label: "移动到下一分片内",
                click: () => {
                    this.move(protyle, 1);
                }
            });
        }
    }

    async onload(plugin: Plugin, settings: SettingCfgType) {
        this.plugin = plugin;
        this.settings = settings;
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: "移动到上一分片内",
                icon: "iconMove",
                click: () => {
                    // const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    // const blank = detail?.range?.cloneContents()?.textContent ?? "";
                    // if (blockID) {
                    //     this.blankSpaceCard(blockID, blank, detail?.range, detail?.protyle, cardType);
                    // }
                },
            });
            menu.addItem({
                label: "移动到下一分片内",
                icon: "iconMove",
                click: () => {
                    // const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    // const blank = detail?.range?.cloneContents()?.textContent ?? "";
                    // if (blockID) {
                    //     this.blankSpaceCard(blockID, blank, detail?.range, detail?.protyle, cardType, getDailyPath());
                    // }
                },
            });
        });
    }

    private async move(protyle: IProtyle, delta: number) {

    }
}

export const pieceMovingBox = new PieceMovingBox();
