import { TEMP_CONTENT } from "../../sy-tomato-plugin/src/libs/gconst";
import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { getHPathByDocID } from "./helper";

export async function newDigestDoc(docID: string, boxID: string, idx: string, name: string, md: string) {
    const hpath = await getHPathByDocID(docID, "digest");
    const attr = {} as AttrType;
    attr["custom-pdigest-index"] = `${docID}#${idx.padStart(10, "0")}`;
    attr["custom-pdigest-ctime"] = `${docID}#${new Date().getTime()}`;
    attr["custom-off-tomatobacklink"] = "1";
    attr["custom-progmark"] = `${TEMP_CONTENT}#${docID},999999999`;
    return siyuan.createDocWithMd(boxID, `${hpath}/[${idx}]${name.slice(0, 10)}`, md, "", attr);
}