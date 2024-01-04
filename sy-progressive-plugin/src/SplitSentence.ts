import { RefIDKey } from "../../sy-tomato-plugin/src/libs/gconst";
import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";

export class SplitSentence {
    private noteID: string;
    constructor(noteID: string) {
        this.noteID = noteID;
    }
    async split() {
        const rows = (await Promise.all((await siyuan.getChildBlocks(this.noteID))
            .map(b => siyuan.sqlOne(`select id,content,ial from blocks 
            where id="${b.id}"
            and (type = "p" or type = "l")
            and content != "" and content is not null
            and ial like "%${RefIDKey}=%"`)))).filter(i => i.content);
        for (const row of rows) {
            console.log(row.ial)
        }
    }
}