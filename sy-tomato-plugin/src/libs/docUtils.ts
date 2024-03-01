import { siyuan } from "./utils";

export async function moveAllContentToDoc(tobeRmDocID: string, destDocID: string) {
    const ids = (await siyuan.getChildBlocks(tobeRmDocID)).map(b => b.id);
    await siyuan.moveBlocksAsChild(ids, destDocID);
}

export async function moveAllContentHere(tobeRmDocID: string, blockID: string) {
    const ids = (await siyuan.getChildBlocks(tobeRmDocID)).map(b => b.id);
    await siyuan.moveBlocksAfter(ids, blockID);
}
