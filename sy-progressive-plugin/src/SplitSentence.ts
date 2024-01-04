import { RefIDKey } from "../../sy-tomato-plugin/src/libs/gconst";
import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";


export class SplitSentence {
    private asList: AsList;
    private noteID: string;
    private lastID: string;
    private sentences: string[];

    constructor(noteID: string, asList: AsList) {
        this.noteID = noteID;
        this.asList = asList;
    }

    async insert() {
        return navigator.locks.request("prog.SplitSentence.insert", { ifAvailable: true }, async (lock) => {
            if (lock) {
                if (!this.lastID) return;
                if (this.asList == "p") {
                    for (const line of this.sentences.slice().reverse()) await siyuan.insertBlockAfter(line, this.lastID);
                } else {
                    await siyuan.insertBlockAfter("* " + this.sentences.join("\n* "), this.lastID);
                }
                await siyuan.insertBlockAfter("", this.lastID);
                await siyuan.insertBlockAfter("", this.lastID);
            }
        });
    }

    async split() {
        const rows = (await Promise.all((await siyuan.getChildBlocks(this.noteID))
            .filter(i => i.type == "p")
            .map(b => siyuan.sqlOne(`select id,content,ial from blocks 
            where id="${b.id}"
            and content != "" and content is not null
            and ial like "%${RefIDKey}=%"`)))).filter(i => i.content);
        this.sentences = [];
        for (const row of rows) {
            this.lastID = row.id;
            const ref = getIDFromIAL(row.ial);
            if (ref) {
                let ps = [row.content];
                for (const s of "\n。！!？?；;") ps = spliyBy(ps, s);
                ps = spliyBy(ps, "……");
                if (this.asList == "l")
                    this.sentences.push(...ps.map(i => i + ` ((${ref} "*"))`));
                else
                    this.sentences.push(...ps.map(i => i + ` ((${ref} "*"))\n{: ${RefIDKey}="${ref}" }`));
            }
        }
    }
}

const escapeMagic = "JZzvQcXQgCnlRZ7NpbRCWfjkirZUoBtMShXPRrDLAszJvbd";

const escapeMagicList = [
    ["。”", escapeMagic + 11],
    ['。"', escapeMagic + 12],
    ['!"', escapeMagic + 31],
    ["!”", escapeMagic + 32],
    ["！”", escapeMagic + 41],
    ['！"', escapeMagic + 42],
    ["……”", escapeMagic + 51],
    ['……"', escapeMagic + 52],
    ["?”", escapeMagic + 61],
    ['?"', escapeMagic + 62],
    ["？”", escapeMagic + 71],
    ['？"', escapeMagic + 72],
];

function escape(data: string) {
    for (const e of escapeMagicList) {
        data = data.replace(new RegExp("\\" + e[0], "g"), e[1]);
    }
    return data;
}

function unescape(data: string) {
    for (const e of escapeMagicList) {
        data = data.replace(new RegExp(e[1], "g"), e[0]);
    }
    return data;
}

function spliyBy(content: string[], s: string) {
    const sentences = [];
    for (let c of content) {
        c = escape(c);
        const parts = c.split(new RegExp("\\" + s, "g"));
        for (let i = 0; i < parts.length; i++) {
            if (i == parts.length - 1) {
                sentences.push(parts[i]);
            } else {
                sentences.push(parts[i] + s);
            }
        }
    }
    return sentences.map(i => i.trim())
        .filter(i => i != "*")
        .filter(i => i.length > 0)
        .map(i => unescape(i));
}

function getIDFromIAL(ial: string) {
    // {: updated="20240104110156" custom-progref="20240103165224-jdum4t6" id="20240104110156-8tsr201"}
    const ref = ial.match(/custom-progref="([^"]+)"/);
    if (ref) return ref[1] ?? "";
    return "";
}
