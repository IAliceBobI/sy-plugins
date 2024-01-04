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
                    await siyuan.insertBlockAfter(this.sentences.join("\n"), this.lastID);
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
                if (this.asList == "p")
                    this.sentences.push(...ps.map(i => i + ` ((${ref} "*"))\n{: ${RefIDKey}="${ref}" }`));
                else if (this.asList == "ls")
                    this.sentences.push(...ps.map(i => i + ` ((${ref} "*"))\n\t{: ${RefIDKey}="${ref}" }\n{: ${RefIDKey}="${ref}" }`));
                else
                    this.sentences.push(...ps.map(i => i + ` ((${ref} "*"))\n\t{: ${RefIDKey}="${ref}" }\t{: ${RefIDKey}="${ref}" }`));
            }
        }
    }
}

function shouldMove(s: string) {
    return s.startsWith(`”`)
        || s.startsWith(`’`)
        || s.startsWith(`"`)
        || s.startsWith(`'`)
        || s.startsWith(`】`)
        || s.startsWith(`]`)
        || s.startsWith(`}`)
        || s.startsWith(`)`)
        || s.startsWith(`）`)
        || s.startsWith(`』`) //『』
        || s.startsWith(`」`) //「」
}

function movePunctuations(a: string, b: string) {
    while (shouldMove(b)) {
        a += b[0];
        b = b.slice(1)
    }
    return [a, b]
}

function spliyBy(content: string[], s: string) {
    const sentences = [];
    for (let c of content) {
        const parts = c.split(new RegExp("\\" + s, "g"));
        for (let i = 0; i < parts.length; i++) {
            if (i < parts.length - 1) {
                parts[i] += s
            }
            if (i > 0) {
                const [a, b] = movePunctuations(parts[i - 1], parts[i])
                parts[i - 1] = a
                parts[i] = b
            }
        }
        sentences.push(...parts);
    }
    return sentences.map(i => i.trim()).filter(i => i != "*");
}

function getIDFromIAL(ial: string) {
    // {: updated="20240104110156" custom-progref="20240103165224-jdum4t6" id="20240104110156-8tsr201"}
    const ref = ial.match(/custom-progref="([^"]+)"/);
    if (ref) return ref[1] ?? "";
    return "";
}
