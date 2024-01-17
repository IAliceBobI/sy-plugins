import { BlockNodeEnum, DATA_TYPE, IDLen, MarkKey, PARAGRAPH_INDEX, PROG_ORIGIN_TEXT, RefIDKey, TEMP_CONTENT } from "../../sy-tomato-plugin/src/libs/gconst";
import { siyuan, styleColor } from "../../sy-tomato-plugin/src/libs/utils";
import * as utils from "../../sy-tomato-plugin/src/libs/utils";
import * as constants from "./constants";
import { IProtyle, Lute, Plugin } from "siyuan";

export type WordCountType = { id: string; count: number; type: string; subType: string };
export type BookInfo = {
    time?: number,
    boxID?: string,
    point?: number,
    bookID?: string,
    ignored?: string,
    autoCard?: string,
};
export type BookInfos = { [key: string]: BookInfo };

export enum HtmlCBType {
    previous = 0,
    deleteAndNext = 1,
    AddDocCard = 2,
    // saveDoc = 3,
    quit = 4,
    nextBook = 5,
    next = 6,
    ignoreBook = 7,
    fullfilContent = 8,
    cleanUnchanged = 9,
    DelDocCard = 10,
    deleteAndExit = 11,
    openFlashcardTab = 12,
    deleteAndBack = 13,
    viewContents = 14,
    splitByPunctuations = 15,
    splitByPunctuationsList = 16,
    splitByPunctuationsListCheck = 17,
    cleanOriginText = 18,
}

export class Storage {
    private plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    async onLayoutReady() {
        // load only need once, save many
        return this.plugin.loadData(constants.STORAGE_BOOKS);
    }

    async updateBookInfoTime(docID: string) {
        this.updateBookInfo(docID, {});
    }

    async resetBookReadingPoint(docID: string) {
        this.updateBookInfo(docID, { point: 0 });
    }

    async toggleIgnoreBook(bookID: string) {
        const info = await this.booksInfo(bookID);
        if (info.ignored == "no") {
            await this.updateBookInfo(bookID, { ignored: "yes" });
            await siyuan.pushMsg(this.plugin.i18n.msgIgnoreBook);
        } else {
            await this.updateBookInfo(bookID, { ignored: "no" });
            await siyuan.pushMsg(this.plugin.i18n.msgPushBook);
        }
    }

    async toggleAutoCard(bookID: string, opt?: string) {
        const info = await this.booksInfo(bookID);
        if (opt) {
            await this.updateBookInfo(bookID, { autoCard: opt });
        } else {
            if (info.autoCard == "no") {
                await this.updateBookInfo(bookID, { autoCard: "yes" });
                await siyuan.pushMsg(this.plugin.i18n.msgAutoCard);
            } else {
                await this.updateBookInfo(bookID, { autoCard: "no" });
                await siyuan.pushMsg(this.plugin.i18n.msgNotAutoCard);
            }
        }
    }

    private async updateBookInfo(docID: string, opt: BookInfo) {
        if (!docID) return;
        if (docID.length != "20231218000645-9aaaltd".length) return;
        const info = await this.booksInfo(docID);
        info.time = await siyuan.currentTimeMs();
        if (opt.autoCard) info.autoCard = opt.autoCard;
        if (opt.ignored) info.ignored = opt.ignored;
        if (opt.bookID) info.bookID = opt.bookID;
        if (utils.isValidNumber(opt.point)) info.point = opt.point;
        this.booksInfos()[docID] = info;
        return this.saveBookInfos();
    }

    async booksInfo(docID: string): Promise<BookInfo> {
        if (!docID) return {};
        let info = this.booksInfos()[docID];
        if (!info) {
            info = { point: 0, bookID: docID, time: await siyuan.currentTimeMs(), ignored: "no", autoCard: "yes" };
            this.booksInfos()[docID] = info;
        }
        if (!info.boxID) {
            const row = await siyuan.sqlOne(`select box from blocks where id="${docID}"`);
            if (!row) {
                siyuan.pushMsg(this.plugin.i18n.cannotFindTheBoxs + docID); // maybe the index is building
                info.boxID = "";
            } else {
                info.boxID = row["box"];
            }
            this.booksInfos()[docID] = info;
        }
        return info;
    }

