import { IProtyle, Lute, Plugin, openTab } from "siyuan";
import { NewLute, cleanDiv, getBlockDiv, isValidNumber, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { findCompareDoc, findKeysDoc, findPieceDoc, getCompareDoc, getHPathByDocID, getKeysDoc, isProtyleKeyDoc, isProtylePiece } from "./helper";
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
                            await this.compareNotes(protyle.block?.rootID, protyle.notebookId, keyDocAttr);
                        },
                    });
                }
            }
        });
    }

    private async compareNotes(keyNoteID: string, notebookId: string, keyDocAttr: string) {
        if (!keyNoteID || !notebookId || !keyDocAttr) return;
        const parts = keyDocAttr.split("#").pop()?.split(",");
        if (parts.length == 2) {
            const point = Number(parts[1]);
            if (!isValidNumber(point)) return;
            const pieceID = await findPieceDoc(parts[0], point);
            if (!pieceID) return;
            let cmpDocID = await findCompareDoc(parts[0], point);
            if (!cmpDocID) {
                const hpath = await getHPathByDocID(pieceID, "compare");
                if (hpath) {
                    cmpDocID = await getCompareDoc(parts[0], point, notebookId, hpath);
                }
            }
            if (!cmpDocID) return;
            console.log(pieceID, cmpDocID)
        }
    }

    private async extractNotes(pieceID: string, notebookId: string, markKey: string) {
        if (!pieceID || !notebookId || !markKey) return;
        const parts = markKey.split("#").pop()?.split(",");
        if (parts.length == 2) {
            const point = Number(parts[1]);
            if (!isValidNumber(point)) return;
            let keysDocID = await findKeysDoc(parts[0], point);
            if (!keysDocID) {
                const hpath = await getHPathByDocID(pieceID, "keys");
                if (hpath) {
                    keysDocID = await getKeysDoc(parts[0], point, notebookId, hpath);
                }
            }
            if (!keysDocID) return;
            await siyuan.clearAll(keysDocID);

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
            await siyuan.insertBlockAsChildOf(mdList.join("\n"), keysDocID);
            openTab({ app: this.plugin.app, doc: { id: keysDocID }, position: "right" })
        }
    }
}

export const writingCompareBox = new WritingCompareBox();

