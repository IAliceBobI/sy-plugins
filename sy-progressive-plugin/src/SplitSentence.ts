import { RefIDKey } from "../../sy-tomato-plugin/src/libs/gconst";
import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";

export class SplitSentence {
    private noteID: string;
    private lastID: string;

    constructor(noteID: string) {
        this.noteID = noteID;
    }

    async split() {
        const rows = (await Promise.all((await siyuan.getChildBlocks(this.noteID))
            .filter(i => i.type == "p")
            .map(b => siyuan.sqlOne(`select id,content,ial from blocks 
            where id="${b.id}"
            and content != "" and content is not null
            and ial like "%${RefIDKey}=%"`)))).filter(i => i.content);
        for (const row of rows) {
            this.lastID = row.id;
            const ref = getIDFromIAL(row.ial)
            if (ref) {
                row.content
            }
        }
    }
}

function getIDFromIAL(ial: string) {
    // {: updated="20240104110156" custom-progref="20240103165224-jdum4t6" id="20240104110156-8tsr201"}
    const ref = ial.match(/custom-progref="([^"]+)"/);
    if (ref) return ref[1] ?? ""
    return "";
}