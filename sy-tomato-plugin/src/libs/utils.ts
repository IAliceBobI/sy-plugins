import { App, Constants, IOperation, Lute, fetchSyncPost, openTab } from "siyuan";
import { v4 as uuid } from "uuid";
import * as gconst from "./gconst";
import { zipAnyArrays } from "./functional";

export function cleanDiv(div: HTMLDivElement, setRef: boolean): [string, HTMLElement, boolean] {
    const id = div.getAttribute(gconst.DATA_NODE_ID);

    // rm ids
    div.setAttribute(gconst.DATA_NODE_ID, NewNodeID());
    div.querySelectorAll(`[${gconst.DATA_NODE_ID}]`).forEach((e: HTMLElement) => {
        e.setAttribute(gconst.DATA_NODE_ID, NewNodeID());
    });

    // rm riff marks
    div.removeAttribute(gconst.CUSTOM_RIFF_DECKS);
    div.querySelectorAll(`[${gconst.CUSTOM_RIFF_DECKS}]`).forEach((e: HTMLElement) => {
        e.removeAttribute(gconst.CUSTOM_RIFF_DECKS);
    });

    if (setRef) {
        let setTheRef = false;
        const originID = div.getAttribute(gconst.RefIDKey) ?? "";
        if (originID) {
            const all = div.querySelectorAll(`[${gconst.DATA_ID}="${originID}"]`) ?? [];
            if (all.length == 0) {
                const spanOri = div.querySelector("[contenteditable=\"true\"]")?.appendChild(document.createElement("span"));
                if (spanOri) {
                    spanOri.setAttribute(gconst.DATA_TYPE, gconst.BlockNodeEnum.BLOCK_REF);
                    spanOri.setAttribute(gconst.DATA_SUBTYPE, "s");
                    spanOri.setAttribute(gconst.DATA_ID, originID);
                    spanOri.innerText = "@";
                    setTheRef = true;
                }
            } else {
                all.forEach((e: HTMLElement) => {
                    if (e.innerText == "*") e.innerText = "@";
                });
                setTheRef = true;
            }
        }
        {
            const all = div.querySelectorAll(`[${gconst.DATA_ID}="${id}"]`) ?? [];
            if (all.length == 0) {
                const span = div.querySelector("[contenteditable=\"true\"]")?.appendChild(document.createElement("span"));
                if (span) {
                    span.setAttribute(gconst.DATA_TYPE, gconst.BlockNodeEnum.BLOCK_REF);
                    span.setAttribute(gconst.DATA_SUBTYPE, "s");
                    span.setAttribute(gconst.DATA_ID, id);
                    span.innerText = "*";
                    setTheRef = true;
                }
            } else {
                setTheRef = true;
            }
        }
        if (setTheRef) return [id, div, true];
    }
    return [id, div, false];
}

export function tryAddRef2Div(div: HTMLDivElement, id: string): HTMLDivElement {
    if (id) {
        for (const e of div.querySelectorAll(`[${gconst.DATA_TYPE}~="${gconst.BLOCK_REF}"]`)) {
            if (e.textContent.trim() == "*") {
                return div;
            }
        }
        const span = div.querySelector("[contenteditable=\"true\"]")?.appendChild(document.createElement("span"));
        if (span) {
            span.setAttribute(gconst.DATA_TYPE, gconst.BlockNodeEnum.BLOCK_REF);
            span.setAttribute(gconst.DATA_SUBTYPE, "s");
            span.setAttribute(gconst.DATA_ID, id);
            span.innerText = "*";
        }
    }
    return div;
}

export async function getBlockDiv(id: string) {
    const { dom } = await siyuan.getBlockDOM(id);
    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = dom;
    tempDiv = tempDiv.firstElementChild as HTMLDivElement;
    return { div: tempDiv, id };
}

export function getID(e: Element) {
    const s = getSyElement(e);
    if (s) {
        return s.getAttribute(gconst.DATA_NODE_ID);
    }
    return "";
}

