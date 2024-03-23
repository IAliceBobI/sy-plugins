import { BLOCK_REF, CUSTOM_RIFF_DECKS, DATA_ID, DATA_NODE_ID, DATA_SUBTYPE, DATA_TYPE } from "./gconst";
import { getContenteditableElement, siyuan, siyuanCache } from "./utils";

export async function moveAllContentToDoc(tobeRmDocID: string, destDocID: string) {
    const ids = (await siyuan.getChildBlocks(tobeRmDocID)).map(b => b.id);
    await siyuan.moveBlocksAsChild(ids, destDocID);
}

export async function moveAllContentHere(tobeRmDocID: string, blockID: string) {
    const ids = (await siyuan.getChildBlocks(tobeRmDocID)).map(b => b.id);
    await siyuan.moveBlocksAfter(ids, blockID);
    return ids;
}

export async function mergeDocs(doc1: string, hereID: string) {
    if (!doc1 || !hereID) return;
    const doc2 = await siyuan.getDocIDByBlockID(hereID);
    doc1 = await siyuan.getDocIDByBlockID(doc1);
    if (!doc1 || !doc2) return;

    const newAttrs = await mergeMetaIntoDoc2(doc1, doc2);
    const oldAttrs = setDefaultAttr({} as any);
    oldAttrs.title = "moved";
    await siyuan.setBlockAttrs(doc1, oldAttrs); // clean doc1
    await siyuan.setBlockAttrs(doc2, newAttrs); // fulfill doc2
    await moveAllContentHere(doc1, hereID);
    await siyuan.flushTransaction();
    await siyuan.pushMsg("正在转移引用……");
    await siyuan.transferBlockRef(doc1, doc2, false);
    await siyuan.pushMsg("正在尝试删除闪卡……");
    await siyuan.removeRiffCards([doc1]);
    await siyuan.pushMsg("正在删除老文件……");
    await siyuan.removeDocByID(doc1);
    window.location.reload();
}

async function mergeMetaIntoDoc2(doc1: string, doc2: string) {
    const newAttrs = setDefaultAttr(await siyuan.getBlockAttrs(doc2));
    const attrs = setDefaultAttr(await siyuan.getBlockAttrs(doc1));
    delete newAttrs.updated;
    delete newAttrs.id;
    delete newAttrs.scroll;

    const alias = [...newAttrs.alias.split(","), ...attrs.alias.split(","), attrs.name, attrs.title];
    newAttrs.alias = alias.filter(i => i.length > 0).join(",");
    if (!newAttrs.bookmark) {
        newAttrs.bookmark = attrs.bookmark;
    }
    if (!newAttrs.memo) {
        newAttrs.memo = attrs.memo;
    } else {
        if (attrs.memo) {
            newAttrs.memo += "；" + attrs.memo;
        }
    }

    for (const key in attrs) {
        if (key.startsWith("custom-")) {
            if (key == CUSTOM_RIFF_DECKS) continue;
            if (!newAttrs[key]) {
                newAttrs[key] = attrs[key];
            }
        }
    }
    return newAttrs;
}

function setDefaultAttr(attrs: AttrType) {
    if (!attrs.alias) attrs.alias = "";
    if (!attrs.name) attrs.name = "";
    if (!attrs.title) attrs.title = "";
    if (!attrs.memo) attrs.memo = "";
    if (!attrs.bookmark) attrs.bookmark = "";
    return attrs;
}

export async function createRefDoc(notebookId: string, name: string, add2card = false) {
    const row = await siyuan.sqlOne(`select id from blocks where type='d' and content='${name}' limit 1`);
    if (row?.id) return row.id;
    const { path } = await siyuan.getRefCreateSavePath(notebookId);
    const id = await siyuanCache.createDocWithMdIfNotExists(5000, notebookId, path + name, "");
    if (add2card) {
        await siyuan.addRiffCards([id]);
    }
    return id;
}

export async function item2ref(boxID: string, elements: HTMLElement[], add2card = false) {
    const ops = [];
    for (const e of elements) {
        const id = e?.getAttribute(DATA_NODE_ID);
        const edit = getContenteditableElement(e);
        if (!id || !edit?.textContent) continue;
        const nodes = [...edit.childNodes]; // avoiding dead looping
        let i = 0;
        for (const t of nodes) {
            if (t.nodeType != 3) continue;  // text node
            const parts = t.textContent.split(/##/g, 2);
            let inserted = false;
            for (const item of parts[0].split(/[ 　]/g)) {
                if (!item) continue;
                const span = document.createElement("span") as HTMLElement;
                span.setAttribute(DATA_TYPE, BLOCK_REF);
                span.setAttribute(DATA_SUBTYPE, "d");
                const newDocID = await createRefDoc(boxID, item, add2card);
                span.setAttribute(DATA_ID, newDocID);
                span.textContent = item;
                if (i++ > 0) t.parentElement.insertBefore(document.createTextNode(" "), t);
                t.parentElement.insertBefore(span, t);
                inserted = true;
            }
            if (inserted) {
                if (parts.length > 1) {
                    let txt = parts.slice(1).join("").trim();
                    if (txt) {
                        txt = "## " + txt;
                        t.parentElement.insertBefore(document.createTextNode(txt), t);
                    }
                }
                t.parentNode.removeChild(t);
            }
        }
        ops.push(...siyuan.transUpdateBlocks([{ id, domStr: e.outerHTML }]));
    }
    await siyuan.transactions(ops);
}

export function quotationMark(txt: string) {
    const buffer: string[] = [];
    let cOne = 0;
    let cTwo = 0;
    const one = () => {
        if (cOne++ % 2 === 0) return "‘";
        return "’";
    };
    const two = () => {
        if (cTwo++ % 2 === 0) return "“";
        return "”";
    };
    for (const c of txt) {
        if (c === "'") {
            buffer.push(one());
        } else if (c === '"') {
            buffer.push(two());
        } else {
            buffer.push(c);
        }
    }
    return buffer.join("");
}