import { Plugin, Protyle } from "siyuan";
import "./index.scss";
import { getSyElement, siyuan } from "./libs/utils";
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
                    await mergeDocs(idsInContent);
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