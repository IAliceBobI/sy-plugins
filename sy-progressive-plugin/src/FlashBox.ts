import { IProtyle, Lute, Plugin, openTab } from "siyuan";
import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import * as utils from "../../sy-tomato-plugin/src/libs/utils";
import { events } from "../../sy-tomato-plugin/src/libs/Events";
import * as gconst from "../../sy-tomato-plugin/src/libs/gconst";
import { getCardsDoc, getHPathByDocID } from "./helper";

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

async function isInPiece(protyle: IProtyle): Promise<{ bookID: string, pieceID: string, isPiece: boolean }> {
    const ret = {} as any;
    ret.pieceID = protyle.block?.rootID ?? "";
    ret.isPiece = false;
    if (ret.pieceID) {
        const attrs = await siyuan.getBlockAttrs(ret.pieceID);
        if (attrs[gconst.MarkKey]?.startsWith(gconst.TEMP_CONTENT)) {
            ret.isPiece = true;
            ret.bookID = attrs[gconst.MarkKey].split("#")[1]?.split(",")[0] ?? "";
        }
    }
    return ret;
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
    private lute: Lute;

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
        detail.menu.addItem({
            iconHTML: "",
            label: this.plugin.i18n.send2dailyCardNoRef,
            click: () => {
                this.makeCard(detail.protyle, cardType, getDailyPath(), true);
            }
        });
    }

    async onload(plugin: Plugin, settings: SettingCfgType) {
        this.plugin = plugin;
        this.settings = settings;
        this.lute = utils.NewLute();
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
        this.plugin.addCommand({
            langKey: "send2dailyCardNoRef",
            hotkey: "⌥S",
            editorCallback: (protyle) => {
                this.makeCard(protyle, cardType, getDailyPath(), true);
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
            menu.addItem({
                label: this.plugin.i18n.send2dailyCardNoRef,
                icon: "iconFlashcard",
                accelerator: "⌥S",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    const blank = detail?.range?.cloneContents()?.textContent ?? "";
                    if (blockID) {
                        this.blankSpaceCard(blockID, blank, detail?.range, detail?.protyle, cardType, getDailyPath(), true);
                    }
                },
            });
        });
    }

    private async makeCard(protyle: IProtyle, t: CardType, path?: string, noRef?: boolean) {
        const { ids, divs } = await this.cloneSelectedLineMarkdowns(protyle, noRef);
        if (ids.length > 0) { // multilines
            await this.insertCard(protyle, divs, t, ids[ids.length - 1], path);
        } else {
            const blockID = events.lastBlockID;
            const range = document.getSelection()?.getRangeAt(0);
            const blank = range?.cloneContents()?.textContent ?? "";
            if (blockID) {
                this.blankSpaceCard(blockID, blank, range, protyle, t, path, noRef);
            }
        }
    }

    private async insertCard(protyle: IProtyle, divs: HTMLElement[], t: CardType, lastSelectedID: string, path?: string) {
        return navigator.locks.request("prog-FlashBox-insertCard", { mode: "exclusive" }, async (_lock) => {
            return this.doInsertCard(protyle, divs, t, lastSelectedID, path);
        });
    }

    private async doInsertCard(protyle: IProtyle, divs: HTMLElement[], t: CardType, lastSelectedID: string, path?: string) {
        const boxID = events.boxID;
        const { bookID, pieceID, isPiece } = await isInPiece(protyle);
        if (!pieceID) return;
        const { cardID, markdown } = this.createList(divs, t);
        if (path) {
            const v = getDailyAttrValue();
            const attr = {};
            attr[`custom-dailycard-${v}`] = v;
            const targetDocID = await utils.siyuanCache.createDocWithMdIfNotExists(10000, boxID, path, "", attr);
            await siyuan.insertBlockAsChildOf(`\n{: id="${utils.NewNodeID()}"}\n${markdown}`, targetDocID);
            openTab({ app: this.plugin.app, doc: { id: targetDocID }, position: "right" });
        } else if (isPiece) {
            if (!bookID) return;
            const hpath = await getHPathByDocID(bookID);
            if (!hpath) return;
            const targetDocID = await getCardsDoc(bookID, boxID, hpath);
            await siyuan.insertBlockAsChildOf(`{: id="${utils.NewNodeID()}"}\n${markdown}`, targetDocID);
            openTab({ app: this.plugin.app, doc: { id: targetDocID }, position: "right" });
        } else {
            await siyuan.insertBlockAfter(`{: id="${utils.NewNodeID()}"}\n${markdown}\n{: id="${utils.NewNodeID()}"}`, lastSelectedID);
        }
        await siyuan.addRiffCards([cardID]);
        await siyuan.pushMsg("⚡🗃" + markdown.split("(")[0], 1234);
    }

    private createList(divs: HTMLElement[], cardType: CardType) {
        const tmp = [];
        let idx = 0;
        let star = "* ";
        if (this.settings.cardIndent) {
            star = "  * ";
        }
        let originPath: string = "";
        let refPath: string = "";
        for (const div of divs) {
            if (!originPath) originPath = div.getAttribute(gconst.ORIGIN_HPATH);
            if (!refPath) refPath = div.getAttribute(gconst.REF_HPATH);
            div.removeAttribute(gconst.DATA_NODE_ID);
            const md = this.lute.BlockDOM2Md(div.outerHTML);
            if (idx++ == 0) tmp.push("* " + md);
            else tmp.push(star + md);
        }
        const cardID = utils.NewNodeID();
        if (cardType === CardType.C) {
            tmp.push(star + "```");
        } else if (cardType === CardType.B) {
            tmp.push(star + ">");
        }
        const attrList = [];
        attrList.push(`id="${cardID}"`);
        if (originPath) {
            attrList.push(`${gconst.ORIGIN_HPATH}="${originPath}"`);
        } 
        if (refPath) {
            attrList.push(`${gconst.REF_HPATH}="${refPath}"`);
        }
        tmp.push(`{: ${attrList.join(" ")} }`);
        return { cardID, "markdown": tmp.join("\n") };
    }

    private async cloneSelectedLineMarkdowns(protyle: IProtyle, noRef?: boolean) {
        const multiLine = protyle?.element?.querySelectorAll(`.${gconst.PROTYLE_WYSIWYG_SELECT}`);
        const divs = [];
        let setRef = !noRef;
        const ids = [];
        for (const div of multiLine) {
            div.classList.remove(gconst.PROTYLE_WYSIWYG_SELECT);
            const [id, elem, hasRef] = await this.cloneDiv(div as any, setRef);
            if (hasRef) setRef = false;
            ids.push(id);
            divs.push(elem);
        }
        return { divs, ids };
    }

    private async cloneDiv(div: HTMLDivElement, setRef: boolean) {
        div = div.cloneNode(true) as HTMLDivElement;
        return utils.cleanDiv(div, setRef, setRef);
    }

    private async blankSpaceCard(blockID: string, selected: string, range: Range, protyle: IProtyle, cardType: CardType, path?: string, noRef?: boolean) {
        let tmpDiv: HTMLElement;
        const { dom } = getBlockDOM(range.endContainer.parentElement);
        if (!dom) return;
        if (selected) {
            protyle.toolbar.setInlineMark(protyle, "mark", "range");
            const [_id, div] = await this.cloneDiv(dom as HTMLDivElement, !noRef);
            protyle.toolbar.setInlineMark(protyle, "mark", "range");
            protyle.toolbar.setInlineMark(protyle, "prog-marked", "range", { type: "backgroundColor", color: "var(--b3-font-background9)" });
            div.querySelectorAll('[data-type~="prog-marked"]').forEach(e => {
                const v = e.getAttribute("data-type").replace("prog-marked", "");
                e.setAttribute("data-type", v);
                e.removeAttribute("style");
            });
            tmpDiv = div;
        } else {
            const [_id, div] = await this.cloneDiv(dom as HTMLDivElement, !noRef);
            tmpDiv = div;
        }
        await this.insertCard(protyle, [tmpDiv], cardType, blockID, path);
    }
}

export const flashBox = new FlashBox();