export function getSyElement(e: Node) {
    if (!e) return;
    if (e instanceof Element) {
        const id = e.getAttribute(gconst.DATA_NODE_ID);
        if (id) return e;
    }
    return getSyElement(e.parentElement);
}

export const getContenteditableElement = (element: Element) => {
    if (!element || (element.getAttribute("contenteditable") === "true") && !element.classList.contains("protyle-wysiwyg")) {
        return element;
    }
    return element.querySelector('[contenteditable="true"]');
};

export async function closeTab(app: App, noteID: string) {
    const tab: any = openTab({ app, doc: { id: noteID } });
    tab.then((tab: any) => tab.close());
}

export function styleColor(bgcolor: string, color: string) {
    return `<style>button{display: inline-block; padding: 10px 20px; background-color: ${bgcolor}; color: ${color}; text-align: center; text-decoration: none; font-size: 16px; border: none; border-radius: 4px; cursor: pointer;}button.large { padding: 12px 24px; font-size: 24px; }button.small { padding: 8px 16px; font-size: 14px; }</style>`;
}

export function extractLinks(txt: string) {
    const RefRegex = /\(\(([0-9\-a-z]{22}) (("[^"]*?")|('[^']*?'))\)\)/g;
    const ids: string[] = [];
    const links: string[] = [];
    const idLnks: { id: string, txt: string }[] = [];
    let match: any;
    do {
        match = RefRegex.exec(txt) ?? [];
        const id = match[1] ?? "";
        if (id) {
            ids.push(id);
            links.push(match[0]);
            idLnks.push({ id, txt: match[2]?.replace(/['"]/g, "") ?? "" });
        }
    } while (match.length > 0);
    return { ids, links, idLnks };
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

export function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export function isBoolean(value: any): boolean {
    return typeof value === "boolean";
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
        const txt = await data.text();
        try {
            return JSON.parse(txt);
        } catch {
            return txt;
        }
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
    async lsNotebooks(closed?: boolean) {
        const resp = await siyuan.call("/api/notebook/lsNotebooks", {});
        if (closed === null || closed === undefined) {
            return resp["notebooks"];
        }
        const l = [];
        for (const book of resp["notebooks"]) {
            if (book.closed === closed) {
                l.push(book.id);
            }
        }
        return l;
    },
    async sql(stmt: string): Promise<Block[]> {
        return (await siyuan.call("/api/query/sql", { stmt })) ?? [];
    },
    async sqlOne(stmt: string): Promise<Block> {
        const ret = await siyuan.sql(stmt);
        if (ret.length >= 1) {
            return ret[0];
        }
        return {} as Block;
    },
    async getBlockIndex(id: string): Promise<number> {
        return await siyuan.call("/api/block/getBlockIndex", { id });
    },
    async setUILayout(layout: any): Promise<any> {
        return await siyuan.call("/api/system/setUILayout", { layout });
    },
    async flushTransaction(): Promise<any> {
        return await siyuan.call("/api/sqlite/flushTransaction", {});
    },
    async createDocWithMdIfNotExists(notebookID: string, path_readable: string, markdown: string, attr?: any): Promise<string> {
        return navigator.locks.request("tomato.siyuan.createDocWithMdIfNotExists", { mode: "exclusive" }, async (_lock) => {
            await siyuan.flushTransaction();
            const row = await siyuan.sqlOne(`select id from blocks where hpath="${path_readable}" and type='d' limit 1`);
            const docID = row?.id ?? "";
            if (!docID) {
                return siyuan.createDocWithMd(notebookID, path_readable, markdown, "", attr);
            }
            return docID;
        });
    },
    async createDocWithMd(notebookID: string, path_readable: string, markdown: string, id = "", attr?: any) {
        const notebook = notebookID;
        const path = path_readable;
        const params = { notebook, path, markdown, id };
        if (!id) delete params["id"];
        id = await siyuan.call("/api/filetree/createDocWithMd", params);
        if (attr) await siyuan.setBlockAttrs(id, attr);
        return id;
    },
    async getDocRowByBlockID(id: string) {
        return siyuan.sqlOne(`select * from blocks where id in (select root_id from blocks where id="${id}") limit 1`);
    },
    async removeDoc(notebookID: string, path_not_readable: string) {
        return siyuan.call("/api/filetree/removeDoc", { notebook: notebookID, path: path_not_readable });
    },
    async renameDoc(notebookID: string, path_not_readable: string, title: string) {
        return siyuan.call("/api/filetree/renameDoc", { notebook: notebookID, title, path: path_not_readable });
    },
    async moveDocs(fromPaths: string[], toPath: string, toNotebook: string, callback?: string) {
        return siyuan.call("/api/filetree/moveDocs", { fromPaths, toPath, toNotebook, callback });
    },
    async duplicateDoc(id: string): Promise<{ "id": string, "notebook": string, "path": string, "hPath": string }> {
        return siyuan.call("/api/filetree/duplicateDoc", { id });
    },
    async removeDocByID(docID: string) {
        let count = 10;
        while (count-- > 0) {
            const row = await this.sqlOne(`select box, path from blocks where id="${docID}" and type="d"`);
            const box = row?.box ?? "";
            const path = row?.path ?? "";
            if (box && path) {
                return siyuan.removeDoc(box, path);
            }
            await sleep(1000);
        }
        return {};
    },
    async transferBlockRef(fromID: string, toID: string): Promise<any> {
        return siyuan.call("/api/block/transferBlockRef", { fromID, toID });
    },
    async createDailyNote(notebook: string): Promise<{ id: string }> {
        return siyuan.call("/api/filetree/createDailyNote", { notebook });
    },
    async checkBlockExist(id: string): Promise<boolean> {
        return siyuan.call("/api/block/checkBlockExist", { id });
    },
    async getBlockDOM(id: string): Promise<{ dom: string, id: string }> {
        return siyuan.call("/api/block/getBlockDOM", { id });
    },
    async setBlockAttrs(id: string, attrs: any) {
        return siyuan.call("/api/attr/setBlockAttrs", { id, attrs });
    },
    async getBlockAttrs(id: string): Promise<AttrType> {
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
    async getBlocksWordCount(ids: string[]): Promise<GetBlocksWordCount> {
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
    async getTailChildBlocks(id: string, n: number): Promise<[{ id: string, type: string }]> {
        return siyuan.call("/api/block/getTailChildBlocks", { id, n });
    },
    async getBlockKramdown(id: string): Promise<GetBlockKramdown> {
        return siyuan.call("/api/block/getBlockKramdown", { id });
    },
    async safeUpdateBlock(id: string, data: string, dataType = "markdown") {
        if (await siyuan.checkBlockExist(id))
            return siyuan.call("/api/block/updateBlock", { id, data, dataType });
    },
    async getBlockMarkdownAndContent(id: string): Promise<GetBlockMarkdownAndContent> {
        const row = await siyuan.sqlOne(`select markdown, content from blocks where id="${id}"`);
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
    async getRefIDs(id: string) {
        return siyuan.call("/api/block/getRefIDs", { id });
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
    async appendBlock(data: string, parentID: string, dataType = "markdown") {
        return siyuan.call("/api/block/appendBlock", { data, dataType, parentID });
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
    async updateEmbedBlock(id: string, content: string) {
        return siyuan.call("/api/search/updateEmbedBlock", { id, content });
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
        const lute = NewLute();
        const mds = [];
        if (copy) {
            for (const id of ids) {
                const { dom } = await siyuan.getBlockDOM(id);
                let tempDiv = document.createElement("div") as HTMLDivElement;
                tempDiv.innerHTML = dom;
                tempDiv = tempDiv.firstElementChild as HTMLDivElement;
                cleanDiv(tempDiv, false);
                mds.push(lute.BlockDOM2Md(tempDiv.outerHTML));
            }
            if (mds.length > 0) await siyuan.insertBlockAfter(mds.join("\n\n"), insertPoint["id"]);
        } else {
            for (const id of ids.reverse()) {
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
        const handle = setInterval(() => {
            siyuan.pushMsg("正在确认无效闪卡，请耐心等待……", 2000);
        }, 2400);
        try {
            let invalidCardIDs = [];
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
            invalidCardIDs = zipAnyArrays(
                await Promise.all(invalidCardIDs.map((card) => siyuan.checkBlockExist(card))),
                invalidCardIDs,
            ).filter(e => !e[0]).map(e => e[1]);
            if (invalidCardIDs.length > 0) {
                await siyuan.removeRiffCards(invalidCardIDs);
            }
            return invalidCardIDs;
        } finally {
            clearInterval(handle);
        }
    },
    async getDocNameByBlockID(blockID: string) {
        let row = await siyuan.sqlOne(
            `select root_id from blocks where id="${blockID}"`,
        );
        if (row?.root_id) {
            row = await siyuan.sqlOne(
                `select content from blocks where id="${row.root_id}"`,
            );
            if (row?.content) {
                return row.content;
            }
        }
        return "";
    }
};

export const siyuanCache = {
    getDocNameByBlockID: createCache(siyuan.getDocNameByBlockID),
    getBlockMarkdownAndContent: createCache(siyuan.getBlockMarkdownAndContent),
    getBlockKramdown: createCache(siyuan.getBlockKramdown),
    getBacklinkDoc: createCache(siyuan.getBacklinkDoc),
    getBacklink2: createCache(siyuan.getBacklink2),
    getBackmentionDoc: createCache(siyuan.getBackmentionDoc),
    getChildBlocks: createCache(siyuan.getChildBlocks),
    getTailChildBlocks: createCache(siyuan.getTailChildBlocks),
    createDocWithMdIfNotExists: createCache(siyuan.createDocWithMdIfNotExists),
    sqlOne: createCache(siyuan.sqlOne),
    sql: createCache(siyuan.sql),
    getBlockAttrs: createCache(siyuan.getBlockAttrs),
};

export function createCache
    <T extends Func, R extends Awaited<ReturnType<T>>, P extends Parameters<T>>
    (originalFunction: T): (...args: [number, ...P]) => Promise<R> {
    const cache = new Map<string, { value: R; timestamp: number }>();
    return async function cachedFunction(cacheTime: number, ...args: P): Promise<R> {
        const currentTime = Date.now();
        for (const [k, v] of cache.entries()) {
            if (currentTime - v.timestamp > cacheTime) {
                cache.delete(k);
            }
        }

        const key = JSON.stringify(args);
        if (cache.has(key)) {
            const { value } = cache.get(key);
            return value;
        }

        const result: R = await originalFunction(...args);
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

// export const TypeAbbrMap: Record<BlockNodeType, string> = {
//     // Block-level elements
//     "NodeDocument": "d",
//     "NodeHeading": "h",
//     "NodeList": "l",
//     "NodeListItem": "i",
//     "NodeCodeBlock": "c",
//     "NodeMathBlock": "m",
//     "NodeTable": "t",
//     "NodeBlockquote": "b",
//     "NodeSuperBlock": "s",
//     "NodeParagraph": "p",
//     "NodeHTMLBlock": "html",
//     "NodeBlockQueryEmbed": "query_embed",
//     "NodeAttributeView": "av",
//     "NodeKramdownBlockIAL": "ial",
//     "NodeIFrame": "iframe",
//     "NodeWidget": "widget",
//     "NodeThematicBreak": "tb",
//     "NodeVideo": "video",
//     "NodeAudio": "audio",
//     "NodeText": "text",
//     "NodeImage": "img",
//     "NodeLinkText": "link_text",
//     "NodeLinkDest": "link_dest",
//     "NodeTextMark": "textmark",
// };