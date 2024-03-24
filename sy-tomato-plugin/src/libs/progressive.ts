import { TEMP_CONTENT } from "./gconst";
import { siyuan } from "./utils";

export async function getBookIDByBlock(blockID: string) {
    const docRow = await siyuan.getDocRowByBlockID(blockID);
    return getBookID(docRow?.id);
}

export async function getBookID(docID: string): Promise<{ bookID: string, pieceNum: number }> {
    const ret = { bookID: "", pieceNum: NaN } as Awaited<ReturnType<typeof getBookID>>;
    if (docID) {
        const attrs = await siyuan.getBlockAttrs(docID);
        let mark = attrs["custom-progmark"];
        if (mark) {
            mark = mark.split(TEMP_CONTENT).pop();
            const last = mark.split("#").pop();
            const parts = last.split(",");
            ret.bookID = parts[0];
            ret.pieceNum = Number(parts[1]);
        }
    }
    return ret;
}