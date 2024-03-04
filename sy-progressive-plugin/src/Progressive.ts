import { Dialog, Menu, Plugin, openTab, confirm, ITab, Lute, IProtyle, Protyle } from "siyuan";
import "./index.scss";
import { EventType, events } from "../../sy-tomato-plugin/src/libs/Events";
import { siyuan, timeUtil } from "../../sy-tomato-plugin/src/libs/utils";
import * as utils from "../../sy-tomato-plugin/src/libs/utils";
import * as help from "./helper";
import * as constants from "./constants";
import { BlockNodeEnum, DATA_NODE_ID, DATA_TYPE, MarkKey, PARAGRAPH_INDEX, PROG_ORIGIN_TEXT, PROG_PIECE_PREVIOUS, RefIDKey } from "../../sy-tomato-plugin/src/libs/gconst";
import { SplitSentence } from "./SplitSentence";
import AddBook from "./AddBook.svelte";
import ShowAllBooks from "./ShowAllBooks.svelte";
import { Storage } from "./Storage";
import { HtmlCBType } from "./constants";

class Progressive {
    private static readonly GLOBAL_THIS: Record<string, any> = globalThis;
    plugin: Plugin;
    storage: Storage;
    helper: help.Helper;
    private openedTabs?: ITab;
    settings: SettingCfgType;
    private lute: Lute;
    private docID: string;
    private observer: MutationObserver;

