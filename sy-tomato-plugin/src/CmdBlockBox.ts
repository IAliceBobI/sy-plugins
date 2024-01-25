import { Plugin, Protyle } from "siyuan";
import "./index.scss";
import { cleanDiv, getBlockDiv, getSyElement, siyuan } from "./libs/utils";
import { BLOCK_REF, CUSTOM_RIFF_DECKS, DATA_ID, DATA_TYPE } from "./libs/gconst";

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
                    oldAttrs.title = "moved";
                    await siyuan.setBlockAttrs(idsInContent[0], oldAttrs);
                    await siyuan.setBlockAttrs(idsInContent[1], newAttrs);
                    await moveAllContentToDoc2(protyle, idsInContent[0], idsInContent[1]);
                    await siyuan.flushTransaction();
                    await siyuan.transferBlockRef(idsInContent[0], idsInContent[1]);
                } else {
                    const txt = `请分别粘贴两个文档的引用于括号中，再对本块用'/'触发一次此功能。
文档A的引用将转移到文档B，
文档A属性、内容将复制到文档B，
文档A（              ）➡️➡️➡️ 文档B（              ）。`;
                    insertText(blockDiv, txt, protyle);
                    // protyle.reload(false);
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
    const divs = await Promise.all((await siyuan.getChildBlocks(doc1)).map(b => getBlockDiv(b.id)));
    for (const { div } of divs) {
        await cleanDiv(div, false, false);
        const md = protyle.protyle.lute.BlockDOM2Md(div.outerHTML).trim();
        await siyuan.appendBlock(md, doc2);
    }
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
// c111leanDiv(newDiv as any, false);
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