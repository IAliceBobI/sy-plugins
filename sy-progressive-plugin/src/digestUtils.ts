import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { getHPathByDocID } from "./helper";

export async function newDigestDoc(docID: string, boxID: string, idx: string, name: string, md: string) {
    const hpath = await getHPathByDocID(docID, "digest");
    const attr = {} as AttrType;
    attr["custom-prog-digest-id"] = `${docID}#${idx.padStart(10, "0")}`;
    attr["custom-prog-digest-ctime"] = `${docID}#${new Date().getTime()}`;
    attr["custom-off-tomatobacklink"] = "1";
    return siyuan.createDocWithMd(boxID, `${hpath}/[${idx}]${name.slice(0, 10)}`, md, "", attr);
}