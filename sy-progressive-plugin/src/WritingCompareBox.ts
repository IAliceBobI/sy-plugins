import { IProtyle, Lute, Plugin, openTab } from "siyuan";
import { NewLute, cleanDiv, getBlockDiv, isValidNumber, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { findKeysDoc, getHPathByDocID, getKeysDoc, isProtyleKeyDoc, isProtylePiece } from "./helper";
import { MarkKey, PROG_KEY_NOTE, PROG_ORIGIN_TEXT } from "../../sy-tomato-plugin/src/libs/gconst";

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
            const { isPiece, markKey } = isProtylePiece(protyle);
            if (isPiece) {
                const menu = detail.menu;
                menu.addItem({
                    label: "提取笔记",
                    icon: "iconCopy",
                    click: async () => {
                        await this.extractNotes(protyle.block?.rootID, protyle.notebookId, markKey);
                    },
                });
            } else {
                const { isKeyDoc, keyDocAttr } = isProtyleKeyDoc(protyle);
                if (isKeyDoc) {
                    const menu = detail.menu;
                    menu.addItem({
                        label: "对比原文",
                        icon: "iconEye",
                        click: async () => {
                        },
                    });
                }
            }
        });
    }

    private async extractNotes(pieceID: string, notebookId: string, markKey: string) {
        if (!pieceID || !notebookId || !markKey) return;
        const point = Number(markKey.split('#').pop()?.split(",").pop());
        if (!isValidNumber(point)) return;
        let keysDocID = await findKeysDoc(pieceID, point);
        if (!keysDocID) {
            const hpath = await getHPathByDocID(pieceID, "keys");
            if (hpath) {
                keysDocID = await getKeysDoc(pieceID, point, notebookId, hpath);
            }
        }
        if (!keysDocID) return;

        const divs = (await Promise.all((await siyuan.getChildBlocks(pieceID)).map(b => getBlockDiv(b.id))))
            .filter(e => !e.div.getAttribute(PROG_ORIGIN_TEXT))
            .filter(e => !e.div.getAttribute(MarkKey))
            .map(e => e.div);
        const mdList: string[] = [];
        for (const div of divs) {
            await cleanDiv(div, false, false);
            div.setAttribute(PROG_KEY_NOTE, "1");
            const md = this.lute.BlockDOM2Md(div.outerHTML);
            mdList.push(md);
        }
        await siyuan.appendBlock(mdList.join("\n"), keysDocID);
        openTab({ app: this.plugin.app, doc: { id: keysDocID }, position: "right" })
    }
}

export const writingCompareBox = new WritingCompareBox();

