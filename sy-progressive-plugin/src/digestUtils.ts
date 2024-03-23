import { siyuanCache } from "../../sy-tomato-plugin/src/libs/utils";
import { getHPathByDocID } from "./helper";

export async function newDigestDoc(docID: string, boxID: string, name: string) {
    let hpath = await getHPathByDocID(docID, "digest");
    hpath = `${hpath}/[0]${name.slice(0, 10)}`;
    const attr = {};
    // attr[MarkKey] = getDocIalCards(docID);
    const targetDocID = await siyuanCache.createDocWithMdIfNotExists(5000, boxID, hpath, "", attr);
    return targetDocID;

}