    booksInfos(): BookInfos {
        if (!this.plugin.data[constants.STORAGE_BOOKS])
            this.plugin.data[constants.STORAGE_BOOKS] = {};
        return this.plugin.data[constants.STORAGE_BOOKS];
    }

    async gotoBlock(bookID: string, point: number) {
        if (point >= 0) {
            await this.updateBookInfo(bookID, { point });
        }
    }

    async saveIndex(bookID: string, groups: WordCountType[][]) {
        const [ng, data] = preSave(groups);
        await this.plugin.saveData(bookID, { data });
        this.plugin.data[bookCacheKey(bookID)] = ng;
    }

    private async saveBookInfos() {
        return this.plugin.saveData(constants.STORAGE_BOOKS, this.booksInfos());
    }

    async removeIndex(bookID: string) {
        delete this.booksInfos()[bookID];
        delete this.booksInfos()[bookCacheKey(bookID)];
        await this.saveBookInfos();
        return this.plugin.removeData(bookID);
    }

    async loadBookIndexIfNeeded(bookID: string): Promise<string[][]> {
        let idx = this.plugin.data[bookCacheKey(bookID)];
        if (!idx) {
            idx = afterLoad(await this.plugin.loadData(bookID));
            this.plugin.data[bookCacheKey(bookID)] = idx;
        }
        return idx;
    }
}

export function bookCacheKey(bookID: string) {
    return bookID + "_cache";
}

export function tempContent(content: string, id?: string) { // for btns and split lines
    if (!id) return content + `\n{: ${MarkKey}="${TEMP_CONTENT}"}`;
    else return content + `\n{: id="${id}" ${MarkKey}="${TEMP_CONTENT}"}`;
}

export function getDocIalPieces(bookID: string, point: number) {
    return `${TEMP_CONTENT}#${bookID},${point}`;
}

export function getDocIalContents(bookID: string) {
    return `contents#${TEMP_CONTENT}#${bookID}`;
}

export function getDocIalCards(bookID: string) {
    return `cards#${TEMP_CONTENT}#${bookID}`;
}

export function getDocIalSummary(bookID: string) {
    return `summary#${TEMP_CONTENT}#${bookID}`;
}

export async function getBookIDByBlock(blockID: string) {
    const docRow = await siyuan.getDocRowByBlockID(blockID);
    return getBookID(docRow?.id);
}

export async function getBookID(docID: string): Promise<{ bookID: string, pieceNum: number }> {
    const ret = { bookID: "", pieceNum: NaN } as Awaited<ReturnType<typeof getBookID>>;
    if (docID) {
        const attrs = await siyuan.getBlockAttrs(docID);
        if (attrs["custom-progmark"]) {
            const last = attrs["custom-progmark"].split("#").pop();
            const parts = last.split(",");
            ret.bookID = parts[0];
            ret.pieceNum = Number(parts[1]);
        }
    }
    return ret;
}

export async function getCardHPathByDocID(docID: string) {
    const row = await siyuan.sqlOne(`select hpath from blocks where id = "${docID}"`);
    let path = row?.hpath ?? "";
    if (!path) return "";
    const parts = path.split("/");
    const docName = parts.pop();
    const cardDocName = "cards-" + docName;
    parts.push(docName);
    parts.push(cardDocName);
    path = parts.join("/");
    return path;
}

export async function getCardsDoc(bookID: string, boxID: string, hpath: string) {
    const id = await findCards(bookID);
    if (id) return id;
    const attr = {};
    attr[MarkKey] = getDocIalCards(bookID);
    const targetDocID = await utils.siyuanCache.createDocWithMdIfNotExists(5000, boxID, hpath, "", attr);
    return targetDocID;
}

