import { IProtyle, Lute, Plugin, openTab } from "siyuan";
import { NewLute, NewNodeID, cleanDiv, getBlockDiv, get_siyuan_lnk_md, isValidNumber, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { findAllInOneKeyDoc, findCompareDoc, findKeysDoc, findPieceDoc, getAllInOneKeyDoc, getCompareDoc, getHPathByDocID, getKeysDoc, isProtyleKeyDoc, isProtylePiece } from "./helper";
import { DATA_NODE_ID, MarkKey, PARAGRAPH_INDEX, PROG_KEY_NOTE, PROG_ORIGIN_TEXT, RefIDKey, WEB_ZERO_SPACE } from "../../sy-tomato-plugin/src/libs/gconst";

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
                    label: "提取所有分片笔记",
                    icon: "iconCopy",
                    click: async () => {
                        await this.extractAllNotes(protyle.notebookId, markKey);
                    },
                });
                menu.addItem({
                    label: "提取笔记",
                    icon: "iconCopy",
                    click: async () => {
                        await this.extractNotes(protyle.block?.rootID, protyle.notebookId, markKey, false);
                    },
                });
                menu.addItem({
                    label: "提取笔记（嵌入）",
                    icon: "iconCopy",
                    click: async () => {
                        await this.extractNotes(protyle.block?.rootID, protyle.notebookId, markKey, true);
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
    private async extractAllNotes(boxID: string, markKey: string) {
        // 插件管理勿改managedByPluginDoNotModify#20240130152919-exlnqci,7
        const pmPreffix = markKey.split(",")[0];
        const attrRows = await siyuan.sqlAttr(`select root_id,value from attributes where name="${MarkKey}" and value like "${pmPreffix}%" limit 100000000`);
        const allDocs = attrRows.map(row => {
            const idx = row.value.split(",").pop();
            if (idx)
                return { docID: row.root_id, idx: Number(idx) };
        }).filter(row => row != null).sort((a, b) => a.idx - b.idx).map(row => row.docID);
        const blocks = (await Promise.all(allDocs.map(docID => siyuan.getChildBlocks(docID))))
            .flat()
            .filter(row => row.type != "s" && row.type != "tb")
            .map(b => b.id);
        const rows = await siyuan.getRows(blocks, "content", true, [`ial not like "%${PROG_ORIGIN_TEXT}%"`]);
        const md = rows.map(row => {
            if (row.content?.trim()) {
                return `${row.content} ${get_siyuan_lnk_md(row.id, "*")}\n{: id="${NewNodeID()}"}`;
            }
        }).filter(i => !!i);
        const bookID = pmPreffix.split("#")[1];
        let keysDocID = await findAllInOneKeyDoc(bookID);
        if (!keysDocID) {
            const hpath = await getHPathByDocID(bookID, "collection");
            if (hpath) {
                keysDocID = await getAllInOneKeyDoc(bookID, boxID, hpath);
            }
        }
        if (!keysDocID) return;
        await siyuan.clearAll(keysDocID);
        await siyuan.insertBlockAsChildOf(md.join("\n"), keysDocID);
        openTab({ app: this.plugin.app, doc: { id: keysDocID }, position: "right" });
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
            await siyuan.clearAll(cmpDocID);
            const mdList: string[] = [];

            const keyNoteDivMap = (await Promise.all((await siyuan.getChildBlocks(keyNoteID)).map(b => getBlockDiv(b.id))))
                .map(e => e.div)
                .reduce((all, e) => {
                    all.divs.push(e);
                    const ref = e.getAttribute(RefIDKey);
                    if (ref) {
                        all.lastRef = ref;
                    } else if (all.lastRef) {
                        e.setAttribute(RefIDKey, all.lastRef);
                    }
                    return all;
                }, { lastRef: "", divs: [] as HTMLElement[] })
                .divs
                .filter(e => !e.getAttribute(PROG_KEY_NOTE))
                .reduce((m, e) => {
                    const k = e.getAttribute(RefIDKey);
                    if (!m.has(k)) m.set(k, []);
                    m.get(k).push(e);
                    return m;
                }, new Map<string, HTMLElement[]>());

            const { ids, m: pieceDivMap } = (await Promise.all((await siyuan.getChildBlocks(pieceID)).map(b => getBlockDiv(b.id))))
                .filter(e => e.div.getAttribute(PROG_ORIGIN_TEXT))
                .map(e => e.div)
                .reduce((obj, e) => {
                    const k = e.getAttribute(RefIDKey);
                    obj.ids.push(k);
                    if (!obj.m.has(k)) obj.m.set(k, []);
                    obj.m.get(k).push(e);
                    return obj;
                }, { ids: [] as string[], m: new Map<string, HTMLElement[]>() });

            for (const id of [... new Set(ids)]) {
                for (const div of pieceDivMap.get(id) ?? []) {
                    await cleanDiv(div as any, false, false);
                    div.setAttribute(PROG_KEY_NOTE, "1");
                    mdList.push(this.lute.BlockDOM2Md(div.outerHTML));
                }
                let w = false;
                for (const div of keyNoteDivMap.get(id) ?? []) {
                    w = true;
                    await cleanDiv(div as any, false, false);
                    mdList.push(this.lute.BlockDOM2Md(div.outerHTML));
                }
                if (w) mdList.push("---");
            }

            await siyuan.insertBlockAsChildOf(mdList.join("\n"), cmpDocID);
            openTab({ app: this.plugin.app, doc: { id: cmpDocID } });
        }
    }

    private async extractNotes(pieceID: string, notebookId: string, markKey: string, isEmbedded: boolean) {
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
                .filter(e => e.div.textContent.replace(new RegExp(WEB_ZERO_SPACE, "g"), "").trim())
                .map(e => e.div);
            const mdList: string[] = [];
            if (isEmbedded) {
                for (const div of divs) {
                    const id = div.getAttribute(DATA_NODE_ID);
                    const idx = div.getAttribute(PARAGRAPH_INDEX);
                    const ref = div.getAttribute(RefIDKey);
                    const md = `{{select * from blocks where id='${id}'}}\n{: ${PROG_KEY_NOTE}="1" ${PARAGRAPH_INDEX}="${idx}" ${RefIDKey}="${ref}" }`;
                    const blank = `{: id="${NewNodeID()}"}`;
                    mdList.push(md + "\n" + blank);
                }
            } else {
                for (const div of divs) {
                    await cleanDiv(div, false, false);
                    div.setAttribute(PROG_KEY_NOTE, "1");
                    const md = this.lute.BlockDOM2Md(div.outerHTML);
                    const blank = `{: id="${NewNodeID()}"}`;
                    mdList.push(md + "\n" + blank);
                }
            }
            await siyuan.insertBlockAsChildOf(mdList.join("\n"), keysDocID);
            openTab({ app: this.plugin.app, doc: { id: keysDocID } });
        }
    }
}

export const writingCompareBox = new WritingCompareBox();

