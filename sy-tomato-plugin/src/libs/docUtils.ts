import { CUSTOM_RIFF_DECKS } from "./gconst";
import { siyuan, siyuanCache } from "./utils";

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