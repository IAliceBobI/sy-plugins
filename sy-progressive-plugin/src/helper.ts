import { IDLen, MarkKey, TEMP_CONTENT } from "../../sy-tomato-plugin/src/libs/gconst";
import { siyuan, styleColor } from "../../sy-tomato-plugin/src/libs/utils";
import * as utils from "../../sy-tomato-plugin/src/libs/utils";
import * as constants from "./constants";
import { Plugin } from "siyuan";

export type WordCountType = { id: string; count: number; type: string; };
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

export function tempContent(content: string) { // for btns and split lines
    return content + `\n{: ${MarkKey}="${TEMP_CONTENT}"}`;
}

export function getDocIalMark(bookID: string, point: number) {
    return `${TEMP_CONTENT}#${bookID},${point}`;
}

export function getDocIalContents(bookID: string) {
    return `contents#${TEMP_CONTENT}#${bookID}`;
}

export function getDocIalCards(bookID: string) {
    return `cards#${TEMP_CONTENT}#${bookID}`;
}

export class Helper {
    private plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
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

    btnPrevious(bookID: string, noteID: string, point: number) {
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
        const btnID = utils.newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-error-background)", "var(--b3-card-error-color)")}
            <div>
                <button title="${this.plugin.i18n.deletePieceAndExit}" onclick="${btnID}()" id="btn${btnID}">🗑 🏃</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.progressive_zZmqus5PtYRi.progressive.htmlBlockReadNextPeice("${bookID}","${noteID}",${HtmlCBType.deleteAndExit},${point})
                }
            </script>
        </div>`;
    }

    btnDeleteBack(bookID: string, noteID: string, point: number) {
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

    getReadingBtns(bookID: string, noteID: string, point: number) {
        return `{{{col
${this.btnViewContents(bookID, noteID, point)}

${this.btnPrevious(bookID, noteID, point)}

${this.btnNext(bookID, noteID, point)}

${this.btnFullfilContent(bookID, noteID, point)}

${this.btnCleanUnchanged(bookID, noteID, point)}

${this.btnDeleteBack(bookID, noteID, point)}

${this.btnDeleteNext(bookID, noteID, point)}

${this.btnDeleteExit(bookID, noteID, point)}

${this.btnSaveCard(bookID, noteID, point)}

${this.btnDelCard(bookID, noteID, point)}

${this.btnStop(bookID, noteID, point)}

${this.btnNextBook(bookID, noteID, point)}

${this.btnIgnoreBook(bookID, noteID, point)}

${this.btnOpenFlashcardTab(bookID, noteID, point)}
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
            for (const { id, type } of group) {
                const { wordCount } = rets[i++];
                const count = wordCount;
                content.push({ id, count, type });
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
    constructor(wordCount: WordCountType[]) {
        this.wordCount = wordCount;
        this.group = [];
        this.list = [];
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
        if (wc.type === "h" && this.lastType != "h") {
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

//-----------------------------------------------------------------------------------------

export async function AddRef(noteID: string, startID: string, endID: string) {
    // ((${startID} "[..]"))
    // \{\{select \* from blocks where id\='${startID}'\}\}
    await siyuan.insertBlockAsChildOf(tempContent(`{{{col
((${startID} "[..]"))

...

((${endID} "[..]"))
}}}`), noteID);
}

export function setBtnsSetStyleLoop() {
    const interval = setInterval(setBtnsSetStyle, 1000);
    setTimeout(() => {
        clearInterval(interval);
    }, 1000 * 30);
}

function setBtnsSetStyle() {
    for (const protyle of document.querySelectorAll("protyle-html")) {
        const button = protyle?.shadowRoot?.querySelector("button");
        if (button) {
            const id = button.id ?? "";
            if (id.length === IDLen + 3 && id.startsWith("btnID")) {
                // Add the styles to the button
                button.style.display = "inline-block";
                button.style.padding = "10px 20px";
                button.style.backgroundColor = "#4CAF50";
                button.style.color = "white";
                button.style.textAlign = "center";
                button.style.textDecoration = "none";
                button.style.fontSize = "16px";
                button.style.border = "none";
                button.style.borderRadius = "4px";
                button.style.cursor = "pointer";

                // Add hover styles
                button.addEventListener("mouseover", function () {
                    button.style.backgroundColor = "#45a049";
                });

                // Add active styles
                button.addEventListener("mousedown", function () {
                    button.style.backgroundColor = "#3e8e41";
                });

                // Add the "large" class styles
                button.classList.add("large");
                button.style.padding = "12px 24px";
                button.style.fontSize = "24px";

                // Add the "small" class styles
                button.classList.add("small");
                button.style.padding = "8px 16px";
                button.style.fontSize = "14px";
            }
        }
    }
}