import { IProtyle, Lute, Plugin } from "siyuan";
import { NewLute, cleanDiv, getBlockDiv, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { isProtylePiece } from "./helper";
import { MarkKey, PROG_ORIGIN_TEXT } from "../../sy-tomato-plugin/src/libs/gconst";

class WritingCompareBox {
    private plugin: Plugin;
    settings: SettingCfgType;
    lute: Lute;

    async onload(plugin: Plugin, settings: SettingCfgType) {
        this.plugin = plugin;
        this.settings = settings;
        this.lute = NewLute();
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const protyle: IProtyle = detail.protyle;
            if (isProtylePiece(protyle)) {
                const menu = detail.menu;
                menu.addItem({
                    label: "提取笔记",
                    icon: "iconCopy",
                    click: async () => {
                        await this.extractNotes(protyle.block.rootID);
                    },
                });
            }
        });
    }

    private async extractNotes(pieceID: string) {
        if (!pieceID) return;
        const divs = (await Promise.all((await siyuan.getChildBlocks(pieceID)).map(b => getBlockDiv(b.id))))
            .filter(e => !e.div.getAttribute(PROG_ORIGIN_TEXT))
            .filter(e => !e.div.getAttribute(MarkKey))
            .filter(e => e.div.textContent.replace(/\u200B/g, "").trim())
            .map(e => e.div);
        for (const div of divs) {
            await cleanDiv(div, false, false);
            // let summaryID = await findSummary(pieceID);
            // if (!summaryID) {
            //     const hpath = await getHPathByDocID(pieceID, "keys");
            //     if (hpath) {
            //         summaryID = await getSummaryDoc(pieceID, notebook, hpath);
            //     }
            // }
        }
    }
}

export const writingCompareBox = new WritingCompareBox();

