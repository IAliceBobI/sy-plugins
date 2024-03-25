import { IProtyle, Lute, Plugin, confirm, openTab } from "siyuan";
import { set_href, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import * as utils from "../../sy-tomato-plugin/src/libs/utils";
import { events } from "../../sy-tomato-plugin/src/libs/Events";
import * as gconst from "../../sy-tomato-plugin/src/libs/gconst";
import { getCardsDoc, getHPathByDocID } from "./helper";
import { getBookID } from "../../sy-tomato-plugin/src/libs/progressive";
import { AttrBuilder } from "../../sy-tomato-plugin/src/libs/listUtils";

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
            iconHTML: "➕🗃️",
            accelerator: "⌥E",
            label: this.plugin.i18n.insertBlankSpaceCard,
            click: () => {
                this.makeCard(detail.protyle, cardType);
            }
        });
        detail.menu.addItem({
            iconHTML: "🗓️🗃️🇷",
            accelerator: "⌘`",
            label: this.plugin.i18n.send2dailyCard,
            click: () => {
                this.makeCard(detail.protyle, cardType, getDailyPath());
            }
        });
        detail.menu.addItem({
            iconHTML: "🗓️🗃️",
            accelerator: "⌥S",
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
        this.plugin.addCommand({
            langKey: "lnk2href",
            hotkey: "F9",
            editorCallback: (protyle: IProtyle) => {
                confirm("'*'与'@'替换为超链接", "我已经备份了，并知道如何恢复！", () => {
                    navigator.locks.request("", { ifAvailable: true }, async (lock) => {
                        if (lock) {
                            await lnk2href(protyle.notebookId);
                        } else {
                            await siyuan.pushMsg("正在替换'*'与'@'替换为超链接……");
                        }
                    });
                });
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.insertBlankSpaceCard,
                iconHTML: "➕🗃️",
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
                iconHTML: "🗓️🗃️🇷",
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
                iconHTML: "🗓️🗃️",
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
        const boxID = protyle.notebookId;
        const docID = protyle.block?.rootID;
        if (!docID) return;
        let { bookID } = await getBookID(docID);
        const srcDocAttrs = await siyuan.getBlockAttrs(docID);
        const srcPriority = srcDocAttrs["custom-card-priority"];
        const { cardID, markdown } = this.createList(divs, t, srcPriority);
        if (path) {
            const v = getDailyAttrValue();
            const attr = {};
            attr[`custom-dailycard-${v}`] = v;
            const targetDocID = await utils.siyuanCache.createDocWithMdIfNotExists(5000, boxID, path, "", attr);
            await siyuan.insertBlockAsChildOf(`\n{: id="${utils.NewNodeID()}"}\n${markdown}`, targetDocID);
            openTab({ app: this.plugin.app, doc: { id: targetDocID }, position: "right" });
        } else {
            let hpath = "";
            if (bookID && !this.settings.cardUnderPiece) {
                hpath = await getHPathByDocID(bookID, "cards");
            } else {
                hpath = await getHPathByDocID(docID, "cards");
                bookID = docID;
            }
            if (!hpath) return;
            const targetDocID = await getCardsDoc(bookID, boxID, hpath);
            await siyuan.insertBlockAsChildOf(`{: id="${utils.NewNodeID()}"}\n${markdown}`, targetDocID);
            openTab({ app: this.plugin.app, doc: { id: targetDocID }, position: "right" });
        }
        await siyuan.addRiffCards([cardID]);
        await siyuan.pushMsg("⚡🗃" + markdown.split("(")[0], 1234);

        const { div } = await utils.getBlockDiv(lastSelectedID);
        const edit = utils.getContenteditableElement(div);
        if (edit) {
            const span = edit.appendChild(document.createElement("span")) as HTMLElement;
            set_href(span, cardID, "&");
            await siyuan.safeUpdateBlock(lastSelectedID, this.lute.BlockDOM2Md(div.outerHTML));
        }
    }

    private createList(divs: HTMLElement[], cardType: CardType, srcPriority: string) {
        const tmp = [];
        let originPath: string = "";
        let refPath: string = "";
        let inBookIdx: string = "";
        for (const div of divs) {
            if (!originPath) originPath = div.getAttribute(gconst.ORIGIN_HPATH);
            if (!refPath) refPath = div.getAttribute(gconst.REF_HPATH);
            if (!inBookIdx) inBookIdx = div.getAttribute(gconst.IN_BOOK_INDEX);
        }
        let attrBuilder = new AttrBuilder("", true);
        attrBuilder.add(gconst.IN_BOOK_INDEX, inBookIdx);
        let idx = 0;
        for (const div of divs) {
            div.removeAttribute(gconst.DATA_NODE_ID);
            const md = this.lute.BlockDOM2Md(div.outerHTML).replace("　　", "");
            if (idx++ == 0) tmp.push(`* ${attrBuilder.build()} ${md}`);
            else tmp.push("  " + md);
        }
        if (cardType === CardType.C) {
            tmp.push("  ```");
        } else if (cardType === CardType.B) {
            tmp.push("  >");
        }
        tmp.push(`  {: id="${utils.NewNodeID()}"}`);
        tmp.push(`  {: id="${utils.NewNodeID()}"}`);
        tmp.push(`  {: id="${utils.NewNodeID()}"}`);
        const cardID = utils.NewNodeID();
        attrBuilder = new AttrBuilder(cardID);
        attrBuilder.add(gconst.CARD_PRIORITY, srcPriority);
        attrBuilder.add(gconst.ORIGIN_HPATH, originPath);
        attrBuilder.add(gconst.REF_HPATH, refPath);
        tmp.push(attrBuilder.build());
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
            (div as HTMLElement).style.backgroundColor = "var(--b3-font-background7)";
            if (hasRef) setRef = false;
            ids.push(id);
            divs.push(elem);
        }
        changeBGofseletedElement(ids);
        return { divs, ids };
    }

    private async cloneDiv(div: HTMLDivElement, setRef: boolean) {
        div = div.cloneNode(true) as HTMLDivElement;
        return utils.cleanDiv(div, setRef, true);
    }

    private async blankSpaceCard(blockID: string, selected: string, range: Range, protyle: IProtyle, cardType: CardType, path?: string, noRef?: boolean) {
        let tmpDiv: HTMLElement;
        const { dom } = getBlockDOM(range.endContainer.parentElement);
        if (!dom) return;
        if (selected) {
            protyle.toolbar.setInlineMark(protyle, "mark", "range");
            const [_id, div] = await this.cloneDiv(dom as HTMLDivElement, !noRef);
            protyle.toolbar.setInlineMark(protyle, "mark", "range");
            protyle.toolbar.setInlineMark(protyle, "text", "range", { type: "backgroundColor", color: "var(--b3-font-background9)" });
            div.querySelectorAll('[data-type~="text"]').forEach((e: HTMLElement) => {
                if (e.style.backgroundColor == "var(--b3-font-background9)") {
                    e.style.backgroundColor = "";
                }
            });
            div.querySelectorAll('[data-type~="prog-marked"]').forEach((e: HTMLElement) => { // for old
                const v = e.getAttribute("data-type").replace("prog-marked", "");
                e.setAttribute("data-type", v);
                e.style.backgroundColor = "";
            });
            tmpDiv = div;
        } else {
            const [id, div] = await this.cloneDiv(dom as HTMLDivElement, !noRef);
            tmpDiv = div;
            changeBGofseletedElement([id]);
        }
        await this.insertCard(protyle, [tmpDiv], cardType, blockID, path);
    }
}

export const flashBox = new FlashBox();


async function changeBGofseletedElement(ids: any[]) {
    const attrs = { "style": "background-color: var(--b3-font-background7);" } as AttrType;
    for (const id of ids) {
        await siyuan.setBlockAttrs(id, attrs);
    }
    // return siyuan.batchSetBlockAttrs(ids.map(id => { easy to crash when the new content has not been persisted yet.
    //     return { id, attrs };
    // }));
}

async function lnk2href(box: string) {
    const FROM_WHERE = `from refs where box="${box}" and (content='*' or content='@')`;
    let total = 0;
    {
        const c1 = await siyuan.sqlRef(`select distinct count(block_id) as id ${FROM_WHERE}`);
        total = Number(c1[0].id);
        await siyuan.pushMsg(`一共有${total}处'*'或者'@'等待转换……`);
    }

    let count = 0;
    let refs = await siyuan.sqlRef(`select distinct block_id ${FROM_WHERE} limit 200`);
    const idSet = new Set<string>();
    while (refs.length > 0) {
        const doms = (await Promise.all(refs.map(r => siyuan.getBlockDOM(r.block_id))))
            .map(d => { return { id: d.id, div: utils.dom2div(d.dom) }; })
            .filter(d => !idSet.has(d.id));
        if (doms.length > 0) {
            const ops: Parameters<typeof siyuan.updateBlocks>[0] = [];
            for (const { id, div } of doms) {
                let changed = false;
                for (const e of [...div.querySelectorAll(`[${gconst.DATA_ID}]`)]) {
                    const txt = e.textContent;
                    const lnkId = e.getAttribute(gconst.DATA_ID);
                    const t = e.getAttribute(gconst.DATA_TYPE);
                    const st = e.getAttribute(gconst.DATA_SUBTYPE);
                    if (txt == "*" || txt == "@") {
                        if (lnkId && t && st) {
                            e.removeAttribute(gconst.DATA_ID);
                            e.removeAttribute(gconst.DATA_SUBTYPE);
                            set_href(e as HTMLElement, lnkId, txt);
                            changed = true;
                        }
                    }
                }
                if (changed) {
                    ops.push({ id, domStr: div.outerHTML });
                }
            }
            count += ops.length;
            await siyuan.pushMsg(`准备修改：${count}/${total}……`);
            await siyuan.updateBlocks(ops);
            ops.forEach(o => idSet.add(o.id));
            await siyuan.pushMsg(`修改：${count}/${total}完成！`);
        } else {
            await utils.sleep(2000);
            await siyuan.pushMsg("扫描索引中，请耐心等待……");
        }
        refs = await siyuan.sqlRef(`select distinct block_id ${FROM_WHERE} limit 200`);
    }
    await siyuan.pushMsg(`${total}处修改完成！`);
    events.protyleReload();
}
