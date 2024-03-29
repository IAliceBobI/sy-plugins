import { App, Constants, IOperation, Lute, Protyle, fetchSyncPost, openTab } from "siyuan";
import { v4 as uuid } from "uuid";
import * as gconst from "./gconst";
import * as moment from "moment-timezone";

export function moveCursor2Tail(id: string) {
    const newDIV = document.querySelector(`div[${gconst.DATA_NODE_ID}="${id}"]`);
    document.getSelection().collapse(getContenteditableElement(newDIV), 1);
}

export function extractLinksFromElement(div: HTMLElement) {
    const ids: Set<string> = new Set();
    for (const e of div.querySelectorAll(`[${gconst.DATA_TYPE}~="${gconst.BLOCK_REF}"]`)) {
        const id = e.getAttribute(gconst.DATA_ID);
        ids.add(id);
    }
    return [...ids.values()];
}

export function getRandFloat0tox(x: number) {
    return Math.random() * x;
}

export function replaceAll(str: string, find: string, replace: string): string {
    return str.replace(new RegExp(find, "g"), replace);
}

export function getRandInt0tox(x: number) {
    return Math.floor(Math.random() * x);
}

export function dom2div(dom: string) {
    const div = document.createElement("div") as HTMLElement;
    if (!dom) return div;
    div.innerHTML = dom;
    return div.firstElementChild as HTMLElement;
}

export function arrayRemove<T>(array: T[], element: T) {
    const index = array.indexOf(element);
    if (index !== -1) {
        array.splice(index, 1);
    }
    return array;
}

export function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function isCardUI(protyle: Protyle) {
    const e = protyle?.protyle?.element as HTMLElement;
    return e?.classList?.contains("card__block");
}

export function sortedMap<K, V>(map: Map<K, V>, compareFn?: (a: [K, V], b: [K, V]) => number) {
    return new Map([...map.entries()].sort(compareFn));
}

export function set_href(e: HTMLElement, id: string, txt?: string) {
    e.setAttribute(gconst.DATA_TYPE, "a");
    id = id.split("?")[0];
    e.setAttribute(gconst.BlockNodeEnum.DATA_HREF, `siyuan://blocks/${id}?focus=1`);
    if (txt) e.textContent = txt;
}

export function get_siyuan_lnk_md(id: string, text: string) {
    return `[${text}](siyuan://blocks/${id}?focus=1)`;
}

export async function cleanDiv(div: HTMLDivElement, setRef: boolean, setOrigin: boolean, context = true): Promise<[string, HTMLElement, boolean]> {
    const id = div.getAttribute(gconst.DATA_NODE_ID);

    // new ids
    div.setAttribute(gconst.DATA_NODE_ID, NewNodeID());
    div.querySelectorAll(`[${gconst.DATA_NODE_ID}]`).forEach((e: HTMLElement) => {
        e.setAttribute(gconst.DATA_NODE_ID, NewNodeID());
    });

    // rm riff marks
    div.removeAttribute(gconst.CUSTOM_RIFF_DECKS);
    div.querySelectorAll(`[${gconst.CUSTOM_RIFF_DECKS}]`).forEach((e: HTMLElement) => {
        e.removeAttribute(gconst.CUSTOM_RIFF_DECKS);
    });
    let setTheRef = false;
    const getContext = async (id: string) => {
        const parts = (await siyuan.getBlockBreadcrumb(id)).slice(0, -1)
            .filter(i => i.type != gconst.BlockNodeEnum.NODE_LIST_ITEM).map(i => i.name);
        if (parts.length > 0) {
            const file = parts[0].split("/").pop();
            parts[0] = file;
            return parts.join("::");
        }
        return id;
    };
    if (setOrigin) {
        const originID = div.getAttribute(gconst.RefIDKey) ?? "";
        if (originID) {
            const all = [
                ...div.querySelectorAll(`[${gconst.DATA_ID}="${originID}"]`),
                ...div.querySelectorAll(`[${gconst.BlockNodeEnum.DATA_HREF}="siyuan://blocks/${originID}?focus=1"]`),
            ];
            if (all.length == 0) {
                const spanOri = div.querySelector("[contenteditable=\"true\"]")?.appendChild(document.createElement("span"));
                if (spanOri) {
                    set_href(spanOri, originID, "@");
                    setTheRef = true;
                }
            } else {
                all.forEach((e: HTMLElement) => {
                    if (e.innerText == "*") {
                        const id = e.getAttribute(gconst.DATA_ID);
                        if (id) {
                            set_href(e, id, "@");
                        } else {
                            e.textContent = "@";
                        }
                    }
                });
                setTheRef = true;
            }
            if (context) {
                const path = await getContext(originID);
                if (path) {
                    div.setAttribute(gconst.ORIGIN_HPATH, path);
                }
            }
        }
    }
    if (setRef) {
        const all = [
            ...div.querySelectorAll(`[${gconst.DATA_ID}="${id}"]`),
            ...div.querySelectorAll(`[${gconst.BlockNodeEnum.DATA_HREF}="siyuan://blocks/${id}?focus=1"]`),
        ];
        if (all.length == 0) {
            const span = div.querySelector("[contenteditable=\"true\"]")?.appendChild(document.createElement("span"));
            if (span) {
                set_href(span, id, "*");
                setTheRef = true;
            }
        } else {
            setTheRef = true;
        }
        if (context) {
            const path = await getContext(id);
            if (path) {
                div.setAttribute(gconst.REF_HPATH, path);
            }
        }
    }
    return [id, div, setTheRef];
}