export function splitByBlockCount(groups: WordCountType[][], blockNumber: number) {
    if (blockNumber <= 0) return groups;
    const tmp: WordCountType[][] = [];
    for (const group of groups) {
        const headings: WordCountType[] = [];
        const rest: WordCountType[] = [];
        for (const i of group) {
            if (i.type == "h" && rest.length == 0) headings.push(i);
            else rest.push(i);
        }
        const newPieces = utils.chunks(rest, blockNumber);
        if (newPieces.length > 0) newPieces[0].splice(0, 0, ...headings);
        tmp.push(...newPieces);
    }
    return tmp;
}

export async function copyBlock(id: string, lute: Lute, mark?: string, idx?: { i: number }) {
    const { div: tempDiv } = await utils.getBlockDiv(id);
    if (tempDiv.getAttribute(MarkKey)) return "";
    if (idx && tempDiv.getAttribute(DATA_TYPE) != BlockNodeEnum.NODE_HEADING) {
        const editableDiv = utils.getContenteditableElement(tempDiv);
        if (editableDiv) {
            const idxSpan = editableDiv.insertBefore(document.createElement("span"), editableDiv.firstChild) as HTMLSpanElement;
            if (idxSpan) {
                idxSpan.setAttribute(DATA_TYPE, "text");
                // idxSpan.style.backgroundColor = "var(--b3-font-background3)";
                // idxSpan.style.color = "var(--b3-font-color7)";
                idxSpan.textContent = `[${idx.i}]`;
                tempDiv.setAttribute(PARAGRAPH_INDEX, String(idx.i));
                idx.i++;
            }
        }
    }
    const txt = tempDiv.textContent.replace(/\u200B/g, "").trim();
    if (!txt || txt == "*") return "";
    await utils.cleanDiv(tempDiv, true, true);
    tempDiv.setAttribute(RefIDKey, id);
    if (mark) tempDiv.setAttribute(mark, "1");
    const md = lute.BlockDOM2Md(tempDiv.outerHTML);
    return md.trim();
}

export function rmBadThings(s: string) {
    return s.replace(/[​]+/g, "").trim();
}

export async function cleanNote(noteID: string, force: boolean) {
    for (const row of await siyuan.sql(`select ial,markdown,id from blocks where root_id="${noteID}" and ial like '%${PROG_ORIGIN_TEXT}="1"%'`)) {
        const ial: string = row?.ial ?? "";
        const markdown: string = row?.markdown ?? "";
        if (ial.includes(TEMP_CONTENT)) {
            await siyuan.safeDeleteBlock(row.id);
        } else if (ial.includes(RefIDKey) && ial.includes(PROG_ORIGIN_TEXT)) {
            if (force) {
                await siyuan.safeDeleteBlock(row.id);
            } else {
                if (!markdown) continue;
                if (!markdown.includes("*")) continue;
                for (const attr of ial.split(" ")) {
                    if (attr.includes(RefIDKey)) {
                        const originalID = attr.split("\"")[1]; // custom-progref="20231119150726-2xxypwa"
                        const origin = await siyuan.sqlOne(`select markdown from blocks where id="${originalID}"`);
                        const oriMarkdown = origin?.markdown ?? "";
                        const markdownWithoutStar = markdown.replace(`((${originalID} "*"))`, "");
                        if (rmBadThings(oriMarkdown) == rmBadThings(markdownWithoutStar)) {
                            await siyuan.safeDeleteBlock(row.id); // delete the same content
                        }
                        break;
                    }
                }
            }
        }
    }
}

export async function findDoc(bookID: string, point: number) {
    return doFindDoc(bookID, getDocIalPieces, point);
}

export async function findContents(bookID: string) {
    return doFindDoc(bookID, getDocIalContents);
}

export async function findCards(bookID: string) {
    return doFindDoc(bookID, getDocIalCards);
}

export async function findSummary(bookID: string) {
    return doFindDoc(bookID, getDocIalSummary);
}

