import { IProtyle, Lute, Plugin, openTab } from "siyuan";
import { findSummary, getHPathByDocID, getSummaryDoc } from "./helper";
import { NewLute, cleanDiv, getCursorElement, getID, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { DATA_NODE_ID, PROTYLE_WYSIWYG_SELECT } from "../../sy-tomato-plugin/src/libs/gconst";
import { events } from "../../sy-tomato-plugin/src/libs/Events";
import { getBookIDByBlock } from "../../sy-tomato-plugin/src/libs/progressive";

class PieceSummaryBox {
    private plugin: Plugin;
    settings: SettingCfgType;
    lute: Lute;

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        const protyle: IProtyle = detail.protyle;
        // const { isPiece } = isProtylePiece(protyle);
        // if (isPiece) {
        detail.menu.addItem({
            iconHTML: "📨",
            label: this.plugin.i18n.collect,
            click: () => {
                this.copyBlocks(protyle);
            }
        });
        // }
    }

    async onload(plugin: Plugin, settings: SettingCfgType) {
        this.plugin = plugin;
        this.settings = settings;
        this.lute = NewLute();
        this.plugin.addCommand({
            langKey: "collect",
            hotkey: "⌥Z",
            editorCallback: (protyle) => {
                this.copyBlocks(protyle);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            // const protyle: IProtyle = detail.protyle;
            // const { isPiece } = isProtylePiece(protyle);
            // if (isPiece) {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.collect,
                iconHTML: "📨",
                accelerator: "⌥Z",
                click: () => {
                    if (detail?.element) {
                        this.copyBlock(detail?.element);
                    }
                },
            });
            // }
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
                const [_id, div, _s] = await cleanDiv(element as any, true, true);
                const newID = div.getAttribute(DATA_NODE_ID);
                const md = this.lute.BlockDOM2Md(element.outerHTML);
                await siyuan.appendBlock(md, summaryID);
                await openTab({
                    app: this.plugin.app,
                    doc: { id: newID, action: ["cb-get-hl", "cb-get-context", "cb-get-focus"], zoomIn: false },
                    position: "right"
                });
            }
        } else {
            // sent to daily note
            element = element.cloneNode(true) as HTMLElement;
            const [_id, div, _s] = await cleanDiv(element as any, false, false);
            const newID = div.getAttribute(DATA_NODE_ID);
            const md = this.lute.BlockDOM2Md(element.outerHTML);
            const { id: summaryID } = await siyuan.createDailyNote(events.boxID);
            await siyuan.appendBlock(md, summaryID);
            await openTab({
                app: this.plugin.app,
                doc: { id: newID, action: ["cb-get-hl", "cb-get-context", "cb-get-focus"], zoomIn: false },
                position: "right"
            });
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

