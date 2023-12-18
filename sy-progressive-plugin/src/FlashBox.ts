import { IProtyle, Plugin, openTab } from "siyuan";
import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import * as utils from "../../sy-tomato-plugin/src/libs/utils";
import { events } from "../../sy-tomato-plugin/src/libs/Events";
import * as gconst from "../../sy-tomato-plugin/src/libs/gconst";
import { MarkKey, TEMP_CONTENT } from "./constants";

enum CardType {
    B = "B", C = "C", None = "None"
}

function getDailyPath() {
    const today = utils.timeUtil.dateFormat(new Date()).split(" ")[0];
    const [y, m] = today.split("-");
    return `/daily card/c${y}/c${y}-${m}/c${today}`;
}

function getDailyAttrValue() {
    const today = utils.timeUtil.dateFormat(new Date()).split(" ")[0];
    const [y, m, d] = today.split("-");
    return y + m + d;
}

async function isInPiece(protyle: IProtyle): Promise<[string, boolean]> {
    const docID = protyle.block?.rootID ?? "";
    if (!docID) return [docID, false];
    const attrs = await siyuan.getBlockAttrs(docID);
    if (attrs[MarkKey]?.startsWith(TEMP_CONTENT)) return [docID, true];
    return [docID, false];
}

function getBlockDOM(dom: HTMLElement): { dom: HTMLElement, blockID: string } {
    if (!dom) return {} as any;
    if (dom?.tagName?.toLocaleLowerCase() == "body") return {} as any;
    const blockID: string = dom.getAttribute(gconst.DATA_NODE_ID) ?? "";
    if (!blockID) return getBlockDOM(dom.parentElement);
    return { dom, blockID };
}