    async onload(plugin: Plugin, settings: SettingCfgType) {
        Progressive.GLOBAL_THIS["progressive_zZmqus5PtYRi"] = { progressive: this, utils, siyuan, timeUtil, events };
        this.plugin = plugin;
        this.lute = utils.NewLute();
        this.settings = settings;
        this.storage = new Storage(plugin);
        this.helper = new help.Helper(plugin, this.settings);
        await this.storage.onLayoutReady();
        if (!events.isMobile) {
            const topBarElement = this.plugin.addTopBar({
                icon: "iconABook",
                title: this.plugin.i18n.progressiveReadingMenu,
                position: "right",
                callback: () => {
                    if (events.isMobile) {
                        this.addMenu();
                    } else {
                        let rect = topBarElement.getBoundingClientRect();
                        if (rect.width === 0) {
                            rect = document.querySelector("#barMore").getBoundingClientRect();
                        }
                        if (rect.width === 0) {
                            rect = document.querySelector("#barPlugins").getBoundingClientRect();
                        }
                        this.addMenu(rect);
                    }
                }
            });
        }
        this.plugin.addCommand({
            langKey: "startToLearn",
            hotkey: "⌥-",
            callback: async () => {
                await this.startToLearnWithLock();
            },
        });
        this.plugin.addCommand({
            langKey: "startToLearnRand",
            hotkey: "⌥⇧-",
            callback: async () => {
                await this.startToLearnWithLock("", true);
            },
        });
        this.plugin.addCommand({
            langKey: "viewAllProgressiveBooks",
            hotkey: "⌥=",
            callback: async () => {
                await this.viewAllProgressiveBooks();
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                icon: "iconAddingBook",
                label: this.plugin.i18n.addProgressiveReading,
                accelerator: "",
                click: async () => {
                    await this.addProgressiveReadingWithLock();
                }
            });
            menu.addItem({
                icon: "iconEye",
                label: this.plugin.i18n.viewAllProgressiveBooks,
                accelerator: "⌥=",
                click: async () => {
                    await this.viewAllProgressiveBooks();
                }
            });
            menu.addItem({
                label: this.plugin.i18n.readThisPiece,
                icon: "iconCursor",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    if (blockID) {
                        this.readThisPiece(blockID);
                    }
                },
            });
            menu.addItem({
                icon: "iconLearn",
                label: this.plugin.i18n.startToLearn,
                accelerator: "⌥-",
                click: () => {
                    this.startToLearnWithLock();
                }
            });
        });
        events.addListener("ProgressiveBox", (eventType, detail: Protyle) => {
            navigator.locks.request(constants.TryAddStarsLock, { ifAvailable: true }, async (lock) => {
                if (eventType == EventType.loaded_protyle_static) {
                    const protyle: IProtyle = detail.protyle;
                    const welement = protyle?.wysiwyg?.element as HTMLElement;
                    const element = protyle?.element as HTMLElement;
                    if (!protyle || !welement || !element) return;
                    if (this.settings.hideBtnsInFlashCard && element.classList.contains("card__block")) {
                        element.querySelectorAll(`[${MarkKey}][${DATA_NODE_ID}]`).forEach((e: HTMLElement) => {
                            e.style.display = "none";
                        });
                    }
                    const nextDocID = protyle?.block?.rootID;
                    const { isPiece } = help.isProtylePiece(protyle);
                    if (lock && nextDocID && isPiece) {
                        await this.tryAddRefAttr(welement);
                        if (this.docID != nextDocID) {
                            this.docID = nextDocID;
                            this.observer?.disconnect();
                            this.observer = new MutationObserver((_mutationsList) => {
                                this.tryAddRefAttr(welement);
                            });
                            this.observer.observe(welement, { childList: true });
                        }
                    }
                }
            });
        });
    }

    private async tryAddRefAttr(element: HTMLElement) {
        return navigator.locks.request(constants.TryAddStarsLock + "tryAddRefAttr", { ifAvailable: true }, async (lock) => {
            if (lock) {
                Array.from(element.querySelectorAll(`div[${DATA_NODE_ID}]`))
                    .filter((e: HTMLElement) => !e.getAttribute(RefIDKey))
                    .filter((e: HTMLElement) => {
                        const a = e.getAttribute(DATA_TYPE);
                        return a == BlockNodeEnum.NODE_PARAGRAPH
                            || a == BlockNodeEnum.NODE_LIST
                            || a == BlockNodeEnum.NODE_LIST_ITEM
                            || a == BlockNodeEnum.NODE_HEADING
                            || a == BlockNodeEnum.NODE_BLOCKQUOTE
                            || a == BlockNodeEnum.NODE_CODE_BLOCK;
                    }).forEach(e => {
                        const { ref, idx } = findBack(e) || findForward(e);
                        if (ref) {
                            const attr = {} as AttrType;
                            attr["custom-progref"] = ref;
                            if (idx) attr["custom-paragraph-index"] = idx;
                            setTimeout(() => {
                                siyuan.setBlockAttrs(e.getAttribute(DATA_NODE_ID), attr);
                            }, 4000);
                            e.setAttribute(RefIDKey, ref);
                            if (idx) e.setAttribute(PARAGRAPH_INDEX, idx);
                            e.querySelectorAll(`div[${DATA_NODE_ID}]`).forEach(e => {
                                e.setAttribute(RefIDKey, ref);
                                if (idx) e.setAttribute(PARAGRAPH_INDEX, idx);
                            });
                        }
                    });
            }
        });
    }

    private addMenu(rect?: DOMRect) {
        const menu = new Menu("progressiveMenu");
        menu.addItem({
            icon: "iconAddingBook",
            label: this.plugin.i18n.addProgressiveReading,
            accelerator: "",
            click: async () => {
                await this.addProgressiveReadingWithLock();
            }
        });
        menu.addItem({
            icon: "iconEye",
            label: this.plugin.i18n.viewAllProgressiveBooks,
            accelerator: "⌥=",
            click: async () => {
                await this.viewAllProgressiveBooks();
            }
        });
        menu.addItem({
            icon: "iconCursor",
            label: this.plugin.i18n.readThisPiece,
            accelerator: "",
            click: async () => {
                await this.readThisPiece();
            }
        });
        menu.addItem({
            icon: "iconLearn",
            label: this.plugin.i18n.startToLearn,
            accelerator: "⌥-",
            click: () => {
                this.startToLearnWithLock();
            }
        });
        if (events.isMobile) {
            menu.fullscreen();
        } else {
            menu.open({
                x: rect.right,
                y: rect.bottom,
                isLeft: true,
            });
        }
    }

    async addProgressiveReadingWithLock(bookID?: string) {
        return navigator.locks.request(constants.AddProgressiveReadingLock, { ifAvailable: true }, async (lock) => {
            if (lock) {
                await this.addProgressiveReading(bookID, events.boxID);
                await utils.sleep(constants.IndexTime2Wait);
            } else {
                await siyuan.pushMsg(this.plugin.i18n.slowDownALittleBit + " [1]");
            }
        });
    }

    private async addProgressiveReading(bookID: string = "", boxID: string = "") {
        if (!bookID) {
            bookID = events.docID;
        }
        if (!bookID) {
            await siyuan.pushMsg(this.plugin.i18n.openAdocFirst);
            return;
        }
        const row = await siyuan.sqlOne(`select content from blocks where type='d' and id='${bookID}'`);
        if (!row) {
            siyuan.pushMsg(this.plugin.i18n.maybeBookRemoved.replace("{bookID}", bookID));
            return;
        }
        await this.addProgressiveReadingDialog(bookID, row["content"], boxID);
    }

    private async addProgressiveReadingDialog(bookID: string, bookName: string, boxID: string) {
        const id = utils.newID();
        let addBook: AddBook;
        const dialog = new Dialog({
            title: this.plugin.i18n.addProgressiveReading,
            content: `<div class="b3-dialog__content" id="${id}"></div>`,
            width: events.isMobile ? "92vw" : "560px",
            destroyCallback() {
                addBook?.$destroy();
                addBook = undefined;
            },
        });
        addBook = new AddBook({
            target: dialog.element.querySelector("#" + id),
            props: {
                bookID, bookName, boxID, dialog,
            }
        });
    }

    async readThisPiece(blockID?: string) {
        if (!blockID) {
            blockID = events.lastBlockID;
        }
        const row = await siyuan.sqlOne(`select root_id from blocks where id="${blockID}"`);
        if (row) {
            const bookID = row["root_id"];
            const idx = await this.storage.loadBookIndexIfNeeded(bookID);
            if (!idx.length) {
                await siyuan.pushMsg(this.plugin.i18n.addThisDocFirst);
            } else {
                for (let i = 0; i < idx.length; i++) {
                    for (let j = 0; j < idx[i].length; j++) {
                        if (blockID === idx[i][j]) {
                            await this.storage.gotoBlock(bookID, i);
                            await this.startToLearnWithLock(bookID);
                            return;
                        }
                    }
                }
                await siyuan.pushMsg(this.plugin.i18n.opsInOriDocOrAddIt);
            }
        } else {
            await siyuan.pushMsg(this.plugin.i18n.cannotFindDocWaitForIndex);
        }
    }

    async startToLearnWithLock(bookID = "", isRand = false) {
        return navigator.locks.request(constants.StartToLearnLock, { ifAvailable: true }, async (lock) => {
            if (lock) {
                await siyuan.pushMsg(this.plugin.i18n.openingDocPieceForYou);
                await this.startToLearn(bookID, isRand);
                await utils.sleep(constants.IndexTime2Wait);
            } else {
                await siyuan.pushMsg(this.plugin.i18n.slowDownALittleBit + " [2]");
            }
        });
    }

    private async openContentsLock(bookID: string) {
        return navigator.locks.request(constants.BuildContentsLock, { ifAvailable: true }, async (lock) => {
            if (lock) {
                await this.openContents(bookID);
            } else {
                await siyuan.pushMsg("构建/打开目录中，请稍后片刻……");
            }
        });
    }

    private async openContents(bookID: string) {
        let contentID = await help.findContents(bookID);
        if (!contentID) {
            siyuan.pushMsg("首次，构建目录，请稍后片刻……");
            const row = await siyuan.sqlOne(`select box,hpath,content from blocks where id='${bookID}' and type='d'`);
            const hpath = row.hpath;
            const boxID = row.box;
            const bookName = row.content;
            if (!boxID || !hpath) return;

            const rows = await Promise.all((await siyuan.getChildBlocks(bookID))
                .filter(i => i.type == "h")
                .map(i => siyuan.sqlOne(`select id,content,subtype from blocks where id="${i.id}"`)));
            if (rows.length == 0) return;
            const c = rows.reduce<string[]>((list, block) => {
                let level = Number(block.subtype[1]);
                if (!utils.isValidNumber(level) || level < 1) level = 1;
                // if (level == 1) {
                //     list.push("###### " + block.content);
                // }
                list.push("{{{col\n"
                    + this.helper.getContentPrefix(level) + block.content
                    + "\n"
                    + this.helper.btnReadThisPiece(block.id, block.content)
                    + "\n}}}\n");
                return list;
            }, []);
            const attr = {};
            attr[MarkKey] = help.getDocIalContents(bookID);
            attr["custom-sy-readonly"] = "true";
            contentID = await siyuan.createDocWithMdIfNotExists(boxID, `${hpath}/contents-${bookName}`, c.join("\n"), attr);
        }
        if (contentID) await openTab({ app: this.plugin.app, doc: { id: contentID } });
    }

    private async startToLearn(bookID = "", isRand = false) {
        let noteID = "";
        const bookInfo = await this.getBook2Learn(bookID);
        if (!bookInfo.bookID) {
            siyuan.pushMsg(this.plugin.i18n.AddADocFirst);
            return;
        }
        bookID = bookInfo.bookID;
        const bookIndex = await this.storage.loadBookIndexIfNeeded(bookInfo.bookID);
        let point = (await this.storage.booksInfo(bookInfo.bookID)).point;
        if (isRand) point = utils.getRandInt0tox(bookIndex.length);
        await this.storage.updateBookInfoTime(bookID);
        if (point >= bookIndex.length) {
            await siyuan.pushMsg(this.plugin.i18n.thisIsLastPage);
            return;
        } else if (point < 0) {
            await siyuan.pushMsg(this.plugin.i18n.thisIsFirstPage);
            return;
        }
        const piecePre = bookIndex[point - 1] ?? [];
        const piece = bookIndex[point];
        noteID = await help.findPieceDoc(bookInfo.bookID, point);
        let openPiece = false;
        if (noteID) {
            await this.addAndClose(await openTab({ app: this.plugin.app, doc: { id: noteID } }));
            openPiece = true;
        } else {
            noteID = await help.createNote(bookInfo.boxID, bookInfo.bookID, piece, point);
            if (noteID) {
                await this.addReadingBtns(bookID, noteID, point);
                await this.fullfilContent(bookInfo.bookID, piecePre, piece, noteID);
                await this.addAndClose(await openTab({
                    app: this.plugin.app, doc: { id: noteID },
                    afterOpen: () => {
                        if (bookInfo.autoCard) {
                            setTimeout(() => {
                                siyuan.addRiffCards([noteID]);
                            }, 500);
                        }
                    }
                }));
                openPiece = true;
            } else {
                await siyuan.pushMsg(this.plugin.i18n.FailToNewDoc);
            }
        }
        if (openPiece && this.settings.openCardsOnOpenPiece) {
            let hpath = "";
            let docID: string;
            if (this.settings.cardUnderPiece) {
                hpath = await help.getHPathByDocID(noteID, "cards");
                docID = noteID;
            } else {
                hpath = await help.getHPathByDocID(bookID, "cards");
                docID = bookID;
            }
            if (hpath && docID) {
                const targetDocID = await help.getCardsDoc(docID, bookInfo.boxID, hpath);
                openTab({ app: this.plugin.app, doc: { id: targetDocID }, position: "right" });
            }
        }
    }

    async htmlBlockReadNextPeice(bookID: string, noteID: string, cbType: HtmlCBType, point: number) {
        return navigator.locks.request("htmlBlockReadNextPeiceLock", { ifAvailable: true }, async (lock) => {
            if (lock) {
                await this.htmlBlockReadNextPeiceInLock(bookID, noteID, cbType, point);
                await utils.sleep(constants.IndexTime2Wait);
            } else {
                await siyuan.pushMsg(this.plugin.i18n.slowDownALittleBit + " [3]");
            }
        });
    }

    private async htmlBlockReadNextPeiceInLock(bookID: string, noteID: string, cbType: HtmlCBType, point: number) {
        switch (cbType) {
            case HtmlCBType.previous:
                await this.storage.gotoBlock(bookID, point - 1);
                await this.startToLearnWithLock(bookID);
                break;
            case HtmlCBType.next:
                await this.storage.gotoBlock(bookID, point + 1);
                await this.startToLearnWithLock(bookID);
                break;
            case HtmlCBType.deleteAndExit:
                confirm("⚠️", "🏃 🗑", async () => {
                    await siyuan.removeRiffCards([noteID]);
                    siyuan.removeDocByID(noteID);
                });
                break;
            case HtmlCBType.deleteAndBack:
                confirm("⚠️", this.plugin.i18n.DeleteAndBack, async () => {
                    await siyuan.removeRiffCards([noteID]);
                    await this.storage.gotoBlock(bookID, point - 1);
                    await this.startToLearnWithLock(bookID);
                    siyuan.removeDocByID(noteID);
                });
                break;
            case HtmlCBType.deleteAndNext:
                confirm("⚠️", this.plugin.i18n.DeleteAndNext, async () => {
                    await siyuan.removeRiffCards([noteID]);
                    await this.storage.gotoBlock(bookID, point + 1);
                    await this.startToLearnWithLock(bookID);
                    siyuan.removeDocByID(noteID);
                });
                break;
            case HtmlCBType.nextBook:
                await this.startToLearnWithLock();
                break;
            case HtmlCBType.quit: {
                const t = await openTab({ app: this.plugin.app, doc: { id: noteID } });
                await utils.sleep(200);
                t.close();
                break;
            }
            case HtmlCBType.AddDocCard:
                await siyuan.addRiffCards([noteID]);
                break;
            case HtmlCBType.DelDocCard:
                await siyuan.removeRiffCards([noteID]);
                break;
            case HtmlCBType.ignoreBook:
                await this.storage.setIgnoreBook(bookID);
                break;
            case HtmlCBType.fullfilContent: {
                const index = await this.storage.loadBookIndexIfNeeded(bookID);
                const piecePre = index[point - 1] ?? [];
                const piece = index[point] ?? [];
                await this.fullfilContent(bookID, piecePre, piece, noteID);
                break;
            }
            case HtmlCBType.cleanOriginText:
                await help.cleanNote(noteID);
                break;
            case HtmlCBType.openFlashcardTab:
                if (bookID) openTab({ app: this.plugin.app, card: { type: "doc", id: bookID } });
                else openTab({ app: this.plugin.app, card: { type: "all" } });
                break;
            case HtmlCBType.viewContents:
                await this.openContentsLock(bookID);
                break;
            case HtmlCBType.splitByPunctuations: {
                await help.cleanNote(noteID);
                const index = await this.storage.loadBookIndexIfNeeded(bookID);
                const piece = index[point] ?? [];
                await this.splitAndInsert(bookID, noteID, "p", piece);
                break;
            }
            case HtmlCBType.splitByPunctuationsList: {
                await help.cleanNote(noteID);
                const index = await this.storage.loadBookIndexIfNeeded(bookID);
                const piece = index[point] ?? [];
                await this.splitAndInsert(bookID, noteID, "i", piece);
                break;
            }
            case HtmlCBType.splitByPunctuationsListCheck: {
                await help.cleanNote(noteID);
                const index = await this.storage.loadBookIndexIfNeeded(bookID);
                const piece = index[point] ?? [];
                await this.splitAndInsert(bookID, noteID, "t", piece);
                break;
            }
            default:
                throw "Invalid HtmlCBType " + cbType;
        }
    }

    private async splitAndInsert(bookID: string, noteID: string, t: AsList, ids: string[]) {
        const s = new SplitSentence(bookID, this.plugin, noteID, t);
        if (ids?.length > 0) {
            await s.splitByIDs(ids);
            await s.insert(false);
        }
    }

    private async addAndClose(tab?: ITab) {
        if (!tab) return;
        return navigator.locks.request("Progressive_addAndClose", async () => {
            if (this.openedTabs) {
                if (this.openedTabs.id != tab.id) {
                    this.openedTabs.close();
                }
            }
            this.openedTabs = tab;
        });
    }

    private async addReadingBtns(bookID: string, noteID: string, point: number) {
        const btns = [];
        const id = utils.NewNodeID();
        btns.push(help.tempContent("---"));
        btns.push(help.tempContent(this.helper.getReadingBtns1(bookID, noteID, point)));
        btns.push(help.tempContent(this.helper.getReadingBtns2(bookID, noteID, point)));
        btns.push(help.tempContent(this.helper.getReadingBtns3(bookID, noteID, point), id));
        await siyuan.appendBlock(btns.join("\n"), noteID);
    }

    private async fullfilContent(bookID: string, piecePre: string[], piece: string[], noteID: string) {
        this.storage.updateBookInfoTime(bookID);
        const info = await this.storage.booksInfo(bookID);

        const allContent = [];
        if (info.showLastBlock && piecePre.length > 0) {
            const lastID = piecePre[piecePre.length - 1];
            const { div } = await utils.getBlockDiv(lastID);
            allContent.push(await this.copyBlock(info, lastID, div, [PROG_PIECE_PREVIOUS]));
        }

        if (info.autoSplitSentenceP) {
            await this.splitAndInsert(bookID, noteID, "p", piece);
        } else if (info.autoSplitSentenceI) {
            await this.splitAndInsert(bookID, noteID, "i", piece);
        } else if (info.autoSplitSentenceT) {
            await this.splitAndInsert(bookID, noteID, "t", piece);
        } else {
            const idx: { i: number } = { i: 1 };
            const divs = await Promise.all(piece.map(id => utils.getBlockDiv(id)));
            for (const { id, div } of divs) {
                allContent.push(await this.copyBlock(info, id, div, [PROG_ORIGIN_TEXT], idx));
            }
        }

        if (allContent.length > 0) {
            await siyuan.insertBlockAsChildOf(allContent.filter(i => !!i).join("\n\n"), noteID);
        }
    }

    private async copyBlock(info: BookInfo, id: string, tempDiv: HTMLDivElement, mark: string[] = [], idx?: { i: number }) {
        if (!tempDiv) return "";
        if (tempDiv.getAttribute(MarkKey)) return "";
        if (idx && tempDiv.getAttribute(DATA_TYPE) != BlockNodeEnum.NODE_HEADING) {
            tempDiv.setAttribute(PARAGRAPH_INDEX, String(idx.i));
            if (info.addIndex2paragraph) {
                const editableDiv = utils.getContenteditableElement(tempDiv);
                if (editableDiv) {
                    const idxSpan = editableDiv.insertBefore(document.createElement("span"), editableDiv.firstChild) as HTMLSpanElement;
                    if (idxSpan) {
                        idxSpan.setAttribute(DATA_TYPE, "text");
                        // idxSpan.style.backgroundColor = "var(--b3-font-background3)";
                        // idxSpan.style.color = "var(--b3-font-color7)";
                        idxSpan.textContent = `[${idx.i}]`;
                        idx.i++;
                    }
                }
            }
        }
        const txt = this.lute.BlockDOM2StdMd(tempDiv.outerHTML).replace(/\u200B/g, "").trim();
        if (!txt || txt == "*") return "";
        await utils.cleanDiv(tempDiv, true, true);
        tempDiv.setAttribute(RefIDKey, id);
        mark.forEach(m => tempDiv.setAttribute(m, "1"));
        const md = this.lute.BlockDOM2Md(tempDiv.outerHTML);
        return md.trim();
    }

    private async getBook2Learn(bookID?: string): Promise<BookInfo> {
        if (bookID) {
            return this.storage.booksInfo(bookID);
        }
        const infos = this.storage.booksInfos();
        let miniTime = Number.MAX_SAFE_INTEGER;
        let miniID = "";
        for (const id in infos) {
            const { time, ignored } = infos[id];
            if (ignored) continue;
            if (time < miniTime) {
                miniTime = time;
                miniID = id;
            }
        }
        if (miniID) {
            return this.storage.booksInfo(miniID);
        }
        return {} as any;
    }

    async viewAllProgressiveBooks() {
        const id = utils.newID();
        let s: ShowAllBooks;
        const dialog = new Dialog({
            title: this.plugin.i18n.viewAllProgressiveBooks,
            content: `<div class="b3-dialog__content" id='${id}'></div>`,
            width: events.isMobile ? "92vw" : "860px",
            height: "660px",
            destroyCallback: () => {
                s?.$destroy();
                s = undefined;
            }
        });
        s = new ShowAllBooks({
            target: dialog.element.querySelector("#" + id),
            props: {
                dialog,
            }
        });
    }
}

export const prog = new Progressive();

function findBack(e: Element) {
    for (let i = 0; i < 1000 && e; i++, e = e.previousElementSibling) {
        const ref = e.getAttribute(RefIDKey);
        const idx = e.getAttribute(PARAGRAPH_INDEX) ?? "";
        if (ref) return { ref, idx };
    }
    return {};
}

function findForward(e: Element) {
    for (let i = 0; i < 1000 && e; i++, e = e.nextElementSibling) {
        const ref = e.getAttribute(RefIDKey);
        const idx = e.getAttribute(PARAGRAPH_INDEX) ?? "";
        if (ref) return { ref, idx };
    }
    return {};
}
