import { Plugin, Protyle } from "siyuan";
import "./index.scss";
import { NewNodeID, cleanDiv, getContenteditableElement, getID, getSyElement, siyuan } from "./libs/utils";
import { BLOCK_REF, DATA_ID, DATA_NODE_ID, DATA_TYPE } from "./libs/gconst";

const MERGEDOC = '合并两个文档';
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
                const range = protyle.getRange(protyle.protyle.element);
                const blockDiv = getSyElement(range.commonAncestorContainer);
                blockDiv.classList.remove(BLINKCLASS)
                const id = getID(blockDiv);
                const es = Array
                    .from(blockDiv.querySelectorAll(`[${DATA_TYPE}~="${BLOCK_REF}"]`))
                    .map(e => e.getAttribute(DATA_ID))
                if (es.length == 2) {

                } else {
                    const oldHTML = blockDiv.outerHTML;
                    const contentDiv = getContenteditableElement(blockDiv);
                    contentDiv.innerHTML = `请分别粘贴两个文档的引用大致于括号中央，再用'/'触发一次此功能。
文档1引用（         ），文档2引用（         ）`;
                    protyle.updateTransaction(id, blockDiv.outerHTML, oldHTML);
                    protyle.focusBlock(blockDiv, false);
                    blockDiv.classList.add(BLINKCLASS);
                }
            }
        }];
    }

    blockIconEvent(_detail: any) {
        if (!this.plugin) return;
    }
}

export const cmdBlockBox = new CmdBlockBox();

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