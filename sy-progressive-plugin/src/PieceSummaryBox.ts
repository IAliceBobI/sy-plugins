import { IProtyle, Lute, Plugin } from "siyuan";
import { getBookIDByBlock, isProtylePiece } from "./helper";
import { NewLute, getCursorElement, getID, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { PROTYLE_WYSIWYG_SELECT } from "../../sy-tomato-plugin/src/libs/gconst";

class PieceSummaryBox {
    private plugin: Plugin;
    settings: SettingCfgType;
    lute: Lute;

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        const protyle: IProtyle = detail.protyle;
        if (isProtylePiece(protyle)) {
            detail.menu.addItem({
                iconHTML: "📨",
                label: this.plugin.i18n.collect,
                click: () => {
                    this.copyBlocks(protyle);
                }
            });
        }
    }

    async onload(plugin: Plugin, settings: SettingCfgType) {
        this.plugin = plugin;
        this.settings = settings;
        this.lute = NewLute();
        this.plugin.addCommand({
            langKey: "collect",
            hotkey: "⌥Z",
            editorCallback: (protyle) => {
                if (isProtylePiece(protyle)) {
                    this.copyBlocks(protyle);
                } else {
                    siyuan.pushMsg("请在渐进阅读的分片内操作。");
                }
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const protyle: IProtyle = detail.protyle;
            if (isProtylePiece(protyle)) {
                const menu = detail.menu;
                menu.addItem({
                    label: this.plugin.i18n.collect,
                    icon: "iconCopy",
                    click: () => {
                        if (detail?.element) {
                            this.copyBlock(detail?.element);
                        }
                    },
                });
            }
        });
    }

    private async copyBlock(element: HTMLElement) {
        const { bookID } = await getBookIDByBlock(getID(element));
        console.log(element);
    }

    private async copyBlocks(protyle: IProtyle) {
        const nodes = protyle.element.querySelectorAll(`.${PROTYLE_WYSIWYG_SELECT}`);
        if (nodes.length > 0) {
            for (const e of nodes) {
                await this.copyBlock(e as HTMLElement);
            }
        } else {
            await this.copyBlock(getCursorElement() as HTMLElement);
        }
    }
}

export const pieceSummaryBox = new PieceSummaryBox();

