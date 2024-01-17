import { PARAGRAPH_INDEX, PROG_ORIGIN_TEXT, RefIDKey, SPACE } from "../../sy-tomato-plugin/src/libs/gconst";
import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";


export class SplitSentence {
    private asList: AsList;
    private noteID: string;
    private lastID: string;
    private textAreas: { blocks: string[], ref: string }[];

    constructor(noteID: string, asList: AsList) {
        this.noteID = noteID;
        this.asList = asList;
    }

    async insert() {
        return navigator.locks.request("prog.SplitSentence.insert", { ifAvailable: true }, async (lock) => {
            if (lock && this.lastID) {
                for (const b of this.textAreas.slice().reverse()) {
                    await siyuan.insertBlockAfter(b.blocks.join(""), this.lastID);
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
                const attrLine = `{: ${RefIDKey}="${ref}" ${PARAGRAPH_INDEX}="${idx}" ${PROG_ORIGIN_TEXT}="1"}`;
                if (row.type == "h") {
                    this.textAreas.push({
                        blocks: [row.markdown + `\n${attrLine}`],
                        ref,
                    });
                } else {
                    let ps = [row.content];
                    for (const s of "\n。！!？?；;:：") ps = spliyBy(ps, s);
                    ps = spliyBy(ps, "……");
                    let blocks: string[];
                    if (this.asList == "p") {
                        blocks = ps.map(i => i.trim())
                            .filter(i => i.length > 0)
                            .map(i => SPACE.repeat(2) + i + ` ((${ref} "*"))\n${attrLine}\n`);
                    } else if (this.asList == "t") {
                        blocks = ps.map(i => `* ${attrLine}[ ] ` + i + ` ((${ref} "*"))\n\t${attrLine}\n`);
                    } else {
                        blocks = ps.map(i => `* ${attrLine} ` + i + ` ((${ref} "*"))\n\t${attrLine}\n`);
                    }
                    blocks.push(`${attrLine}\n`);
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
    let idxText = "0"
    if (idx && idx[1]) {
        idxText = idx[1];
    }
    if (ref) return { ref: ref[1] ?? "", idx: idxText };
    return {};
}