export async function getBlockDiv(id: string) {
    const { dom } = await siyuan.getBlockDOM(id);
    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = dom;
    tempDiv = tempDiv.firstElementChild as HTMLDivElement;
    return { div: tempDiv, id };
}

export function getCursorElement() {
    const selection = document.getSelection();
    return getSyElement(selection?.focusNode) as HTMLElement;
}

export function getID(e: Element, attrs?: string[]) {
    const s = getSyElement(e, attrs);
    if (s) {
        return s.getAttribute(gconst.DATA_NODE_ID);
    }
    return "";
}

export function getSyElement(e: Node, attrs?: string[]) {
    if (!e) return;
    if (e instanceof Element) {
        const id = e.getAttribute(gconst.DATA_NODE_ID);
        if (id) {
            if (attrs) {
                if (attrs.reduce((has, attr) => has && e.hasAttribute(attr), true)) return e;
            } else {
                return e;
            }
        }
    }
    return getSyElement(e.parentElement, attrs);
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

export function cleanText(text: string) {
    if (text) {
        text = text.replace(/\u200B/g, "")?.trim();
    }
    return text;
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
    nowts(secs = 0) {
        return timeUtil.now(secs).getTime() / 1000;
    },
    now(secs = 0) {
        const ts = new Date().getTime() + secs * 1000;
        return new Date(ts);
    },
    getYYYYMMDDHHmmssPlus0(myTimestamp: number) {
        // let myDate = moment.unix(myTimestamp).tz("America/Los_Angeles"); 
        const myDate = moment.unix(myTimestamp).utcOffset("+0000");
        return myDate.format("YYYYMMDDHHmmss");
    },
    getYYYYMMDDHHmmssPlus8(myTimestamp: number) {
        const myDate = moment.unix(myTimestamp).utcOffset("+0800");
        return myDate.format("YYYYMMDDHHmmss");
    },
    dateFormat(date: Date) {
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Month value needs +1 as it starts from 0.
        const day = date.getDate().toString().padStart(2, "0");
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");
        return year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
    },
    dateFormatDay(date: Date) {
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        return year + "-" + month + "-" + day;
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
    async copyFile(src: string, dest: string) {
        return siyuan.call("/api/file/copyFile", { src, dest });
    },
    async readDir(path: string): Promise<{ isDir: boolean, isSymlink: boolean, name: string, updated: string }[]> {
        // await utils_zZmqus5PtYRi.siyuan.readDir("/data/plugins/sy-tomato-plugin/i18n")
        return siyuan.call("/api/file/readDir", { path });
    },
    async performSync(upload = true, mobileSwitch = false) {
        return siyuan.call("/api/sync/performSync", { upload, mobileSwitch });
    },
    async performBootSync() {
        return siyuan.call("/api/sync/performBootSync", {});
    },
    async listCloudSyncDir() {
        return siyuan.call("/api/sync/listCloudSyncDir", {});
    },
    async removeFile(path: string) {
        return siyuan.call("/api/file/removeFile", { path });
    },
    async copyFile2(src: string, dest: string) {
        // await utils_zZmqus5PtYRi.siyuan.copyFile("/data/plugins/sy-tomato-plugin/i18n/empty.xmind","/data/assets/abc.xmind")
        const bs = await siyuan.getFileBinary(src);
        return siyuan.putFile(dest, bs);
    },
    async putFile(path: string, value: any) {
        let file: File;
        if (value instanceof ArrayBuffer) {
            const uint8Array = new Uint8Array(value);
            file = new File([new Blob([uint8Array])], path.split("/").pop());
        } else if (typeof value === "object") {
            file = new File([new Blob([JSON.stringify(value)], {
                type: "application/json"
            })], path.split("/").pop());
        } else {
            file = new File([new Blob([value])], path.split("/").pop());
        }
        const formData = new FormData();
        formData.append("path", path);
        formData.append("file", file);
        formData.append("isDir", "false");
        const method = "POST";
        const resp = await fetch("/api/file/putFile", {
            method,
            body: formData,
        });
        const data = await resp.json();
        if (data.code && data.code != 0) {
            console.error("code=%s %s", data.code, data.msg);
            return null;
        }
        return data.data;
    },
    async getFileBinary(path: string): Promise<ArrayBuffer> {
        try {
            const method = "POST";
            const headers = { "Content-Type": "application/json" };
            const response = await fetch("/api/file/getFile", {
                method,
                headers,
                body: JSON.stringify({ path }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const blobData = await response.blob();
            return blobData.arrayBuffer();
        } catch (error) {
            console.error("Error fetching file binary:", error);
            throw error; // re-throw the error so it can be caught by the caller, if needed  
        }
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
        try {
            const data = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(reqData),
            });
            const json = await data.json();
            if (json?.code && json?.code != 0) {
                console.warn(`p5: ${json?.code} ${json?.msg} ${JSON.stringify(reqData)}`);
                return null;
            }
            if (json?.data === undefined)
                return data;
            return json.data;
        } catch (e) {
            console.warn(e, url, reqData);
        }
    },
    async removeUnusedAsset(path: string): Promise<{ path: string }> {
        return siyuan.call("/api/asset/removeUnusedAsset", { path });
    },
    async removeUnusedAssets(): Promise<{ paths: string[] }> {
        return siyuan.call("/api/asset/removeUnusedAssets", {});
    },
    async getMissingAssets(): Promise<{ missingAssets: string[] }> {
        return siyuan.call("/api/asset/getMissingAssets", {});
    },
    async getUnusedAssets(): Promise<{ unusedAssets: string[] }> {
        return siyuan.call("/api/asset/getUnusedAssets", {});
    },
    async getDocCreateSavePath(notebookID: string): Promise<{ path: string }> {
        const notebook = notebookID;
        return siyuan.call("/api/filetree/getDocCreateSavePath", { notebook });
    },
    async getRefCreateSavePath(notebookID: string): Promise<{ path: string }> {
        const notebook = notebookID;
        return siyuan.call("/api/filetree/getRefCreateSavePath", { notebook });
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
    async sqlAsset(stmt: string): Promise<Asset[]> {
        // from assets
        return (await siyuan.call("/api/query/sql", { stmt })) ?? [];
    },
    async sqlSpan(stmt: string): Promise<Span[]> {
        // from spans
        return (await siyuan.call("/api/query/sql", { stmt })) ?? [];
    },
    async sqlRef(stmt: string): Promise<Ref[]> {
        // from refs
        return (await siyuan.call("/api/query/sql", { stmt })) ?? [];
    },
    async sqlAttr(stmt: string): Promise<Attributes[]> {
        // from attributes
        return (await siyuan.call("/api/query/sql", { stmt })) ?? [];
    },
    async sql(stmt: string): Promise<Block[]> {
        // from blocks
        return (await siyuan.call("/api/query/sql", { stmt })) ?? [];
    },
    async sqlOne(stmt: string): Promise<Block> {
        const ret = await siyuan.sql(stmt);
        if (ret.length >= 1) {
            return ret[0];
        }
        return {} as Block;
    },
    async getDocAttrs(docID: string, name: string): Promise<Attributes[]> {
        return siyuan.sqlAttr(`select * from attributes where root_id="${docID}" and name="${name}"`);
    },
    async getBlockIndex(id: string): Promise<number> {
        return await siyuan.call("/api/block/getBlockIndex", { id });
    },
    async getBlockBreadcrumb(id: string, excludeTypes: string[] = []): Promise<BreadcrumbPath[]> {
        return await siyuan.call("/api/block/getBlockBreadcrumb", { id, excludeTypes });
    },
    async setUILayout(layout: any): Promise<any> {
        return await siyuan.call("/api/system/setUILayout", { layout });
    },
    async flushTransaction(): Promise<any> {
        return await siyuan.call("/api/sqlite/flushTransaction", {});
    },
    async createDocWithMdIfNotExists(notebookID: string, path_readable: string, markdown: string, attr?: any): Promise<string> {
        return navigator.locks.request("tomato.siyuan.createDocWithMdIfNotExists", { mode: "exclusive" }, async (_lock) => {
            const row = await siyuan.sqlOne(`select id from blocks where box="${notebookID}" and hpath="${path_readable}" and type='d' limit 1`);
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
        let params: any;
        if (id) {
            params = { notebook, path, markdown, id };
        } else {
            params = { notebook, path, markdown };
        }
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
    async renameDocByID(docID: string, title: string) {
        const row = await siyuan.sqlOne(`select box,path from blocks where type='d' and id="${docID}"`);
        if (row?.box && row?.path) {
            return siyuan.renameDoc(row.box, row.path, title);
        }
    },
    async renameDoc(notebookID: string, path_not_readable: string, title: string) {
        return siyuan.call("/api/filetree/renameDoc", { notebook: notebookID, title, path: path_not_readable });
    },
    async moveDocs(fromPaths: string[], toPath: string, toNotebook: string, callback?: string) {
        if (callback)
            return siyuan.call("/api/filetree/moveDocs", { fromPaths, toPath, toNotebook, callback });
        return siyuan.call("/api/filetree/moveDocs", { fromPaths, toPath, toNotebook });
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
    async insertLocalAssets(id: string, assetPaths: string, isUpload = false): Promise<any> {
        return siyuan.call("/api/asset/insertLocalAssets", { id, assetPaths, isUpload });
    },
    async resolveAssetPath(path: string): Promise<string> {
        // get abs path in the OS.
        return siyuan.call("/api/asset/resolveAssetPath", { path });
    },
    async renameAsset(oldPath: string, newName: string): Promise<any> {
        // copy file to assets/ and then raname
        return siyuan.call("/api/asset/renameAsset", { oldPath, newName });
    },
    async getDocImageAssets(id: string): Promise<string[]> {
        // find and list images only
        return siyuan.call("/api/asset/getDocImageAssets", { id });
    },
    async transferBlockRef(fromID: string, toID: string, reloadUI = true): Promise<any> {
        return siyuan.call("/api/block/transferBlockRef", { fromID, toID, reloadUI });
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
    transbatchSetBlockAttrs(blockAttrs: { id: string, attrs: AttrType }[]) {
        return blockAttrs.map(b => {
            const op = {} as IOperation;
            op.action = "setAttrs";
            op.id = b.id;
            op.data = JSON.stringify(b.attrs);
            return op;
        });
    },
    async batchSetBlockAttrs(blockAttrs: { id: string, attrs: AttrType }[]) {
        // return siyuan.call("/api/attr/batchSetBlockAttrs", { blockAttrs });
        return siyuan.transactions(siyuan.transbatchSetBlockAttrs(blockAttrs));
    },
    async getBlockAttrs(id: string): Promise<AttrType> {
        return siyuan.call("/api/attr/getBlockAttrs", { id });
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
        return row;
    },
    async getRows(chilrenIDs: string[], selected = "*", ordered = true, ands: string[] = []): Promise<Block[]> {
        selected = selected.trim();
        if (selected != "*") {
            const s = new Set(selected.split(","));
            s.add("id");
            selected = [...s.values()].join(",");
        }
        const placeholders = chilrenIDs.map(id => `"${id}"`).join(",");
        const sqlBuilder = [];
        sqlBuilder.push(`SELECT ${selected} FROM blocks WHERE id IN (${placeholders})`);
        ands.forEach(a => sqlBuilder.push("AND " + a));
        sqlBuilder.push("limit 100000000");
        const rows = await siyuan.sql(sqlBuilder.join(" "));
        if (ordered) {
            const rowMap = rows.reduce((m, r) => {
                m.set(r.id, r);
                return m;
            }, new Map());
            return chilrenIDs.map(id => rowMap.get(id)).filter(i => i != null);
        }
        return rows;
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
    async copyStdMarkdown(id: string) {
        return siyuan.call("/api/lute/copyStdMarkdown", { id });
    },
    async getBlocksWordCount(ids: string[]): Promise<GetBlocksWordCount> {
        // if ids.length > 1, like wordCount will be the sum of blocks.
        return siyuan.call("/api/block/getBlocksWordCount", { ids });
    },
    // don't append to doc after clearAll
    async clearAll(docID: string) {
        const blocks = await siyuan.getChildBlocks(docID);
        return siyuan.deleteBlocks(blocks.map((b: any) => b["id"]));
    },
    transDeleteBlocks(ids: string[]) {
        return ids.map(id => {
            const op = {} as IOperation;
            op.action = "delete";
            op.id = id;
            return op;
        });
    },
    async deleteBlock(id: string) {
        return siyuan.call("/api/block/deleteBlock", { id });
    },
    async deleteBlocks(ids: string[]) {
        return siyuan.transactions(siyuan.transDeleteBlocks(ids));
    },
    transMoveBlocksAfter(ids: string[], previousID: string) {
        return ids.slice().reverse().map(id => {
            const op = {} as IOperation;
            op.action = "move";
            op.id = id;
            op.previousID = previousID;
            return op;
        });
    },
    async moveBlocksAfter(ids: string[], previousID: string) {
        return siyuan.transactions(siyuan.transMoveBlocksAfter(ids, previousID));
    },
    async moveBlockAfter(id: string, previousID: string) {
        return siyuan.call("/api/block/moveBlock", { id, previousID });
    },
    async moveBlockAsChild(id: string, parentID: string) {
        return siyuan.call("/api/block/moveBlock", { id, parentID });
    },
    transMoveBlocksAsChild(ids: string[], parentID: string) {
        return ids.slice().reverse().map(id => {
            const op = {} as IOperation;
            op.action = "move";
            op.id = id;
            op.parentID = parentID;
            return op;
        });
    },
    async moveBlocksAsChild(ids: string[], parentID: string) {
        return siyuan.transactions(siyuan.transMoveBlocksAsChild(ids, parentID));
    },
    async getTailChildBlocks(id: string, n: number): Promise<[{ id: string, type: string }]> {
        return siyuan.call("/api/block/getTailChildBlocks", { id, n });
    },
    async getBlockKramdown(id: string): Promise<GetBlockKramdown> {
        return siyuan.call("/api/block/getBlockKramdown", { id });
    },
    async refreshVirtualBlockRef() {
        return siyuan.call("/api/setting/refreshVirtualBlockRef", {});
    },
    async safeUpdateBlock(id: string, data: string, dataType = "markdown") {
        if (await siyuan.checkBlockExist(id))
            return siyuan.call("/api/block/updateBlock", { id, data, dataType });
    },
    transUpdateBlocks(ops: { id: string, domStr: string }[]) {
        ops = ops.filter(op => !!op.id);
        if (!ops.length) return;
        return ops.map(({ id, domStr }) => {
            const op = {} as IOperation;
            op.action = "update"; // dom
            op.id = id;
            op.data = domStr;
            return op;
        });
    },
    async updateBlocks(ops: { id: string, domStr: string }[]) {
        return siyuan.transactions(siyuan.transUpdateBlocks(ops));
    },
    async getBlockMarkdownAndContent(id: string): Promise<GetBlockMarkdownAndContent> {
        const row = await siyuan.sqlOne(`select markdown, content from blocks where id="${id}"`);
        return { markdown: row?.markdown ?? "", content: row?.content ?? "", id };
    },
    async transactions(doOperations: IOperation[], undoOperations: IOperation[] = []) {
        if (doOperations.length == 0 && undoOperations.length == 0) return;
        return siyuan.call("/api/transactions", {
            session: Constants.SIYUAN_APPID,
            app: Constants.SIYUAN_APPID,
            transactions: [{
                doOperations, undoOperations
            }],
            reqId: new Date().getTime(),
        });
    },
    async getHeadingDeleteTransaction(id: string): Promise<{ timestamp: number, doOperations: IOperation[], undoOperations: IOperation[] }> {
        return siyuan.call("/api/block/getHeadingDeleteTransaction", { id });
    },
    async getHeadingChildrenIDs(id: string): Promise<string[]> {
        return siyuan.call("/api/block/getHeadingChildrenIDs", { id });
    },
    async getHeadingChildrenDOM(id: string) {
        return siyuan.call("/api/block/getHeadingChildrenDOM", { id });
    },
    async listDocsByPath(notebookID: string, notReadablePath: string, sort = 15): Promise<RetListDocsByPath> {
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
    transInsertBlocksAsChildOf(domStrs: string[], parentID: string) {
        return domStrs.slice().reverse().map(data => {
            const op = {} as IOperation;
            op.action = "insert";
            op.data = data;
            op.parentID = parentID;
            return op;
        });
    },
    async insertBlocksAsChildOf(ids: string[], parentID: string) {
        return siyuan.transactions(siyuan.transInsertBlocksAsChildOf(ids, parentID));
    },
    transAppendBlocks(domStrs: string[], parentID: string) {
        return domStrs.map(data => {
            const op = {} as IOperation;
            op.action = "append";
            op.data = data;
            op.parentID = parentID;
            return op;
        });
    },
    async appendBlocks(domStrs: string[], parentID: string) {
        return siyuan.transactions(siyuan.transAppendBlocks(domStrs, parentID));
    },
    async appendBlock(data: string, parentID: string, dataType = "markdown") {
        return siyuan.call("/api/block/appendBlock", { data, dataType, parentID });
    },
    async getBlockInfo(id: string): Promise<GetBlockInfo> {
        return siyuan.call("/api/block/getBlockInfo", { id });
    },
    async getDocInfo(id: string): Promise<GetDocInfo> {
        return siyuan.call("/api/block/getDocInfo", { id });
    },
    async removeBookmarks(docID: string, keepBlockID: string) {
        const bookmark = "";
        const rows = await siyuan.sql(`select id from blocks where root_id='${docID}' and ial like '%bookmark=%' limit 1000`);
        for (const row of rows) {
            const id = row["id"];
            if (keepBlockID === id) continue;
            await siyuan.setBlockAttrs(id, { bookmark });
        }
    },
    async addBookmark(id: string, bookmark: string) {
        return siyuan.setBlockAttrs(id, { bookmark });
    },
    async getTreeRiffCardsAll(id: string): Promise<GetCardRetBlock[]> {
        const total: GetCardRetBlock[] = [];
        for (let i = 1; ; i++) {
            const ret = await siyuan.getTreeRiffCards(id, i);
            if (!ret?.blocks) break;
            total.push(...ret.blocks);
            if (total.length >= ret.total) break;
            if (i >= ret.pageCount + 10) break;
        }
        return total;
    },
    async getTreeRiffCards(id: string, page: number): Promise<GetCardRet> {
        return siyuan.call("/api/riff/getTreeRiffCards", { id, page });
    },
    async addRiffCards(blockIDs: Array<string>, deckID = "20230218211946-2kw8jgx"): Promise<AddRiffCards> {
        return siyuan.call("/api/riff/addRiffCards", { blockIDs, deckID });
    },
    async skipReviewRiffCard(cardID: string, deckID = "20230218211946-2kw8jgx") {
        return siyuan.call("/api/riff/skipReviewRiffCard", { cardID, deckID });
    },
    async reviewRiffCard(cardID: string, rating: number, deckID = "20230218211946-2kw8jgx") {
        return siyuan.call("/api/riff/reviewRiffCard", { cardID, rating, deckID });
    },
    async reviewRiffCardByBlockID(blockID: string, rating: number, deckID = "20230218211946-2kw8jgx") {
        const all = await siyuan.getRiffCardsByBlockIDs([blockID]);
        if (all.has(blockID)) {
            const card = all.get(blockID).slice().pop();
            if (card) {
                return siyuan.reviewRiffCard(card.riffCardID, rating, deckID);
            }
        }
    },
    async getRiffCards(page = 1, pageSize = 1000, deckID = ""): Promise<GetCardRet> {
        return siyuan.call("/api/riff/getRiffCards", { "id": deckID, page, pageSize });
    },
    async getRiffCardsByBlockIDs(blockIDs: string[]) {
        const ret: GetCardRet = await siyuan.call("/api/riff/getRiffCardsByBlockIDs", { blockIDs });
        return ret?.blocks?.reduce((m, b) => {
            const cs = m.get(b.id) ?? [];
            cs.push(b);
            m.set(b.id, cs);
            return m;
        }, new Map<string, GetCardRetBlock[]>());
    },
    async batchSetRiffCardsDueTimeByBlockID(blockDues: { id: string, due: string }[]) {
        const all = await siyuan.getRiffCardsByBlockIDs(blockDues.map(c => c.id));
        const cardDues = blockDues.map(block => {
            return all.get(block.id)?.map(card => {
                return { id: card.riffCardID, due: block.due };
            });
        }).filter(c => !!c).flat();
        return siyuan.batchSetRiffCardsDueTimeByCardID(cardDues);
    },
    async batchSetRiffCardsDueTimeByCardID(cardDues: { id: string, due: string }[]) {
        // "due": "20240224214412"
        return siyuan.call("/api/riff/batchSetRiffCardsDueTime", { cardDues });
    },
    async getRiffCardsAll(pageSize = 1000) {
        const total: Map<string, GetCardRetBlock[]> = new Map();
        // let j = 0;
        for (let i = 1; ; i++) {
            const ret = await siyuan.getRiffCards(i, pageSize);
            if (!ret?.blocks) break;
            ret.blocks.forEach(i => { // 存在一个块多卡。
                const a = total.get(i.id) ?? [];
                a.push(i);
                total.set(i.id, a);
            });
            // j+=ret.blocks.length;
            // xx.log(total.size, j,ret.total)
            if (total.size >= ret.total) break;
            if (i >= ret.pageCount + 1) break;
        }
        return total;
    },
    async getRiffDueCards(deckID = ""): Promise<GetDueCardRet> {
        return siyuan.call("/api/riff/getRiffDueCards", { deckID });
    },
    async getRiffDecks() {
        return siyuan.call("/api/riff/getRiffDecks", {});
    },
    async removeRiffCards(blockIDs: Array<string>, deckID = "") {
        if (!blockIDs || blockIDs.length == 0) return null;
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
    // async checkAllBlocks(ids: string[]) {
    //     for (const idChunk of chunks(ids, 50)) {
    //         const tasks = [];
    //         for (const id of idChunk) {
    //             tasks.push(siyuan.checkBlockExist(id));
    //         }
    //         const rets = await Promise.all(tasks);
    //         for (const ret of rets) {
    //             if (!ret) return false;
    //         }
    //     }
    //     return true;
    // },
    async deleteBlocksUtil() {
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
        // if (!await siyuan.checkAllBlocks(toDel)) return "";
        await siyuan.deleteBlocks(toDel);
        return doc1;
    },
    async moveBlocksUtil(copy = false) {
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
        // if (!await siyuan.checkAllBlocks(ids)) return ["", ""];
        const lute = NewLute();
        const mds = [];
        if (copy) {
            for (const id of ids) {
                const { dom } = await siyuan.getBlockDOM(id);
                let tempDiv = document.createElement("div") as HTMLDivElement;
                tempDiv.innerHTML = dom;
                tempDiv = tempDiv.firstElementChild as HTMLDivElement;
                await cleanDiv(tempDiv, false, false);
                mds.push(lute.BlockDOM2Md(tempDiv.outerHTML));
            }
            if (mds.length > 0) await siyuan.insertBlockAfter(mds.join("\n\n"), insertPoint["id"]);
        } else {
            await siyuan.moveBlocksAfter(ids, insertPoint["id"]);
        }
        await siyuan.deleteBlocks([startPoint["id"], endPoint["id"], insertPoint["id"]]);
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
        return navigator.locks.request("removeBrokenCardsLock", { ifAvailable: true }, async (lock) => {
            if (!lock) return;
            siyuan.pushMsg("正在确认无效闪卡，请耐心等待……", 1000);
            const invalidCardIDs = [];
            for (const card of [...(await siyuan.getRiffCardsAll()).values()].flat()) {
                if (!card.box) {
                    invalidCardIDs.push(card.id);
                }
            }
            if (invalidCardIDs.length > 0) {
                await siyuan.removeRiffCards(invalidCardIDs);
            }
            return invalidCardIDs;
        });
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
    getBlockDOM: createCache(siyuan.getBlockDOM),
    getBlockDiv: createCache(getBlockDiv),
    getRiffCardsAll: createCache(siyuan.getRiffCardsAll),
    getTreeRiffCardsAll: createCache(siyuan.getTreeRiffCardsAll),
    getRiffCardsByBlockIDs: createCache(siyuan.getRiffCardsByBlockIDs),
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