class FlashBox {
    private plugin: Plugin;
    private settings: SettingCfgType;

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        let cardType = CardType.None;
        if (this.settings.addCodeBlock) {
            cardType = CardType.C;
        } else if (this.settings.addQuoteBlock) {
            cardType = CardType.B;
        }
        detail.menu.addItem({
            iconHTML: "",
            label: this.plugin.i18n.insertBlankSpaceCard,
            click: () => {
                this.makeCard(detail.protyle, cardType);
            }
        });
        detail.menu.addItem({
            iconHTML: "",
            label: this.plugin.i18n.send2dailyCard,
            click: () => {
                this.makeCard(detail.protyle, cardType, getDailyPath());
            }
        });
    }

    async onload(plugin: Plugin, settings: SettingCfgType) {
        this.plugin = plugin;
        this.settings = settings;
        let cardType = CardType.None;
        if (this.settings.addCodeBlock) {
            cardType = CardType.C;
        } else if (this.settings.addQuoteBlock) {
            cardType = CardType.B;
        }
        this.plugin.addCommand({
            langKey: "insertBlankSpaceCard",
            hotkey: "⌥E",
            editorCallback: (protyle) => {
                this.makeCard(protyle, cardType);
            },
        });
        this.plugin.addCommand({
            langKey: "send2dailyCard",
            hotkey: "⌘`",
            editorCallback: (protyle) => {
                this.makeCard(protyle, cardType, getDailyPath());
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.insertBlankSpaceCard,
                icon: "iconFlashcard",
                accelerator: "⌥E",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    const blank = detail?.range?.cloneContents()?.textContent ?? "";
                    if (blockID) {
                        this.blankSpaceCard(blockID, blank, detail?.range, detail?.protyle, cardType);
                    }
                },
            });
            menu.addItem({
                label: this.plugin.i18n.send2dailyCard,
                icon: "iconFlashcard",
                accelerator: "⌘`",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    const blank = detail?.range?.cloneContents()?.textContent ?? "";
                    if (blockID) {
                        this.blankSpaceCard(blockID, blank, detail?.range, detail?.protyle, cardType, getDailyPath());
                    }
                },
            });
        });
    }

    private async makeCard(protyle: IProtyle, t: CardType, path?: string) {
        const { lastSelectedID, markdowns } = this.cloneSelectedLineMarkdowns(protyle);
        if (lastSelectedID) { // multilines
            await this.insertCard(protyle, markdowns, t, lastSelectedID, path);
        } else {
            const blockID = events.lastBlockID;
            const range = document.getSelection()?.getRangeAt(0);
            const blank = range?.cloneContents()?.textContent ?? "";
            if (blockID) {
                this.blankSpaceCard(blockID, blank, range, protyle, t, path);
            }
        }
    }

    private async getHPathByDocID(docID: string, inPiece: boolean) {
        const row = await siyuan.sqlOne(`select hpath from blocks where id = "${docID}"`)
        let path = row?.hpath ?? "";
        if (!path) return "";
        const parts = path.split("/");
        if (inPiece) {
            parts.pop();
        }
        const docName = parts.pop();
        const cardDocName = docName + "-card";
        parts.push(docName);
        parts.push(cardDocName);
        path = parts.join("/")
        return path;
    }

    private async insertCard(protyle: IProtyle, markdowns: string[], t: CardType, lastSelectedID: string, path?: string) {
        const boxID = events.boxID;
        const [docID, inPiece] = await isInPiece(protyle);
        if (!docID) return;
        const { cardID, markdown } = this.createList(markdowns, t);
        if (path) {
            {
                const v = getDailyAttrValue();
                const attr = {};
                attr[`custom-dailycard-${v}`] = v;
                const targetDocID = await utils.siyuanCache.createDocWithMdIfNotExists(10000, boxID, path, "", attr);
                await siyuan.insertBlockAsChildOf(markdown, targetDocID);
                await utils.sleep(100);
                await siyuan.insertBlockAsChildOf("", targetDocID);
                openTab({ app: this.plugin.app, doc: { id: targetDocID }, position: "right" });
            } {
                const emPath = await this.getHPathByDocID(docID, inPiece);
                const targetDocID = await utils.siyuanCache.createDocWithMdIfNotExists(10000, boxID, emPath, "");
                await siyuan.insertBlockAsChildOf(`{{select * from blocks where id = "${cardID}"}}`, targetDocID);
                await siyuan.insertBlockAsChildOf("", targetDocID);
            }
        } else if (inPiece) {
            await siyuan.appendBlock(markdown, docID);
            await utils.sleep(100);
            await siyuan.appendBlock("", docID);
        } else {
            await siyuan.insertBlockAfter("", lastSelectedID);
            await utils.sleep(100);
            await siyuan.insertBlockAfter(markdown, lastSelectedID);
            await utils.sleep(100);
            await siyuan.insertBlockAfter("", lastSelectedID);
        }
        await siyuan.addRiffCards([cardID]);
        await siyuan.pushMsg("⚡🗃" + markdown.split("(")[0], 1234);
    }

    private createList(markdowns: string[], cardType: CardType) {
        const tmp = [];
        for (const m of markdowns) {
            tmp.push("* " + m);
        }
        const cardID = utils.NewNodeID();
        if (cardType === CardType.C) {
            tmp.push("* ```");
        } else if (cardType === CardType.B) {
            tmp.push("* >");
        }
        tmp.push(`{: id="${cardID}"}`);
        return { cardID, "markdown": tmp.join("\n") };
    }

    private cloneSelectedLineMarkdowns(protyle: IProtyle) {
        const lute = utils.NewLute();
        const multiLine = protyle?.element?.getElementsByTagName("div") as unknown as HTMLDivElement[] ?? [];
        const markdowns = [];
        let setRef = true;
        let lastSelectedID = "";
        for (const div of multiLine) {
            if (div.classList.contains(gconst.PROTYLE_WYSIWYG_SELECT)) {
                div.classList.remove(gconst.PROTYLE_WYSIWYG_SELECT);
                const [id, elem, hasRef] = this.cloneDiv(div, setRef);
                if (hasRef) setRef = false;
                lastSelectedID = id;
                markdowns.push(lute.BlockDOM2Md(elem.outerHTML));
            }
        }
        return { markdowns, lastSelectedID };
    }

    private cloneDiv(div: HTMLDivElement, setRef: boolean): [string, HTMLElement, boolean] {
        div = div.cloneNode(true) as HTMLDivElement;
        return utils.cleanDiv(div, setRef);
    }

    private async blankSpaceCard(blockID: string, selected: string, range: Range, protyle: IProtyle, cardType: CardType, path?: string) {
        const lute = utils.NewLute();
        let md = "";
        const { dom } = getBlockDOM(range.endContainer.parentElement);
        if (!dom) return;
        if (selected) {
            protyle.toolbar.setInlineMark(protyle, "mark", "range");
            const [_id, div] = this.cloneDiv(dom as HTMLDivElement, true);
            protyle.toolbar.setInlineMark(protyle, "mark", "range");
            md = lute.BlockDOM2Md(div.outerHTML);
        } else {
            const [_id, div] = this.cloneDiv(dom as HTMLDivElement, true);
            md = lute.BlockDOM2Md(div.outerHTML);
        }
        await this.insertCard(protyle, [md], cardType, blockID, path);
    }
}

export const flashBox = new FlashBox();
