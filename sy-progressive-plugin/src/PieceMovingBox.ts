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
            const protyle: IProtyle = detail.protyle;
            if (isProtylePiece(protyle)) {
                const menu = detail.menu;
                menu.addItem({
                    label: "移动到上一分片内",
                    icon: "iconMove",
                    click: () => {
                        const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                        if (blockID) {
                            this.moveBlock(blockID, -1);
                        }
                    },
                });
                menu.addItem({
                    label: "移动到下一分片内",
                    icon: "iconMove",
                    click: () => {
                        const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                        if (blockID) {
                            this.moveBlock(blockID, 1);
                        }
                    },
                });
            }
        });
    }

    private async moveBlock(blockID: string, delta: number) {

    }

    private async move(protyle: IProtyle, delta: number) {

    }
}

export const pieceMovingBox = new PieceMovingBox();
