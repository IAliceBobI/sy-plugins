import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { getHPathByDocID } from "./helper";

export async function newDigestDoc(docID: string, boxID: string, count: number, name: string, md: string) {
    const hpath = await getHPathByDocID(docID, "digest");
    const attr = {};
    attr["custom-prog-digest-bookID"] = docID;
    attr["custom-prog-digest-id"] = count;
    return siyuan.createDocWithMd(boxID, `${hpath}/[${count}]${name.slice(0, 10)}`, md, "", attr);
}