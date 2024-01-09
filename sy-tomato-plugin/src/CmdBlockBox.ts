import { Plugin, Protyle } from "siyuan";
import "./index.scss";
import { getSyElement, siyuan } from "./libs/utils";
import { BLOCK_REF, DATA_ID, DATA_TYPE } from "./libs/gconst";

const MERGEDOC = "合并两个文档";
const BLINKCLASS = "tomato-cmd-box";

class CmdBlockBox {
    private plugin: Plugin;

    async onload(plugin: Plugin) {
        this.plugin = plugin;

        this.plugin.protyleSlash = [{
            filter: [MERGEDOC, "mergedoc", "hbwd", "hblgwd"],
            html: `<div class="b3-list-item__first"><span class="b3-list-item__meta">📄+📄=📃</span><span class="b3-list-item__text">${MERGEDOC}</span></div>`,
            id: "insertEmoji",
            async callback(protyle: Protyle) {
                const { blockDiv, idsInContent } = getBlockAndInnerIDs(protyle);
                if (idsInContent.length == 2) {
                    const newAttrs = await mergeIntoDoc2(idsInContent[0], idsInContent[1]);
                    const oldAttrs = setDefaultAttr({} as any);
                    oldAttrs.title = "moved"
                    await siyuan.setBlockAttrs(idsInContent[0], oldAttrs);
                    await siyuan.setBlockAttrs(idsInContent[1], newAttrs);
                    await moveAllContentToDoc2(protyle, idsInContent[0], idsInContent[1]);
                    await siyuan.flushTransaction();
                    await siyuan.transferBlockRef(idsInContent[0], idsInContent[1]);
                    // await siyuan.removeDocByID(idsInContent[0]);
                } else {
                    const txt = `请分别粘贴两个文档的引用大致于括号中央，再用'/'触发一次此功能。
对文档1的引用将转移到文档2，
文档1（              ） --> 文档2（              ），
文档1的名字作为文档2的别名，文档1的内容转移到文档2，最后删除文档1。`;
                    insertText(blockDiv, txt, protyle);
                }
            }
        }];
    }

    blockIconEvent(_detail: any) {
        if (!this.plugin) return;
    }
}

export const cmdBlockBox = new CmdBlockBox();

async function moveAllContentToDoc2(protyle: Protyle, doc1: string, doc2: string) {
    const doms = await Promise.all((await siyuan.getChildBlocks(doc1)).map(b => siyuan.getBlockDOM(b.id)));
    for (const { dom } of doms) {
        await siyuan.appendBlock(protyle.protyle.lute.BlockDOM2Md(dom), doc2);
    }
    await siyuan.safeDeleteBlocks(doms.map(d => d.id));
    // for (const blockID of (await siyuan.getChildBlocks(doc1)).reverse()) {
    //     await siyuan.safeMoveBlockToParent(blockID.id, doc2);
    // }
}

async function mergeIntoDoc2(doc1: string, doc2: string) {
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

function getBlockAndInnerIDs(protyle: Protyle) {
    const range = protyle.getRange(protyle.protyle.element);
    const blockDiv = getSyElement(range.commonAncestorContainer);
    blockDiv.classList.remove(BLINKCLASS);
    const idsInContent = Array
        .from(blockDiv.querySelectorAll(`[${DATA_TYPE}~="${BLOCK_REF}"]`))
        .map(e => e.getAttribute(DATA_ID));
    return { idsInContent, blockDiv };
}

function insertText(blockDiv: Element, txt: string, protyle: Protyle) {
    protyle.insert(txt);
    protyle.focusBlock(blockDiv, false);
    blockDiv.classList.add(BLINKCLASS);
}

// const newDiv = blockDiv.cloneNode(true) as HTMLElement;
// const editable = getContenteditableElement(newDiv);
// editable.textContent = "abc";
// cleanDiv(newDiv as any, false);
// const newID = NewNodeID();
// newDiv.setAttribute(DATA_NODE_ID, newID)
// protyle.transaction([
//     {
//         action: "insert",
//         previousID: id,
//         data: newDiv.outerHTML,
//     }
// ], [
//     {
//         action: "delete",
//         id: newID,
//     }
// ])
// blockDiv.insertAdjacentElement("afterend", newDiv);
// protyle.focusBlock(newDiv, false);
// protyle.reload(true);
// protyle.updateTransaction(id, blockDiv.outerHTML, old);