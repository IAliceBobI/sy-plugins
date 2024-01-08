import { Plugin, Protyle } from "siyuan";
import "./index.scss";
import { getContenteditableElement, getID, getSyElement } from "./libs/utils";

class CmdBlockBox {
    private plugin: Plugin;

    async onload(plugin: Plugin) {
        this.plugin = plugin;

        this.plugin.protyleSlash = [{
            filter: ["合并两个文档", "mergedoc", "hbwd", "hblgwd"],
            html: "<div class=\"b3-list-item__first\"><span class=\"b3-list-item__text\">合并两个文档</span></div>",
            id: "insertEmoji",
            callback(protyle: Protyle) {
                // protyle.reload(true);
                const range = protyle.getRange(protyle.protyle.element);
                const blockDiv = getSyElement(range.commonAncestorContainer);
                const id = getID(blockDiv);
                const old = blockDiv.outerHTML;
                const editable = getContenteditableElement(blockDiv);
                editable.textContent = "abc";
                protyle.updateTransaction(id, blockDiv.outerHTML, old);
            }
        }];
    }

    blockIconEvent(_detail: any) {
        if (!this.plugin) return;
    }
}

export const cmdBlockBox = new CmdBlockBox();
