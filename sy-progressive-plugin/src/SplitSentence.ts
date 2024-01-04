import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";

export class SplitSentence {
    private noteID: string;
    constructor(noteID: string) {
        this.noteID = noteID;
    }
    async split() {
        const blocks = await siyuan.getChildBlocks(this.noteID);
        console.log(blocks)
    }
}