async function doFindDoc(bookID: string, func: Func, point?: number) {
    if (utils.isValidNumber(point)) {
        const tmp = func;
        func = (bookID: string) => { return tmp(bookID, point); };
    }
    const row = await siyuan.sqlOne(`select id, path, box from blocks where type='d' and 
        ial like '%${MarkKey}="${func(bookID)}"%'`);
    if (row?.id && row?.path) {
        const [dirStr, file] = utils.dir(row["path"]);
        const dir = await siyuan.readDir(`/data/${row["box"]}${dirStr}`);
        if (dir) {
            for (const f of dir) {
                if (f.name === file) {
                    return row["id"];
                }
            }
        }
    }
    return "";
}

export async function createNote(boxID: string, bookID: string, piece: string[], point: number) {
    const attr = {};
    const row = await siyuan.sqlOne(`select hpath,content from blocks where type='d' and id='${bookID}'`);
    let dir = row?.hpath ?? "";
    const bookName = row?.content ?? "";
    if (!dir || !bookName) return "";

    let content: string;
    for (const blockID of piece) {
        content = (await siyuan.getBlockMarkdownAndContent(blockID))?.content ?? "";
        content = content.slice(0, 15).replace(/[　\/ ​]+/g, "").trim();
        if (content) break;
    }

    if (!content) {
        attr["alias"] = bookName;
        content = `[${point}]${bookName}`;
    } else {
        attr["alias"] = content;
        content = `[${point}]${content}`;
    }

    dir = dir + `/pieces-${bookName}/` + content;
    const docID = await siyuan.createDocWithMd(boxID, dir, "");
    attr[MarkKey] = getDocIalPieces(bookID, point);
    await siyuan.setBlockAttrs(docID, attr);
    return docID;
}

export class Helper {
    private plugin: Plugin;
    private setting: SettingCfgType;

    constructor(plugin: Plugin, setting: SettingCfgType) {
        this.plugin = plugin;
        this.setting = setting;
    }

    getContentPrefix(level: number) {
        const h = level > 1 ? "🇮" : "";
        const s = "　　".repeat(level - 1);
        const d = ["0⃣", "1⃣", "2⃣", "3⃣", "4⃣", "5⃣", "6⃣", "7⃣"][level];
        return h + s + d;
    }

