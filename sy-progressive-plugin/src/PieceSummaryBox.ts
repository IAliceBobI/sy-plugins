import { IProtyle, Lute, Plugin, openTab } from "siyuan";
import { findSummary, getBookIDByBlock, getHPathByDocID, getSummaryDoc, isProtylePiece } from "./helper";
import { NewLute, cleanDiv, getCursorElement, getID, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { PROTYLE_WYSIWYG_SELECT } from "../../sy-tomato-plugin/src/libs/gconst";
import { events } from "../../sy-tomato-plugin/src/libs/Events";

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
        const notebook = events.boxID;
        const { bookID } = await getBookIDByBlock(getID(element));
        if (bookID) {
            let summaryID = await findSummary(bookID);
            if (!summaryID) {
                const hpath = await getHPathByDocID(bookID, "summary");
                if (hpath) {
                    summaryID = await getSummaryDoc(bookID, notebook, hpath);
                }
            }
            if (summaryID) {
                element = element.cloneNode(true) as HTMLElement;
                await cleanDiv(element as any, true, true);
                const md = this.lute.BlockDOM2Md(element.outerHTML)
                await siyuan.appendBlock(md, summaryID);
                await openTab({ app: this.plugin.app, doc: { id: summaryID }, position: "right" });
            }
        }
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

