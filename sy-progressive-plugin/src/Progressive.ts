import { Dialog, Menu, Plugin, openTab, confirm, ITab, Lute, IProtyle } from "siyuan";
import "./index.scss";
import { EventType, events } from "../../sy-tomato-plugin/src/libs/Events";
import { siyuan, timeUtil } from "../../sy-tomato-plugin/src/libs/utils";
import { HtmlCBType } from "./helper";
import * as utils from "../../sy-tomato-plugin/src/libs/utils";
import * as help from "./helper";
import * as constants from "./constants";
import { MarkKey, RefIDKey } from "../../sy-tomato-plugin/src/libs/gconst";
import { SplitSentence } from "./SplitSentence";

class Progressive {
    private static readonly GLOBAL_THIS: Record<string, any> = globalThis;
    private plugin: Plugin;
    private storage: help.Storage;
    private helper: help.Helper;
    private openedTabs: ITab[];
    private settings: SettingCfgType;
    private lute: Lute;

    async onload(plugin: Plugin, settings: SettingCfgType) {
        Progressive.GLOBAL_THIS["progressive_zZmqus5PtYRi"] = { progressive: this, utils, siyuan, timeUtil, events };
        this.plugin = plugin;
        this.lute = utils.NewLute();
        this.settings = settings;
        this.storage = new help.Storage(plugin);
        this.helper = new help.Helper(plugin);
        this.openedTabs = [];
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
        events.addListener("ProgressiveBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static) {
                const protyle: IProtyle = detail.protyle;
                if (help.isProtylePiece(protyle)) {
                    const noteID = protyle.block.rootID;
                    navigator.locks.request(constants.TryAddStarsLock, { ifAvailable: true }, async (lock) => {
                        if (lock) {
                            for (let i = 0; i < 6; i++) {
                                await utils.sleep(2000);
                                await this.tryAddRefAttr(noteID);
                            }
                        }
                    });
                }
            }
        });
        // this.plugin.eventBus.on("ws-main", async ({ detail }) => {
        //     if (detail?.cmd == WsActionTypes.transactions) {
        //         for (const element of detail.data as TransactionData[]) {
        //             for (const ops of element?.doOperations) {
        //                 if (ops.action == "update" && ops.id) {
        //                     const row = await siyuan.getDocRowByBlockID(ops.id);
        //                     if (row) {
        //                         const attr = (await siyuan.getBlockAttrs(row.id))[MarkKey] ?? "";
        //                         const pieceLen = TEMP_CONTENT.length + 1 + "20231229160401-0lfc8qj".length + 1 + 1;
        //                         if (attr.startsWith(TEMP_CONTENT + "#") && attr.length >= pieceLen) {
        //                             navigator.locks.request(constants.TryAddStarsLock, { ifAvailable: true }, async (lock) => {
        //                                 if(lock) await this.tryAddRefAttr(row.id);
        //                                 else console.log("111")
        //                             });
        //                         }
        //                     }
        //                 }
        //             }
        //         };
        //     }
        // })
    }

    private async tryAddRefAttr(noteID: string) {
        const rows: Block[] = [];
        {
            const [rs, blocks] = await Promise.all([
                siyuan.sql(`select id,ial from blocks where root_id="${noteID}" and type='p'`),
                siyuan.getChildBlocks(noteID),
            ]);
            blocks.forEach(c => {
                const r = rs.find(row => row.id == c.id);
                if (r) rows.push(r);
            });
        }
        const findSibling = (block: Block) => {
            let preBlock: Block;
            if (block) {
                for (let i = 0; i < rows.length; i++) {
                    if (i == 0 && block.id == rows[i].id) {
                        preBlock = rows[i + 1];
                        break;
                    }
                    if (i > 0 && block.id == rows[i].id) {
                        preBlock = rows[i - 1];
                        break;
                    }
                }
            }
            return preBlock;
        };
        rows.filter(row => !row.ial.includes(RefIDKey)).forEach(async row => {
            const s = findSibling(row);
            if (s) {
                const attr = (await siyuan.getBlockAttrs(s.id))[RefIDKey] ?? "";
                if (attr) {
                    const newAttr = {};
                    newAttr[RefIDKey] = attr;
                    await siyuan.setBlockAttrs(row.id, newAttr);
                }
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
                this.addProgressiveReadingWithLock();
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

    private addProgressiveReadingWithLock(bookID?: string) {
        navigator.locks.request(constants.AddProgressiveReadingLock, { ifAvailable: true }, async (lock) => {
            if (lock) {
                await this.addProgressiveReading(bookID, events.boxID);
                await utils.sleep(constants.IndexTime2Wait);
            } else {
                siyuan.pushMsg(this.plugin.i18n.slowDownALittleBit);
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
                <span class="prog-style__id">1⃣${this.plugin.i18n.splitByHeadings}</span>
                <input type="checkbox" id="${titleSplitID}" class="prog-style__checkbox"/>
                <div class="fn__hr"></div>
                <div class="prog-style__id">2⃣${this.plugin.i18n.splitByBlockCount}</div>
                <input type="text" id="${BlockNumID}" class="prog-style__input"/>
                <div class="fn__hr"></div>
                <div class="prog-style__id">3⃣${this.plugin.i18n.splitByWordCount}</div>
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

        const titleCheckBox = dialog.element.querySelector("#" + titleSplitID) as HTMLInputElement;
        titleCheckBox.title = "1~6级标题，都被切分。";
        titleCheckBox.checked = true;
        titleCheckBox.disabled = true;

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
            let groups = new help.HeadingGroup(contentBlocks).split();
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
        if (await help.isPiece(blockID)) {
            await siyuan.pushMsg(this.plugin.i18n.opsInOriDoc);
            return;
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
                            this.startToLearnWithLock(bookID);
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

    private startToLearnWithLock(bookID?: string) {
        navigator.locks.request(constants.StartToLearnLock, { ifAvailable: true }, async (lock) => {
            if (lock) {
                await siyuan.pushMsg(this.plugin.i18n.openingDocPieceForYou);
                await this.startToLearn(bookID);
                await utils.sleep(constants.IndexTime2Wait);
            } else {
                siyuan.pushMsg(this.plugin.i18n.slowDownALittleBit);
            }
        });
    }

    private async openContentsLock(bookID: string) {
        navigator.locks.request(constants.BuildContentsLock, { ifAvailable: true }, async (lock) => {
            if (lock) {
                await this.openContents(bookID);
            } else {
                siyuan.pushMsg("构建/打开目录中，请稍后片刻……");
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
            contentID = await siyuan.createDocWithMdIfNotExists(boxID, `${hpath}/${bookName}-contents`, c.join("\n"), attr);
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
        if (noteID) {
            this.addAndClose(await openTab({ app: this.plugin.app, doc: { id: noteID } }));
            return;
        }
        noteID = await help.createNote(bookInfo.boxID, bookInfo.bookID, piece, point);
        if (noteID) {
            await this.addReadingBtns(bookID, noteID, point);
            await siyuan.insertBlockAsChildOf(help.tempContent("---"), noteID);
            await this.fullfilContent(bookInfo.bookID, piecePre, piece, noteID);
            this.addAndClose(await openTab({
                app: this.plugin.app, doc: { id: noteID },
                afterOpen: () => {
                    if (bookInfo.autoCard == "yes") {
                        setTimeout(() => {
                            siyuan.addRiffCards([noteID]);
                        }, 500);
                    }
                }
            }));
        } else {
            await siyuan.pushMsg(this.plugin.i18n.FailToNewDoc);
        }
    }

    async htmlBlockReadNextPeice(bookID: string, noteID: string, cbType: HtmlCBType, point: number) {
        navigator.locks.request(constants.StartToLearnLock, { ifAvailable: true }, async (lock) => {
            if (lock) {
                await this.htmlBlockReadNextPeiceInLock(bookID, noteID, cbType, point);
                await utils.sleep(constants.IndexTime2Wait);
            } else {
                siyuan.pushMsg(this.plugin.i18n.slowDownALittleBit);
            }
        });
    }

    private async htmlBlockReadNextPeiceInLock(bookID: string, noteID: string, cbType: HtmlCBType, point: number) {
        switch (cbType) {
            case HtmlCBType.previous:
                await this.storage.gotoBlock(bookID, point - 1);
                await this.startToLearn(bookID);
                break;
            case HtmlCBType.next:
                await this.storage.gotoBlock(bookID, point + 1);
                await this.startToLearn(bookID);
                break;
            case HtmlCBType.deleteAndExit:
                await siyuan.removeRiffCards([noteID]);
                siyuan.removeDocByID(noteID);
                break;
            case HtmlCBType.deleteAndBack:
                await siyuan.removeRiffCards([noteID]);
                await this.storage.gotoBlock(bookID, point - 1);
                await this.startToLearn(bookID);
                siyuan.removeDocByID(noteID);
                break;
            case HtmlCBType.deleteAndNext:
                await siyuan.removeRiffCards([noteID]);
                await this.storage.gotoBlock(bookID, point + 1);
                await this.startToLearn(bookID);
                siyuan.removeDocByID(noteID);
                break;
            case HtmlCBType.nextBook:
                await this.startToLearn();
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
                await siyuan.insertBlockAsChildOf(help.tempContent("---"), noteID);
                await this.fullfilContent(bookID, piecePre, piece, noteID);
                break;
            }
            case HtmlCBType.cleanUnchanged:
                await help.cleanNote(noteID);
                await this.addReadingBtns(bookID, noteID, point);
                break;
            case HtmlCBType.openFlashcardTab:
                if (bookID) openTab({ app: this.plugin.app, card: { type: "doc", id: bookID } });
                else openTab({ app: this.plugin.app, card: { type: "all" } });
                break;
            case HtmlCBType.viewContents:
                await this.openContentsLock(bookID);
                break;
            case HtmlCBType.splitByPunctuations: {
                const s = new SplitSentence(noteID, "p");
                await s.split();
                await s.insert();
                break;
            }
            case HtmlCBType.splitByPunctuationsList: {
                const s = new SplitSentence(noteID, "l");
                await s.split();
                await s.insert();
                break;
            }
            case HtmlCBType.splitByPunctuationsListSeparate: {
                const s = new SplitSentence(noteID, "ls");
                await s.split();
                await s.insert();
                break;
            }
            default:
                throw "Invalid HtmlCBType " + cbType;
        }
    }

    private addAndClose(tab?: ITab) {
        navigator.locks.request("Progressive_addAndClose", () => {
            this.openedTabs.pop()?.close();
            if (tab) this.openedTabs.push(tab);
        });
    }

    private async addReadingBtns(bookID: string, noteID: string, point: number) {
        await siyuan.insertBlockAsChildOf(help.tempContent(this.helper.getReadingBtns3(bookID, noteID, point)), noteID);
        await siyuan.insertBlockAsChildOf(help.tempContent(this.helper.getReadingBtns2(bookID, noteID, point)), noteID);
        await siyuan.insertBlockAsChildOf(help.tempContent(this.helper.getReadingBtns1(bookID, noteID, point)), noteID);
    }

    private async fullfilContent(bookID: string, piecePre: string[], piece: string[], noteID: string) {
        this.storage.updateBookInfoTime(bookID);
        for (const id of piece.slice().reverse()) {
            await help.copyAndInsertBlock(id, this.lute, noteID);
        }
        if (this.settings.showLastBlock) {
            for (const id of piecePre.slice().reverse()) {
                await help.copyAndInsertBlock(id, this.lute, noteID, "custom-prog-piece-previous");
                break;
            }
        }
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