    btnReadThisPiece(blockID: string, text: string) {
        const btnID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-success-background)", "var(--b3-card-success-color)")}
            <div>
                <button onclick="${btnID}()" id="btn${btnID}">${text}</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.readThisPiece("${blockID}")
                }
            </script>
        </div>`;
    }

    btnViewContents(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnViewContents) return "";
        const btnID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-success-background)", "var(--b3-card-success-color)")}
            <div>
                <button title="${this.plugin.i18n.tipViewContents}" onclick="${btnID}()" id="btn${btnID}">${this.plugin.i18n.viewContents}</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.viewContents},${point})
                }
            </script>
        </div>`;
    }

    btnFullfilContent(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnFullfilContent) return "";
        const btnFullfilContentID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-info-background)", "var(--b3-card-info-color)")}
            <div>
                <button title="${this.plugin.i18n.tipFullfilContent}" onclick="${btnFullfilContentID}()" id="btn${btnFullfilContentID}">${this.plugin.i18n.insertOriginDoc}</button>
            </div>
            <script>
                function ${btnFullfilContentID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.fullfilContent},${point})
                }
            </script>
        </div>`;
    }

    btnCleanUnchanged(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnCleanUnchanged) return "";
        const btnCleanUnchangedID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-info-background)", "var(--b3-card-info-color)")}
            <div>
                <button title="${this.plugin.i18n.tipCleanUnchanged}" onclick="${btnCleanUnchangedID}()" id="btn${btnCleanUnchangedID}">${this.plugin.i18n.cleanUnchangedOriginDoc}</button>
            </div>
            <script>
                function ${btnCleanUnchangedID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.cleanUnchanged},${point})
                }
            </script>
        </div>`;
    }

    btnCleanOriginText(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnCleanOriginText) return "";
        const btnID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-info-background)", "var(--b3-card-info-color)")}
            <div>
                <button title="删除原文" onclick="${btnID}()" id="btn${btnID}">${this.plugin.i18n.cleanUnchangedOriginDoc.repeat(2)}</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.cleanOriginText},${point})
                }
            </script>
        </div>`;
    }

    btnPrevious(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnPrevious) return "";
        const btnPreviousID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-success-background)", "var(--b3-card-success-color)")}
            <div>
                <button title="${this.plugin.i18n.tipPrevious}" onclick="${btnPreviousID}()" id="btn${btnPreviousID}">${this.plugin.i18n.previousPiece}</button>
            </div>
            <script>
                function ${btnPreviousID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.previous},${point})
                }
            </script>
        </div>`;
    }

    btnNext(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnNext) return "";
        const btnNextID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-success-background)", "var(--b3-card-success-color)")}
            <div>
                <button title="${this.plugin.i18n.tipNext}" onclick="${btnNextID}()" id="btn${btnNextID}">${this.plugin.i18n.nextPiece}</button>
            </div>
            <script>
                function ${btnNextID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.next},${point})
                }
            </script>
        </div>`;
    }

    btnDeleteExit(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnDeleteExit) return "";
        const btnID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-error-background)", "var(--b3-card-error-color)")}
            <div>
                <button title="${this.plugin.i18n.deletePieceAndExit}" onclick="${btnID}()" id="btn${btnID}">🏃 🗑</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.deleteAndExit},${point})
                }
            </script>
        </div>`;
    }

    btnDeleteBack(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnDeleteBack) return "";
        const btnID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-error-background)", "var(--b3-card-error-color)")}
            <div>
                <button title="${this.plugin.i18n.tipDelBack}" onclick="${btnID}()" id="btn${btnID}">${this.plugin.i18n.DeleteAndBack}</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.deleteAndBack},${point})
                }
            </script>
        </div>`;
    }

    btnDeleteNext(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnDeleteNext) return "";
        const btnID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-error-background)", "var(--b3-card-error-color)")}
            <div>
                <button title="${this.plugin.i18n.tipSkip}" onclick="${btnID}()" id="btn${btnID}">${this.plugin.i18n.DeleteAndNext}</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.deleteAndNext},${point})
                }
            </script>
        </div>`;
    }

    btnSaveCard(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnSaveCard) return "";
        const btnSaveCardID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-warning-background)", "var(--b3-card-warning-color)")}
            <div>
                <button title="${this.plugin.i18n.tipAddDocCard}" onclick="${btnSaveCardID}()" id="btn${btnSaveCardID}">${this.plugin.i18n.addDocToCard}</button>
            </div>
            <script>
                function ${btnSaveCardID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.AddDocCard},${point})
                }
            </script>
        </div>`;
    }

    btnDelCard(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnDelCard) return "";
        const btnSaveCardID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-warning-background)", "var(--b3-card-warning-color)")}
            <div>
                <button title="${this.plugin.i18n.tipDelDocCard}" onclick="${btnSaveCardID}()" id="btn${btnSaveCardID}">${this.plugin.i18n.delDocCard}</button>
            </div>
            <script>
                function ${btnSaveCardID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.DelDocCard},${point})
                }
            </script>
        </div>`;
    }

    btnStop(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnStop) return "";
        const btnStopID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-font-background6)", "#000000")}
            <div>
                <button title="${this.plugin.i18n.tipQuit}" onclick="${btnStopID}()" id="btn${btnStopID}">${this.plugin.i18n.exit}</button>
            </div>
            <script>
                function ${btnStopID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.quit},${point})
                }
            </script>
        </div>`;
    }

    btnNextBook(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnNextBook) return "";
        const btnNextBookID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-font-background6)", "#000000")}
            <div>
                <button title="${this.plugin.i18n.tipNextBook}" onclick="${btnNextBookID}()" id="btn${btnNextBookID}">${this.plugin.i18n.nextBook}</button>
            </div>
            <script>
                function ${btnNextBookID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.nextBook},${point})
                }
            </script>
        </div>`;
    }

    btnIgnoreBook(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnIgnoreBook) return "";
        const btnIgnoreBookID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-font-background5)", "#000000")}
            <div>
                <button title="${this.plugin.i18n.tipIgnore}" onclick="${btnIgnoreBookID}()" id="btn${btnIgnoreBookID}">${this.plugin.i18n.ignore}</button>
            </div>
            <script>
                function ${btnIgnoreBookID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.ignoreBook},${point})
                }
            </script>
        </div>`;
    }

    btnOpenFlashcardTab(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnOpenFlashcardTab) return "";
        const btnID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-font-background11)", "#000000")}
            <div>
                <button title="${this.plugin.i18n.openFlashcardInTab}" onclick="${btnID}()" id="btn${btnID}">⚡</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.openFlashcardTab},${point})
                }
            </script>
        </div>`;
    }

    btnSplitByPunctuations(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnSplitByPunctuations) return "";
        const btnID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-font-background11)", "#000000")}
            <div>
                <button title="按标点断句" onclick="${btnID}()" id="btn${btnID}">✂📜</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.splitByPunctuations},${point})
                }
            </script>
        </div>`;
    }

    btnSplitByPunctuationsList(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnSplitByPunctuationsList) return "";
        const btnID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-font-background11)", "#000000")}
            <div>
                <button title="按标点断句，形成列表" onclick="${btnID}()" id="btn${btnID}">✂📜📌</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.splitByPunctuationsList},${point})
                }
            </script>
        </div>`;
    }

    btnSplitByPunctuationsListCheck(bookID: string, noteID: string, point: number) {
        if (!this.setting.btnSplitByPunctuationsListCheck) return "";
        const btnID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-font-background11)", "#000000")}
            <div>
                <button title="按标点断句，形成任务列表(可以ctrl+enter勾选任务)" onclick="${btnID}()" id="btn${btnID}">✂📜✅</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.splitByPunctuationsListCheck},${point})
                }
            </script>
        </div>`;
    }

    getReadingBtns3(bookID: string, noteID: string, point: number) {
        return `{{{col
${this.btnSplitByPunctuations(bookID, noteID, point)}

${this.btnSplitByPunctuationsListCheck(bookID, noteID, point)}

${this.btnSplitByPunctuationsList(bookID, noteID, point)}

${this.btnCleanOriginText(bookID, noteID, point)}

　

　

　
}}}`;
    }

    getReadingBtns2(bookID: string, noteID: string, point: number) {
        return `{{{col
${this.btnOpenFlashcardTab(bookID, noteID, point)}

${this.btnDeleteBack(bookID, noteID, point)}

${this.btnDeleteNext(bookID, noteID, point)}

${this.btnSaveCard(bookID, noteID, point)}

${this.btnDelCard(bookID, noteID, point)}

${this.btnDeleteExit(bookID, noteID, point)}

${this.btnIgnoreBook(bookID, noteID, point)}
}}}`;
    }

    getReadingBtns1(bookID: string, noteID: string, point: number) {
        return `{{{col
${this.btnViewContents(bookID, noteID, point)}

${this.btnPrevious(bookID, noteID, point)}

${this.btnNext(bookID, noteID, point)}

${this.btnCleanUnchanged(bookID, noteID, point)}

${this.btnFullfilContent(bookID, noteID, point)}

${this.btnStop(bookID, noteID, point)}

${this.btnNextBook(bookID, noteID, point)}
}}}`;
    }

    async getDocWordCount(allBlocks: WordCountType[]): Promise<WordCountType[]> {
        await siyuan.pushMsg(this.plugin.i18n.getAllChildren, 3000);

        const size = 300;
        const groups: WordCountType[][] = [];
        while (allBlocks.length > 0) {
            groups.push(allBlocks.splice(0, size));
        }

        await siyuan.pushMsg(this.plugin.i18n.start2count, 3000);
        let iter = 0;
        const content = [];
        for (const group of groups) {
            const tasks: Promise<GetBlocksWordCount>[] = [];
            for (const { id, type } of group) {
                if (type == "h") {
                    tasks.push({ wordCount: 0 } as any);
                } else {
                    tasks.push(siyuan.getBlocksWordCount([id]));
                }
            }
            const rets = await Promise.all(tasks);
            let i = 0;
            for (const { id, type, subType } of group) {
                const { wordCount } = rets[i++];
                const count = wordCount;
                content.push({ id, count, type, subType });
            }
            iter += i;
            await siyuan.pushMsg(this.plugin.i18n.countBlocks.replace("{iter}", iter), 3000);
        }
        await siyuan.pushMsg(this.plugin.i18n.countingFinished, 3000);
        return content;
    }
}

export function afterLoad(data: any): string[][] {
    data = data?.data ?? "";
    const group = [];
    for (const piece of data.split("#")) {
        const tp = [];
        for (const ti of piece.split(",")) {
            tp.push(ti);
        }
        group.push(tp);
    }
    return group;
}

export function preSave(groups: WordCountType[][]) {
    const pieces = [];
    const newGroups = [];
    for (const group of groups) {
        const parts = [];
        for (const wc of group) {
            parts.push(wc.id);
        }
        pieces.push(parts.join(","));
        newGroups.push(parts);
    }
    return [newGroups, pieces.join("#")];
}

export class ContentLenGroup {
    private groups: WordCountType[][];
    private accCount: number;
    private maxCount: number;
    private collect: WordCountType[][];
    private list: WordCountType[];
    constructor(groups: WordCountType[][], maxCount: number) {
        this.groups = groups;
        this.accCount = 0;
        this.collect = [];
        this.list = [];
        this.maxCount = maxCount;
    }
    private newList() {
        if (this.list.length > 0) {
            this.collect.push(this.list);
            this.list = [];
            this.accCount = 0;
        }
    }
    private add(wc: WordCountType) {
        this.list.push(wc);
        if (wc.type !== "h") this.accCount += wc.count;
        if (this.accCount >= this.maxCount) {
            this.newList();
        }
    }
    private splitPiece(wc: WordCountType[]): WordCountType[][] {
        this.collect = [];
        for (const line of wc) {
            this.add(line);
        }
        this.newList();
        return this.collect;
    }
    split() {
        const list = [];
        for (const piece of this.groups) {
            list.push(...this.splitPiece(piece));
        }
        return list;
    }
}

export class HeadingGroup {
    private wordCount: WordCountType[];
    private group: WordCountType[][];
    private list: WordCountType[];
    private lastType: string;
    private headings: string[];
    constructor(wordCount: WordCountType[], headings: number[]) {
        this.wordCount = wordCount;
        this.group = [];
        this.list = [];
        this.headings = headings.map(i => `h${i}`);
    }
    private add(wc: WordCountType) {
        this.getList(wc).push(wc);
        this.lastType = wc.type;
    }
    private next() {
        if (this.list.length > 0) {
            this.group.push(this.list);
            this.list = [];
        }
    }
    private shouldNext(wc: WordCountType) {
        if (wc.type === "h" && this.headings.includes(wc.subType) && this.lastType != "h") {
            return true;
        }
        return false;
    }
    private getList(wc: WordCountType) {
        if (this.shouldNext(wc)) {
            this.next();
        }
        return this.list;
    }
    split() {
        if (this.headings.length == 0) return [this.wordCount];
        for (const wc of this.wordCount) {
            this.add(wc);
        }
        this.next();
        return this.group;
    }
}

export function appendChild(parent: HTMLElement, type: string, textContent: string, classList: string[], click?: any) {
    const elem = document.createElement(type);
    elem.textContent = textContent;
    parent.appendChild(elem);
    for (const cls of classList) if (cls) elem.classList.add(cls);
    if (click) elem.addEventListener("click", click);
    return elem;
}

export function isProtylePiece(protyle: IProtyle) {
    const div = protyle?.element?.querySelector(`[${MarkKey}]`) as HTMLDivElement;
    const attr = div?.getAttribute(MarkKey) ?? "";
    const pieceLen = TEMP_CONTENT.length + 1 + "20231229160401-0lfc8qj".length + 1 + 1;
    return attr.startsWith(TEMP_CONTENT + "#") && attr.length >= pieceLen;
}
