import { Dialog, Menu, Plugin, openTab, confirm, ITab, Lute, IProtyle, Protyle } from "siyuan";
import "./index.scss";
import { EventType, events } from "../../sy-tomato-plugin/src/libs/Events";
import { siyuan, timeUtil } from "../../sy-tomato-plugin/src/libs/utils";
import { HtmlCBType } from "./helper";
import * as utils from "../../sy-tomato-plugin/src/libs/utils";
import * as help from "./helper";
import * as constants from "./constants";
import { BlockNodeEnum, DATA_NODE_ID, DATA_TYPE, MarkKey, PARAGRAPH_INDEX, PROG_ORIGIN_TEXT, RefIDKey } from "../../sy-tomato-plugin/src/libs/gconst";
import { SplitSentence } from "./SplitSentence";

class Progressive {
    private static readonly GLOBAL_THIS: Record<string, any> = globalThis;
    private plugin: Plugin;
    private storage: help.Storage;
    private helper: help.Helper;
    private openedTabs?: ITab;
    private settings: SettingCfgType;
    private lute: Lute;
    private docID: string;
    private observer: MutationObserver;

    async onload(plugin: Plugin, settings: SettingCfgType) {
        Progressive.GLOBAL_THIS["progressive_zZmqus5PtYRi"] = { progressive: this, utils, siyuan, timeUtil, events };
        this.plugin = plugin;
        this.lute = utils.NewLute();
        this.settings = settings;
        this.storage = new help.Storage(plugin);
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
            callback: () => {
                this.startToLearnWithLock();
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
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
        });
        events.addListener("ProgressiveBox", (eventType, detail: Protyle) => {
            navigator.locks.request(constants.TryAddStarsLock, { ifAvailable: true }, async (lock) => {
                if (eventType == EventType.loaded_protyle_static) {
                    const protyle: IProtyle = detail.protyle;
                    if (!protyle) return;
                    const nextDocID = protyle?.block?.rootID;
                    const element = protyle?.wysiwyg?.element;
                    if (lock && element && nextDocID && help.isProtylePiece(protyle)) {
                        await this.tryAddRefAttr(element);
                        if (this.docID != nextDocID) {
                            this.docID = nextDocID;
                            this.observer?.disconnect();
                            this.observer = new MutationObserver((_mutationsList) => {
                                this.tryAddRefAttr(element);
                            });
                            this.observer.observe(element, { childList: true });
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
            accelerator: "",
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

    private async addProgressiveReadingWithLock(bookID?: string) {
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

    private async addProgressiveReadingDialog(bookID: string, bookName: string, _boxID: string) {
        const autoCardID = utils.newID();
        const titleSplitID = utils.newID();
        const BlockNumID = utils.newID();
        const LengthSplitID = utils.newID();
        const btnSplitID = utils.newID();
        const statisticDivID = utils.newID();
        const dialog = new Dialog({
            title: this.plugin.i18n.addProgressiveReading,
            content: `<div class="b3-dialog__content">
                <div class="fn__hr"></div>
                <div class="prog-style__id">《${bookName}》</div>
                <div class="fn__hr"></div>
                <div class="prog-style__id" id="${statisticDivID}"></div>
                <div class="fn__hr"></div>
                <div class="prog-style__id">1、${this.plugin.i18n.splitByHeadings}</div>
                <input type="text" id="${titleSplitID}" class="prog-style__input"/>
                <div class="fn__hr"></div>
                <div class="prog-style__id">2、${this.plugin.i18n.splitByBlockCount}</div>
                <input type="text" id="${BlockNumID}" class="prog-style__input"/>
                <div class="fn__hr"></div>
                <div class="prog-style__id">3、${this.plugin.i18n.splitByWordCount}</div>
                <input type="text" id="${LengthSplitID}" class="prog-style__input"/>
                <div class="fn__hr"></div>
                <span class="prog-style__id">${this.plugin.i18n.autoCard}</span>
                <input type="checkbox" id="${autoCardID}" class="prog-style__checkbox"/>
                <div class="fn__hr"></div>
                <button id="${btnSplitID}" class="prog-style__button">${this.plugin.i18n.addOrReaddDoc}</button>
                <div class="fn__hr"></div>
            </div>`,
            width: events.isMobile ? "92vw" : "560px",
        });

        const statisticDiv = dialog.element.querySelector("#" + statisticDivID) as HTMLDivElement;
        statisticDiv.innerHTML = "统计中……";
        let contentBlocks: help.WordCountType[] = await siyuan.getChildBlocks(bookID) as unknown as help.WordCountType[];
        const { wordCount } = await siyuan.getBlocksWordCount([bookID]);
        let headCount = 0;
        for (const block of contentBlocks) {
            if (block.type == "h") headCount++;
        }
        statisticDiv.innerHTML = `
            总字数：${wordCount}<br>
            各级标题数：${headCount}<br>
            总块数：${contentBlocks.length}<br>
            平均每个标题下有：${Math.ceil(contentBlocks.length / (headCount == 0 ? 1 : headCount))}块<br>
            平均每个块有：${Math.ceil(wordCount / contentBlocks.length)}字`;

        const titleInput = dialog.element.querySelector("#" + titleSplitID) as HTMLInputElement;
        titleInput.value = "1,2,3,4,5,6";

        const autoCardBox = dialog.element.querySelector("#" + autoCardID) as HTMLInputElement;
        autoCardBox.checked = false;
        autoCardBox.title = "把阅读到的分片设置为闪卡";
        autoCardBox.addEventListener("change", () => {
            if (autoCardBox.checked) {
                autoCardBox.checked = true;
            } else {
                autoCardBox.checked = false;
            }
        });

        const BlockNumInput = dialog.element.querySelector("#" + BlockNumID) as HTMLInputElement;
        BlockNumInput.value = "0";

        const LengthSplitInput = dialog.element.querySelector("#" + LengthSplitID) as HTMLInputElement;
        LengthSplitInput.value = "0";

        const btn = dialog.element.querySelector("#" + btnSplitID) as HTMLButtonElement;
        btn.addEventListener("click", async () => {
            const headings = titleInput.value.trim().replace(/，/g, ",")
                .split(",").map(i => i.trim()).filter(i => !!i)
                .map(i => Number(i));
            if (!headings.reduce((ret, i) => ret && utils.isValidNumber(i) && i >= 1 && i <= 6, true)) {
                titleInput.value = "1,2,3,4,5,6";
                return;
            }
            headings.sort();

            const splitLen = Number(LengthSplitInput.value.trim());
            if (!utils.isValidNumber(splitLen)) {
                LengthSplitInput.value = "0";
                return;
            }

            const blockNumber = Number(BlockNumInput.value.trim());
            if (!utils.isValidNumber(blockNumber)) {
                BlockNumInput.value = "0";
                return;
            }

            dialog.destroy();
            // await siyuan.setBlockAttrs(bookID, { "custom-sy-readonly": "true" });

            if (splitLen > 0) {
                contentBlocks = await this.helper.getDocWordCount(contentBlocks);
            }

            await siyuan.pushMsg(this.plugin.i18n.splitByHeadings);
            let groups = new help.HeadingGroup(contentBlocks, headings).split();
            groups = help.splitByBlockCount(groups, blockNumber);
            if (splitLen > 0) {
                await siyuan.pushMsg(this.plugin.i18n.splitByWordCount + ":" + splitLen);
                groups = new help.ContentLenGroup(groups, splitLen).split();
            }
            await this.storage.saveIndex(bookID, groups);
            await this.storage.resetBookReadingPoint(bookID);
            if (!autoCardBox.checked) {
                await this.storage.toggleAutoCard(bookID, "no");
            } else {
                await this.storage.toggleAutoCard(bookID, "yes");
            }
            this.startToLearnWithLock(bookID);
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

    private async startToLearnWithLock(bookID?: string) {
        return navigator.locks.request(constants.StartToLearnLock, { ifAvailable: true }, async (lock) => {
            if (lock) {
                await siyuan.pushMsg(this.plugin.i18n.openingDocPieceForYou);
                await this.startToLearn(bookID);
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

    private async startToLearn(bookID?: string) {
        let noteID = "";
        const bookInfo = await this.getBook2Learn(bookID);
        if (!bookInfo.bookID) {
            siyuan.pushMsg(this.plugin.i18n.AddADocFirst);
            return;
        }
        bookID = bookInfo.bookID;
        const bookIndex = await this.storage.loadBookIndexIfNeeded(bookInfo.bookID);
        const point = (await this.storage.booksInfo(bookInfo.bookID)).point;
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
        noteID = await help.findDoc(bookInfo.bookID, point);
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
                        if (bookInfo.autoCard == "yes") {
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
            if (this.settings.cardUnderPiece) {
                hpath = await help.getHPathByDocID(noteID, "cards");
            } else {
                hpath = await help.getHPathByDocID(bookID, "cards");
            }
            if (hpath) {
                const targetDocID = await help.getCardsDoc(bookID, bookInfo.boxID, hpath);
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
                await this.storage.toggleIgnoreBook(bookID);
                break;
            case HtmlCBType.fullfilContent: {
                const index = await this.storage.loadBookIndexIfNeeded(bookID);
                const piecePre = index[point - 1] ?? [];
                const piece = index[point] ?? [];
                await this.fullfilContent(bookID, piecePre, piece, noteID);
                break;
            }
            case HtmlCBType.cleanUnchanged:
                await help.cleanNote(noteID, false);
                break;
            case HtmlCBType.cleanOriginText:
                await help.cleanNote(noteID, true);
                break;
            case HtmlCBType.openFlashcardTab:
                if (bookID) openTab({ app: this.plugin.app, card: { type: "doc", id: bookID } });
                else openTab({ app: this.plugin.app, card: { type: "all" } });
                break;
            case HtmlCBType.viewContents:
                await this.openContentsLock(bookID);
                break;
            case HtmlCBType.splitByPunctuations: {
                const s = new SplitSentence(this.plugin, noteID, "p");
                await s.split();
                await s.insert();
                await help.cleanNote(noteID, true);
                break;
            }
            case HtmlCBType.splitByPunctuationsList: {
                const s = new SplitSentence(this.plugin, noteID, "l");
                await s.split();
                await s.insert();
                await help.cleanNote(noteID, true);
                break;
            }
            case HtmlCBType.splitByPunctuationsListCheck: {
                const s = new SplitSentence(this.plugin, noteID, "t");
                await s.split();
                await s.insert();
                await help.cleanNote(noteID, true);
                break;
            }
            default:
                throw "Invalid HtmlCBType " + cbType;
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
        // const rows = await siyuan.sql(`select id from blocks where ial like '%${IN_PIECE_REF}="1"%' and root_id="${noteID}"`);
        // for (const row of rows.reverse()) {
        //     try { await siyuan.safeMoveBlockAfter(row.id, id); } catch (_e) { }
        // }
    }

    private async fullfilContent(bookID: string, piecePre: string[], piece: string[], noteID: string) {
        this.storage.updateBookInfoTime(bookID);
        const allContent = [];
        if (this.settings.showLastBlock && piecePre.length > 0) {
            const lastID = piecePre[piecePre.length - 1];
            allContent.push(await help.copyBlock(lastID, this.lute, "custom-prog-piece-previous"));
        }
        let idx: { i: number };
        if (this.settings.addIndex2paragraph) idx = { i: 1 };
        for (const id of piece) {
            allContent.push(await help.copyBlock(id, this.lute, PROG_ORIGIN_TEXT, idx));
        }
        await siyuan.insertBlockAsChildOf(allContent.filter(i => !!i).join("\n\n"), noteID);
    }

    private async getBook2Learn(bookID?: string): Promise<help.BookInfo> {
        if (bookID) {
            return this.storage.booksInfo(bookID);
        }
        const infos = this.storage.booksInfos();
        let miniTime = Number.MAX_SAFE_INTEGER;
        let miniID = "";
        for (const id in infos) {
            const { time, ignored } = infos[id];
            if (ignored == "yes") continue;
            if (time < miniTime) {
                miniTime = time;
                miniID = id;
            }
        }
        if (miniID) {
            return this.storage.booksInfo(miniID);
        }
        return {};
    }

    private async viewAllProgressiveBooks() {
        const id = utils.newID();
        const dialog = new Dialog({
            title: this.plugin.i18n.viewAllProgressiveBooks,
            content: `<div class="b3-dialog__content">
                <div id='${id}'></div>
            </div>`,
            width: events.isMobile ? "92vw" : "860px",
            height: "660px",
        });
        const div = dialog.element.querySelector("#" + id) as HTMLElement;

        const tasks = Object.entries(this.storage.booksInfos()).filter(([_bookID]) => {
            // if(_bookID=="20231124021105-errwtja")
            return true;
        }).map(([bookID]) => {
            const bookInfo = this.storage.booksInfo(bookID);
            const idx = this.storage.loadBookIndexIfNeeded(bookID);
            const row = siyuan.sqlOne(`select content from blocks where type='d' and id="${bookID}"`);
            return [bookID, bookInfo, idx, row];
        }).flat();
        const books = utils.chunks(await Promise.all(tasks), 4) as [string, help.BookInfo, string[][], Block][];
        for (const [bookID, bookInfo, idx, row] of books.reverse()) {
            const subDiv = help.appendChild(div, "div", "", ["prog-style__container_div"]);
            let name = bookID;
            if (row) name = row["content"];
            const progress = `${Math.ceil(bookInfo.point / idx.length * 100)}%`;
            help.appendChild(subDiv, "p", name, ["prog-style__id"]);
            help.appendChild(subDiv, "p", progress, ["prog-style__id"]);
            help.appendChild(subDiv, "button", this.plugin.i18n.Reading, ["prog-style__button"], () => {
                this.startToLearnWithLock(bookID);
                dialog.destroy();
            });
            help.appendChild(subDiv, "button", this.plugin.i18n.ignoreTxt + ` ${bookInfo.ignored}`, ["prog-style__button"], () => {
                this.storage.toggleIgnoreBook(bookID);
                dialog.destroy();
                this.viewAllProgressiveBooks();
            });
            help.appendChild(subDiv, "button", this.plugin.i18n.autoCard + ` ${bookInfo.autoCard}`, ["prog-style__button"], () => {
                this.storage.toggleAutoCard(bookID);
                dialog.destroy();
                this.viewAllProgressiveBooks();
            });
            help.appendChild(subDiv, "button", this.plugin.i18n.Repiece, ["prog-style__button"], () => {
                this.addProgressiveReadingWithLock(bookID);
                dialog.destroy();
            });
            help.appendChild(subDiv, "button", this.plugin.i18n.Delete, ["prog-style__button"], () => {
                confirm("⚠️", "只删除记录与辅助数据，不删除分片，不删除闪卡等。<br>删除：" + name, async () => {
                    await this.storage.removeIndex(bookID);
                    div.removeChild(subDiv);
                });
            });
        }
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

// this.plugin.eventBus.on("ws-main", async ({ detail }) => {
//     if (detail?.cmd == WsActionTypes.transactions) {
//         for (const element of detail.data as TransactionData[]) {
//             for (const ops of element?.doOperations ?? []) {
//                 if (ops?.action == "update" && ops.id) {
//                     const row = await siyuan.getDocRowByBlockID(ops.id);
//                     if (row?.id) {
//                         const attr = (await siyuan.getBlockAttrs(row.id))[MarkKey] ?? "";
//                         const pieceLen = TEMP_CONTENT.length + 1 + "20231229160401-0lfc8qj".length + 1 + 1;
//                         if (attr.startsWith(TEMP_CONTENT + "#") && attr.length >= pieceLen) {
//                             navigator.locks.request(constants.TryAddStarsLock, { ifAvailable: true }, async (lock) => {
//                                 if (lock) {
//                                     for (let i = 0; i < 6; i++) {
//                                         await utils.sleep(4000);
//                                         await this.tryAddRefAttr(row.id);
//                                     }
//                                 }
//                             });
//                         }
//                     }
//                 }
//             }
//         }
//     }
// });