import { PARAGRAPH_INDEX, PROG_ORIGIN_TEXT, RefIDKey, SPACE } from "../../sy-tomato-plugin/src/libs/gconst";
import { NewNodeID, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { Plugin, openTab } from "siyuan";

export class SplitSentence {
    private asList: AsList;
    private noteID: string;
    private lastID: string;
    private textAreas: { blocks: { text: string, id: string }[], ref: string }[];
    plugin: Plugin;

    constructor(plugin: Plugin, noteID: string, asList: AsList) {
        this.noteID = noteID;
        this.asList = asList;
        this.plugin = plugin;
    }

    async insert() {
        return navigator.locks.request("prog.SplitSentence.insert", { ifAvailable: true }, async (lock) => {
            if (lock && this.lastID) {
                let firstID: string;
                const mdList: string[] = [];
                for (const b of this.textAreas) {
                    if (!firstID && b.blocks.length > 0) {
                        firstID = b.blocks[0].id;
                    }
                    mdList.push(b.blocks.map(i => i.text).join(""));
                }
                await siyuan.insertBlockAfter(mdList.join("\n\n"), this.lastID);
                if (firstID) {
                    setTimeout(() => {
                        openTab({ app: this.plugin.app, doc: { id: firstID, action: ["cb-get-all", "cb-get-focus"] } });
                    }, 1000);
                    window.location.href = "siyuan://blocks/" + firstID;
                }
            }
        });
    }

    async split() {
        const msg = "请重新插入原文";
        {
            const rows = await siyuan.sql(`select id from blocks where ial like '%${PROG_ORIGIN_TEXT}="1"%' and root_id="${this.noteID}" limit 1`);
            if (rows.length == 0) {
                await siyuan.pushMsg(msg);
                return;
            }
        }
        const rows = (await Promise.all((await siyuan.getChildBlocks(this.noteID))
            .filter(i => i.type != "html" && i.type != "t" && i.type != "s")
            .map(b => siyuan.sqlOne(`select id,content,ial,type,markdown from blocks 
            where id="${b.id}"
            and content != "" and content is not null
            and ial like '%${PROG_ORIGIN_TEXT}="1"%'`)))).filter(i => i.content);
        this.textAreas = [];
        if (rows.length == 0) {
            await siyuan.pushMsg(msg);
        }
        for (const row of rows) {
            this.lastID = row.id;
            const { ref, idx } = getIDFromIAL(row.ial);
            if (ref) {
                const getAttrLine = () => {
                    const newID = NewNodeID();
                    const attrLine = `{: id="${newID}" ${RefIDKey}="${ref}" ${PARAGRAPH_INDEX}="${idx}" ${PROG_ORIGIN_TEXT}="1"}`;
                    return { attrLine, newID };
                };
                const ATTR_LINE = `{: ${RefIDKey}="${ref}" ${PARAGRAPH_INDEX}="${idx}" ${PROG_ORIGIN_TEXT}="1"}`;
                if (row.type == "h") {
                    const { newID, attrLine } = getAttrLine();
                    this.textAreas.push({
                        blocks: [{ text: row.markdown + `\n${attrLine}`, id: newID }],
                        ref,
                    });
                } else {
                    let ps = [row.content];
                    for (const s of "\n。！!？?；;:：") ps = spliyBy(ps, s);
                    ps = spliyBy(ps, ". ");
                    ps = spliyBy(ps, "……");
                    let blocks: { text: string, id: string }[];
                    if (this.asList == "p") {
                        blocks = ps.map(i => i.trim())
                            .filter(i => i.length > 0)
                            .map(i => {
                                const { newID, attrLine } = getAttrLine();
                                return { text: SPACE.repeat(2) + i + ` ((${ref} "*"))\n${attrLine}\n`, id: newID };
                            });
                        const { newID } = getAttrLine();
                        blocks.push({ text: `{: id="${newID}"}\n`, id: newID });
                    } else if (this.asList == "t") {
                        blocks = ps.map(i => {
                            const { newID, attrLine } = getAttrLine();
                            return { text: `* ${ATTR_LINE}[ ] ` + i + ` ((${ref} "*"))\n\t${attrLine}\n`, id: newID };
                        });
                        const { newID, attrLine } = getAttrLine();
                        blocks.push({ text: `${attrLine}\n`, id: newID });
                    } else {
                        blocks = ps.map(i => {
                            const { newID, attrLine } = getAttrLine();
                            return { text: `* ${ATTR_LINE} ` + i + ` ((${ref} "*"))\n\t${attrLine}\n`, id: newID };
                        });
                        const { newID, attrLine } = getAttrLine();
                        blocks.push({ text: `${attrLine}\n`, id: newID });
                    }
                    this.textAreas.push({ blocks, ref });
                }
            }
        }
    }
}

function shouldMove(s: string) {
    return s.startsWith("”")
        || s.startsWith("’")
        || s.startsWith("\"")
        || s.startsWith("'")
        || s.startsWith("】")
        || s.startsWith("]")
        || s.startsWith("}")
        || s.startsWith(")")
        || s.startsWith("）")
        || s.startsWith("』") //『』
        || s.startsWith("」") //「」
        || s.startsWith("!")
        || s.startsWith("！")
        || s.startsWith("。")
        || s.startsWith(". ")
        || s.startsWith("?")
        || s.startsWith("？")
        || s.startsWith(";")
        || s.startsWith("；")
        || s.startsWith(":")
        || s.startsWith("：")
        || s.startsWith("…");
}

function movePunctuations(a: string, b: string) {
    while (shouldMove(b)) {
        a += b[0];
        b = b.slice(1);
    }
    return [a, b];
}

function spliyBy(content: string[], s: string) {
    const sentences: string[] = [];
    for (const c of content.filter(i => i.length > 0)) {
        const parts = c.split(new RegExp("\\" + s, "g"));
        for (let i = 0; i < parts.length; i++) {
            if (i < parts.length - 1) {
                parts[i] += s;
            }
            let j = i;
            while (j > 0) {
                const [a, b] = movePunctuations(parts[j - 1], parts[j]);
                parts[j - 1] = a;
                parts[j] = b;
                j--;
            }
        }
        sentences.push(...parts.map(i => i.trim())
            .map(i => i.trim().replace(/\*+$/g, ""))
            .filter(i => i.length > 0)
            .filter(i => i != "*"));
    }
    return sentences;
}

function getIDFromIAL(ial: string) {
    // {: updated="20240104110156" custom-progref="20240103165224-jdum4t6" id="20240104110156-8tsr201"}
    const ref = ial.match(/custom-progref="([^"]+)"/);
    const idx = ial.match(/custom-paragraph-index="([^"]+)"/);
    let idxText = "";
    if (idx && idx[1]) {
        idxText = idx[1];
    }
    if (ref) return { ref: ref[1] ?? "", idx: idxText };
    return {};
}
