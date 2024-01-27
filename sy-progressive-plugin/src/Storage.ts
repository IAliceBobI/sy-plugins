import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import * as constants from "./constants";
import { Plugin } from "siyuan";
import * as utils from "../../sy-tomato-plugin/src/libs/utils";

export class Storage {
    private plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    async onLayoutReady() {
        // load only need once, save many
        await this.plugin.loadData(constants.STORAGE_BOOKS);
        Object.entries(this.booksInfos()).forEach(([_k, v]) => {
            if (typeof v.autoCard === "string") {
                if (v.autoCard === "yes") v.autoCard = true;
                else v.autoCard = false;
            }
            if (typeof v.ignored === "string") {
                if (v.ignored === "yes") v.ignored = true;
                else v.ignored = false;
            }
        })
    }

    async updateBookInfoTime(docID: string) {
        this.updateBookInfo(docID, {} as any);
    }

    async resetBookReadingPoint(docID: string) {
        this.updateBookInfo(docID, { point: 0 } as any);
    }

    async toggleIgnoreBook(bookID: string) {
        const info = await this.booksInfo(bookID);
        if (!info.ignored) {
            await this.updateBookInfo(bookID, { ignored: true } as any);
            await siyuan.pushMsg(this.plugin.i18n.msgIgnoreBook);
        } else {
            await this.updateBookInfo(bookID, { ignored: false } as any);
            await siyuan.pushMsg(this.plugin.i18n.msgPushBook);
        }
    }

    async toggleShowLastBlock(bookID: string) {
        const info = await this.booksInfo(bookID);
        if (!info.showLastBlock) {
            await this.updateBookInfo(bookID, { showLastBlock: true } as any);
            await siyuan.pushMsg("显示上一分片最后一个内容块");
        } else {
            await this.updateBookInfo(bookID, { showLastBlock: false } as any);
            await siyuan.pushMsg("不显示上一分片最后一个内容块");
        }
    }

    async toggleAutoCard(bookID: string, opt?: boolean) {
        const info = await this.booksInfo(bookID);
        if (typeof opt === "boolean") {
            await this.updateBookInfo(bookID, { autoCard: opt } as any);
        } else {
            if (!info.autoCard) {
                await this.updateBookInfo(bookID, { autoCard: true } as any);
                await siyuan.pushMsg(this.plugin.i18n.msgAutoCard);
            } else {
                await this.updateBookInfo(bookID, { autoCard: false } as any);
                await siyuan.pushMsg(this.plugin.i18n.msgNotAutoCard);
            }
        }
    }

    private async updateBookInfo(docID: string, opt: BookInfo) {
        if (docID?.length !== "20231218000645-9aaaltd".length) return;
        const info = await this.booksInfo(docID);
        if (typeof opt.autoCard === "boolean") info.autoCard = opt.autoCard;
        if (typeof opt.ignored === "boolean") info.ignored = opt.ignored;
        if (typeof opt.showLastBlock === "boolean") info.showLastBlock = opt.showLastBlock;
        if (utils.isValidNumber(opt.point)) info.point = opt.point;
        info.time = await siyuan.currentTimeMs();
        this.booksInfos()[docID] = info;
        return this.saveBookInfos();
    }

    async booksInfo(docID: string): Promise<BookInfo> {
        if (!docID) return {} as BookInfo;
        let info = this.booksInfos()[docID];
        if (!info) {
            info = {
                point: 0,
                bookID: docID,
                time: await siyuan.currentTimeMs(),
                ignored: false,
                showLastBlock: false,
                autoCard: false,
            } as BookInfo;
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
            await this.updateBookInfo(bookID, { point } as any);
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

export function bookCacheKey(bookID: string) {
    return bookID + "_cache";
}
