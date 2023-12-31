import { IProtyle, Lute, Plugin } from "siyuan";
import { getDocIalMark, isProtylePiece } from "./helper";
import { NewLute, cleanDiv, getBlockDiv, isValidNumber, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { DATA_NODE_ID, MarkKey, PROTYLE_WYSIWYG_SELECT } from "../../sy-tomato-plugin/src/libs/gconst";

class PieceMovingBox {
    private plugin: Plugin;
    settings: SettingCfgType;
    private lute: Lute;

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
        this.lute = NewLute();
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
        if (delta == 0) return;
        const row = await siyuan.getDocRowByBlockID(blockID);
        const attrs = await siyuan.getBlockAttrs(row.id);
        const bookID = attrs[MarkKey]?.split("#")[1]?.split(",")[0];
        let pieceNum = Number(attrs[MarkKey]?.split("#")[1]?.split(",")[1]);
        if (isValidNumber(pieceNum) && bookID) {
            pieceNum += delta;
            if (pieceNum >= 0) {
                const row = await siyuan.sqlOne(`select id from blocks where type='d' and ial like "%${getDocIalMark(bookID, pieceNum)}%"`);
                if (row?.id) {
                    const { div } = await getBlockDiv(blockID);
                    cleanDiv(div, false);
                    const md = this.lute.BlockDOM2Md(div.outerHTML);
                    if (delta < 0) {
                        await siyuan.appendBlock(md, row.id);
                    } else {
                        await siyuan.insertBlockAsChildOf(md, row.id);
                    }
                    await siyuan.safeUpdateBlock(blockID, "");
                }
            }
        }
    }

    private async move(protyle: IProtyle, delta: number) {
        const nodes = protyle.element.querySelectorAll(`.${PROTYLE_WYSIWYG_SELECT}`);
        for (const e of nodes) {
            await this.moveBlock(e.getAttribute(DATA_NODE_ID), delta);
        }
    }
}

export const pieceMovingBox = new PieceMovingBox();
