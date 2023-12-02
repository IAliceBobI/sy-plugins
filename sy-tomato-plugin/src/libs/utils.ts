import { Constants, IOperation, Lute, fetchSyncPost } from "siyuan";
import { v4 as uuid } from "uuid";

export function extractLinks(txt: string) {
    const RefRegex = /\(\(([0-9\-a-z]{22}) (("[^"]*?")|('[^']*?'))\)\)/g;
    const ids: string[] = [];
    const links: string[] = [];
    let match: any;
    do {
        match = RefRegex.exec(txt) ?? [];
        const id = match[1] ?? "";
        if (id) {
            ids.push(id);
            links.push(match[0]);
        }
    } while (match.length > 0);
    return { ids, links };
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export const NewLute: () => Lute = (globalThis as any).Lute.New;

export const NewNodeID: () => string = (globalThis as any).Lute.NewNodeID;

export const BlockDOM2Content: (html: string) => string = (globalThis as any).Lute.BlockDOM2Content;

export function divideArrayIntoParts<T>(array: T[], n: number): T[][] {
    n = Math.ceil(array.length / n);
    return chunks(array, n);
}

export function chunks<T>(array: T[], n: number): T[][] {
    const newArr: T[][] = [];
    for (let i = 0; i < array.length; i += n) {
        const part = array.slice(i, i + n);
        if (part.length > 0) newArr.push(part);
    }
    return newArr;
}

export function findBookOpennedFirst(bookID: string, bookIDList: string[]): string {
    if (bookIDList.length === 0) return bookID;
    if (bookIDList.indexOf(bookID) === -1) {
        return bookIDList[0];
    }
    return bookID;
}

export function newID() {
    return "ID" + uuid().replace(/-/g, "");
}

export function dir(path: string) {
    const parts = path.split("/");
    const file = parts.pop();
    return [parts.join("/"), file];
}

export function isValidNumber(num: number) {
    return typeof num === "number" && !isNaN(num);
}

export const timeUtil = {
    dateFormat(date: Date) {
        const year: any = date.getFullYear();
        let month: any = date.getMonth() + 1;
        let day: any = date.getDate();
        let hours: any = date.getHours();
        let minutes: any = date.getMinutes();
        let seconds: any = date.getSeconds();
        month = (month < 10 ? "0" : "") + month;
        day = (day < 10 ? "0" : "") + day;
        hours = (hours < 10 ? "0" : "") + hours;
        minutes = (minutes < 10 ? "0" : "") + minutes;
        seconds = (seconds < 10 ? "0" : "") + seconds;
        return year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
    },
    dateFromYYYYMMDDHHmmss(date: string) {
        return new Date(date);
    },
    checkTimeFormat(input: string) {
        const timeRegex = /^(\d{4})-(\d{1,2})-(\d{1,2}) ?(\d{1,2}):(\d{1,2}):(\d{1,2})$/;

        return timeRegex.test(input);
    },
    makesureDateTimeFormat(input: string) {
        const timeRegex = /^(\d{4})-(\d{1,2})-(\d{1,2}) ?(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
        const zeroPad = (value: string) => {
            const v = value?.toString() ?? "";
            return padStart(v, 2, "0");
        };
        const formattedTimeString = input.replace(timeRegex, (_match, year, month, day, hour, minute, second) => {
            return `${year}-${zeroPad(month)}-${zeroPad(day)} ${zeroPad(hour)}:${zeroPad(minute)}:${zeroPad(second)}`;
        });
        if (new Date(formattedTimeString).toDateString() === "Invalid Date") {
            return "";
        }
        return formattedTimeString;
    },
};

export const siyuan = {
    async pushMsg(msg: string, timeoutMs = 7000) {
        const url = "/api/notification/pushMsg";
        const response = await fetchSyncPost(url, { msg, timeout: timeoutMs });
        if (response.code != 0) {
            throw Error(`${url}: code=${response.code}, msg=${response.msg}`);
        }
        return response.data;
    },
    async currentTime(secs = 0) {
        return timeUtil.dateFormat(new Date(await siyuan.currentTimeMs(secs)));
    },
    async currentTimeMs(secs = 0) {
        const response = await fetchSyncPost("/api/system/currentTime", {});
        return response.data + secs * 1000;
    },
    async readDir(path: string) {
        // [      {
        //         "isDir": false,
        //         "isSymlink": false,
        //         "name": "20231119160703-oelb6pi.sy",
        //         "updated": 1700381318
        //     }  ]
        return siyuan.call("/api/file/readDir", { path });
    },
    async getFile(path: string) {
        const method = "POST";
        const headers = { "Content-Type": "application/json" };
        const data = await fetch("/api/file/getFile", {
            method,
            headers,
            body: JSON.stringify({ path }),
        });
        return await data.json();
    },
    // =================================
    async call(url: string, reqData: any) {
        const method = "POST";
        const headers = { "Content-Type": "application/json" };
        const data = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(reqData),
        });
        const json = await data.json();
        if (json?.code && json?.code != 0) {
            console.warn("p5 code=%s %s", json?.code, json?.msg);
            return null;
        }
        if (json?.data === undefined)
            return data;
        return json.data;
    },
    async openNotebook(notebookID: string) {
        const notebook = notebookID;
        return siyuan.call("/api/notebook/openNotebook", { notebook });
    },
    async lsNotebooks(closed: boolean) {
        const resp = await siyuan.call("/api/notebook/lsNotebooks", {});
        const l = [];
        for (const book of resp["notebooks"]) {
            if (book.closed === closed) {
                l.push(book.id);
            }
        }
        return l;
    },
    async sql(stmt: string) {
        return siyuan.call("/api/query/sql", { stmt });
    },
    // await globalThis.progressive_zZmqus5PtYRi.siyuan.sqlOne(`select * from blocks where id='20231106015952-wjqufut'`)
    async sqlOne(stmt: string) {
        const ret = await siyuan.sql(stmt);
        if (ret.length >= 1) {
            return ret[0];
        }
        return {};
    },
    async createDocWithMdIfNotExists(notebookID: string, path_readable: string, markdown: string) {
        const row = await siyuan.sqlOne(`select id from blocks where hpath="${path_readable}" and type='d' limit 1`);
        const docID = row?.id ?? "";
        if (!docID) {
            return siyuan.createDocWithMd(notebookID, path_readable, markdown);
        }
        return docID;
    },
    async createDocWithMd(notebookID: string, path_readable: string, markdown: string, id = "") {
        const notebook = notebookID;
        const path = path_readable;
        const params = { notebook, path, markdown, id };
        if (!id) delete params["id"];
        return siyuan.call("/api/filetree/createDocWithMd", params);
    },
    async removeDoc(notebookID: string, path_not_readable: string) {
        return siyuan.call("/api/filetree/removeDoc", { notebook: notebookID, path: path_not_readable });
    },
    async removeDocByID(docID: string) {
        const row = await this.sqlOne(`select box, path from blocks where id="${docID}" and type="d"`);
        if (row) {
            return siyuan.removeDoc(row["box"], row["path"]);
        }
        return {};
    },
    async checkBlockExist(id: string) {
        return siyuan.call("/api/block/checkBlockExist", { id });
    },
    async getBlockDOM(id: string) {
        // {dom, id}
        return siyuan.call("/api/block/getBlockDOM", { id });
    },
    async setBlockAttrs(id: string, attrs: any) {
        return siyuan.call("/api/attr/setBlockAttrs", { id, attrs });
    },
    async getBlockAttrs(id: string) {
        return siyuan.call("/api/attr/getBlockAttrs", { id });
    },
    async transactions(doOperations: IOperation[]) {
        return siyuan.call("/api/transactions", {
            session: Constants.SIYUAN_APPID,
            app: Constants.SIYUAN_APPID,
            transactions: [{
                doOperations
            }]
        });
    },
    async getNotebookConf(notebookID: string): Promise<GetNotebookConf> {
        return siyuan.call("/api/notebook/getNotebookConf", { "notebook": notebookID });
    },
    async getDocIDByBlockID(id: string): Promise<string> {
        const row = await siyuan.sqlOne(`select root_id from blocks where id='${id}'`);
        return row["root_id"] ?? "";
    },
    async getRowByID(id: string) {
        const row = await siyuan.sqlOne(`select * from blocks where id='${id}'`);
        return row ?? {};
    },
    async getChildBlocks(id: string): Promise<GetChildBlocks[]> {
        return siyuan.call("/api/block/getChildBlocks", { id });
    },
    async getIDsByHPath(hpath: string, notebookID: string) {
        // return ['20231102203317-gj54aex']
        return siyuan.call("/api/filetree/getIDsByHPath", { path: hpath, notebook: notebookID });
    },
    async getTag(sort: number) {
        return siyuan.call("/api/tag/getTag", { sort });
    },
    async getBlocksWordCount(ids: string[]) {
        // {runeCount: 0, wordCount: 0, linkCount: 0, imageCount: 0, refCount: 0}
        // if ids.length > 1, like wordCount will be the sum of blocks.
        return siyuan.call("api/block/getBlocksWordCount", { ids });
    },
    async clearAll(docID: string) {
        const blocks = await siyuan.getChildBlocks(docID);
        siyuan.safeDeleteBlocks(blocks.map((b: any) => b["id"]));
    },
    async safeDeleteBlocks(ids: string[]) {
        for (const idlist of chunks(ids, 50)) {
            const tasks = [];
            for (const id of idlist) {
                tasks.push(siyuan.safeDeleteBlock(id));
            }
            await Promise.all(tasks);
        }
    },
    async safeDeleteBlock(id: string) {
        if (await siyuan.checkBlockExist(id))
            return siyuan.call("/api/block/deleteBlock", { id });
    },
    async safeMoveBlockToParent(id: string, parentID: string) {
        if (await siyuan.checkBlockExist(id))
            return siyuan.call("/api/block/moveBlock", { id, parentID });
    },
    async safeMoveBlockAfter(id: string, previousID: string) {
        if (await siyuan.checkBlockExist(id))
            return siyuan.call("/api/block/moveBlock", { id, previousID });
    },
    async getBlockKramdown(id: string) {
        return siyuan.call("/api/block/getBlockKramdown", { id });
    },
    async safeUpdateBlock(id: string, data: string, dataType = "markdown") {
        if (await siyuan.checkBlockExist(id))
            return siyuan.call("/api/block/updateBlock", { id, data, dataType });
    },
    async getBlockMarkdownAndContent(id: string): Promise<GetBlockMarkdownAndContent> {
        const row: { [key: string]: string } = await siyuan.sqlOne(`select markdown, content from blocks where id="${id}"`);
        return { markdown: row?.markdown ?? "", content: row?.content ?? "" };
    },
    async getHeadingChildrenIDs(id: string) {
        return siyuan.call("/api/block/getHeadingChildrenIDs", { id });
    },
    async getHeadingChildrenDOM(id: string) {
        return siyuan.call("/api/block/getHeadingChildrenDOM", { id });
    },
    async listDocsByPath(notebookID: string, notReadablePath: string, sort = 15) {
        return siyuan.call("/api/filetree/listDocsByPath", { notebook: notebookID, path: notReadablePath, sort });
    },
    async getBackmentionDoc(defID: string, refTreeID: string, keyword: string = ""): Promise<GetBackmentionDoc> {
        return siyuan.call("/api/ref/getBackmentionDoc", { defID, refTreeID, keyword });
    },
    async getBacklinkDoc(defID: string, refTreeID: string, keyword: string = ""): Promise<GetBacklinkDoc> {
        return siyuan.call("/api/ref/getBacklinkDoc", { defID, refTreeID, keyword });
    },
    async getBacklink2(id: string, keyword: string = "", mentionKeyword: string = "", mentionSort: string = "3"): Promise<GetBacklink2> {
        return siyuan.call("/api/ref/getBacklink2", { id, k: keyword, mk: mentionKeyword, mSort: mentionSort });
    },
    async insertBlockAfter(data: string, previousID: string, dataType = "markdown") {
        return siyuan.call("/api/block/insertBlock", { data, dataType, previousID });
    },
    async insertBlockBefore(data: string, nextID: string, dataType = "markdown") {
        return siyuan.call("/api/block/insertBlock", { data, dataType, nextID });
    },
    async insertBlockAsChildOf(data: string, parentID: string, dataType = "markdown") {
        return siyuan.call("/api/block/insertBlock", { data, dataType, parentID });
    },
    async removeBookmarks(docID: string, keepBlockID: string) {
        const bookmark = "";
        const rows = await siyuan.sql(`select id from blocks where root_id='${docID}' and ial like '%bookmark=%'`);
        for (const row of rows) {
            const id = row["id"];
            if (keepBlockID === id) continue;
            await siyuan.setBlockAttrs(id, { bookmark });
        }
    },
    async addBookmark(id: string, bookmark: string) {
        return siyuan.setBlockAttrs(id, { bookmark });
    },
    async addRiffCards(blockIDs: Array<string>, deckID = "20230218211946-2kw8jgx") {
        return siyuan.call("/api/riff/addRiffCards", { blockIDs, deckID });
    },
    async getRiffCards(page = 1, deckID = "") {
        return siyuan.call("/api/riff/getRiffCards", { "id": deckID, page });
    },
    async getRiffDecks() {
        return siyuan.call("/api/riff/getRiffDecks", {});
    },
    async removeRiffCards(blockIDs: Array<string>, deckID = "") {
        return siyuan.call("/api/riff/removeRiffCards", { deckID, blockIDs });
    },
    async findListType(thisID: string) {
        let theUpperestListID = "";
        let theMD = "";
        let count = 500;
        while (count > 0) {
            count -= 1;
            const thisBlock = await siyuan.getRowByID(thisID);
            if (!theMD) {
                theMD = thisBlock["content"];
                if (!theMD) theMD = " ";
            }
            const thisType = thisBlock["type"];
            if (thisType === "l") {
                theUpperestListID = thisID;
            }
            else if (thisType === "d" || thisType === undefined) {
                break;
            }
            if (!thisID) break;
            thisID = thisBlock["parent_id"];
            if (!thisType) break;
        }
        return [theUpperestListID, theMD];
    },
    async checkAllBlocks(ids: string[]) {
        for (const idChunk of chunks(ids, 50)) {
            const tasks = [];
            for (const id of idChunk) {
                tasks.push(siyuan.checkBlockExist(id));
            }
            const rets = await Promise.all(tasks);
            for (const ret of rets) {
                if (!ret) return false;
            }
        }
        return true;
    },
    async deleteBlocks() {
        const startPoint = await siyuan.sqlOne("select id,root_id from blocks where content='aacc1'");
        const endPoint = await siyuan.sqlOne("select id,root_id from blocks where content='aacc2'");
        const [doc1, doc2] = [startPoint["root_id"], endPoint["root_id"]];
        if (!doc1 || !doc2 || doc1 !== doc2) {
            return "";
        }
        let doDelete = false;
        const blocks = await siyuan.getChildBlocks(doc1);
        const toDel = [];
        for (const child of blocks) {
            if (child["id"] === startPoint["id"]) {
                doDelete = true;
            }
            if (doDelete) {
                toDel.push(child["id"]);
            }
            if (child["id"] === endPoint["id"]) break;
        }
        if (!await siyuan.checkAllBlocks(toDel)) return "";
        await siyuan.safeDeleteBlocks(toDel);
        return doc1;
    },
    async moveBlocks(copy = false) {
        const startPoint = await siyuan.sqlOne("select id,root_id from blocks where content='aacc1'");
        const endPoint = await siyuan.sqlOne("select id,root_id from blocks where content='aacc2'");
        const insertPoint = await siyuan.sqlOne("select id,root_id from blocks where content='aacc3'");
        const [startDocID, endDocID] = [startPoint["root_id"], endPoint["root_id"]];
        if (!startDocID || !endDocID || startDocID !== endDocID) {
            return [];
        }
        let found = false;
        const blocks = await siyuan.getChildBlocks(startDocID);
        const ids = [];
        for (const child of blocks) {
            if (child["id"] === startPoint["id"]) {
                found = true;
                continue;
            }
            if (child["id"] === endPoint["id"]) break;
            if (found) {
                ids.push(child["id"]);
            }
        }
        if (!await siyuan.checkAllBlocks(ids)) return ["", ""];
        ids.reverse();
        const lute = NewLute();
        for (const id of ids) {
            if (copy) {
                const { dom } = await siyuan.getBlockDOM(id);
                let md = lute.BlockDOM2Md(dom);
                const list = md.trim().split("\n");
                if (list[list.length - 1].trim().startsWith("{: ")) {
                    list.pop();
                }
                md = list.join("\n");
                await siyuan.insertBlockAfter(md, insertPoint["id"]);
            } else {
                await siyuan.safeMoveBlockAfter(id, insertPoint["id"]);
            }
        }
        await siyuan.safeDeleteBlock(startPoint["id"]);
        await siyuan.safeDeleteBlock(endPoint["id"]);
        await siyuan.safeDeleteBlock(insertPoint["id"]);
        return [startDocID, insertPoint["root_id"]];
    },
    async getBlockKramdownWithoutID(id: string, newAttrs: string[] = [], prefix?: string, suffix?: string,) {
        const { kramdown } = await siyuan.getBlockKramdown(id);
        const lines: Array<string> = kramdown.split("\n");
        let attrs = lines.pop();
        if (lines.length > 0) {
            if (prefix) {
                lines[0] = prefix + lines[0];
            }
            if (suffix) {
                lines[lines.length - 1] += suffix;
            }
        }
        const IDRegexp = /id="[^"]+"/;
        const RIFFRegexp = /custom-riff-decks="[^"]+"/;
        attrs = attrs.replace(IDRegexp, "");
        attrs = attrs.replace(RIFFRegexp, "");
        if (newAttrs) {
            attrs = attrs.trim();
            attrs = attrs.slice(0, attrs.length - 1); // rm the '}'
            for (const newattr of newAttrs) {
                attrs += " " + newattr + " ";
            }
            attrs += "}";
        }
        if (attrs != "{: }") {
            lines.push(attrs);
        }
        return lines.join("\n");
    },
    async removeBrokenCards() {
        const invalidCardIDs = [];
        for (let page = 1; page < Number.MAX_SAFE_INTEGER; page++) {
            const resp = await siyuan.getRiffCards(page);
            const cards = resp["blocks"];
            if (!cards.length) break;
            for (const i in cards) {
                const card = cards[i];
                const valid = card["box"];
                if (!valid) {
                    invalidCardIDs.push(card["id"]);
                }
            }
        }
        if (invalidCardIDs.length) {
            await siyuan.removeRiffCards(invalidCardIDs);
        }
        return invalidCardIDs;
    },
    async getDocNameByBlockID(blockID: string) {
        let row = await siyuan.sqlOne(
            `select root_id from blocks where id="${blockID}"`,
        );
        if (row["root_id"]) {
            row = await siyuan.sqlOne(
                `select content from blocks where id="${row["root_id"]}"`,
            );
        }
        const docName = row["content"] ?? "";
        return docName;
    }
};

export const siyuanCache = {
    getDocNameByBlockID: createCache(siyuan.getDocNameByBlockID),
    getBlockMarkdownAndContent: createCache(siyuan.getBlockMarkdownAndContent),
    getBacklinkDoc: createCache(siyuan.getBacklinkDoc),
    getBacklink2: createCache(siyuan.getBacklink2),
    getBackmentionDoc: createCache(siyuan.getBackmentionDoc),
};

export function createCache<T extends Func>(originalFunction: T): (...args: [number, ...Parameters<T>]) => ReturnType<T> {
    const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
    return function cachedFunction(cacheTime: number, ...args: Parameters<T>): ReturnType<T> {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            const { value, timestamp } = cache.get(key);
            const currentTime = Date.now();

            if (currentTime - timestamp <= cacheTime) {
                return value;
            }
        }
        const result = originalFunction(...args);
        cache.set(key, { value: result, timestamp: Date.now() });
        return result;
    };
}

function padStart(input: string, targetLength: number, padString: string): string {
    const inputLength = input.length;
    if (inputLength >= targetLength) {
        return input;
    }
    const paddingLength = targetLength - inputLength;
    const padding = padString.repeat(Math.ceil(paddingLength / padString.length)).slice(0, paddingLength);
    return padding + input;
}

export const TypeAbbrMap: Record<BlockNodeType, string> = {
    // Block-level elements
    "NodeDocument": "d",
    "NodeHeading": "h",
    "NodeList": "l",
    "NodeListItem": "i",
    "NodeCodeBlock": "c",
    "NodeMathBlock": "m",
    "NodeTable": "t",
    "NodeBlockquote": "b",
    "NodeSuperBlock": "s",
    "NodeParagraph": "p",
    "NodeHTMLBlock": "html",
    "NodeBlockQueryEmbed": "query_embed",
    "NodeAttributeView": "av",
    "NodeKramdownBlockIAL": "ial",
    "NodeIFrame": "iframe",
    "NodeWidget": "widget",
    "NodeThematicBreak": "tb",
    "NodeVideo": "video",
    "NodeAudio": "audio",
    "NodeText": "text",
    "NodeImage": "img",
    "NodeLinkText": "link_text",
    "NodeLinkDest": "link_dest",
    "NodeTextMark": "textmark",
};
export function splitByMiddle(str: string): [string, string] {
    const middleIndex = Math.floor(str.length / 2);
    const part1 = str.substring(0, middleIndex);
    const part2 = str.substring(middleIndex);
    return [part1, part2];
}
export function keepContext(text: string, keyword: string, count: number): string {
    let parts = text.split(keyword);
    if (parts.length == 1) return text;
    {
        const newParts = [];
        newParts.push(parts[0]);
        for (let i = 1; i < parts.length - 1; i++) {
            newParts.push(...splitByMiddle(parts[i]));
        }
        newParts.push(parts[parts.length - 1]);
        parts = newParts;
    }

    for (let i = 0; i < parts.length; i++) {
        const len = parts[i].length;
        if (i % 2 == 0) {
            const start = Math.max(len - count, 0);
            if (start > 0) {
                parts[i] = ".." + parts[i].slice(start, len) + keyword;
            } else {
                parts[i] = parts[i].slice(start, len) + keyword;
            }
        } else {
            if (count < len) {
                parts[i] = parts[i].slice(0, count) + "..";
            } else {
                parts[i] = parts[i].slice(0, count);
            }
        }
    }
    return parts.join("");
}
/* {
    "alias": "",
    "box": "20220705180858-r5dh51g",
    "content": "",
    "created": "20231115194509",
    "fcontent": "",
    "hash": "19c377a",
    "hpath": "/daily note/test",
    "ial": "{: id=\"20231115194509-d03yn0d\" updated=\"20231116004755\"}",
    "id": "20231115194509-d03yn0d",
    "length": 0,
    "markdown": "---",
    "memo": "",
    "name": "",
    "parent_id": "20231102203317-gj54aex",
    "path": "/20220705180902-2x8ujrh/20231102203317-gj54aex.sy",
    "root_id": "20231102203317-gj54aex",
    "sort": 100,
    "subtype": "",
    "tag": "",
    "type": "tb",
    "updated": "20231116004755"
} */