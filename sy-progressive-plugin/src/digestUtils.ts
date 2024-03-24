import { TEMP_CONTENT } from "../../sy-tomato-plugin/src/libs/gconst";
import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import { getHPathByDocID } from "./helper";

export async function newDigestDoc(bookID: string, boxID: string, idx: string, name: string, md: string) {
    const hpath = await getHPathByDocID(bookID, "digest");
    const attr = {} as AttrType;
    const ct = new Date().getTime();
    // attr["custom-pdigest-index"] = `${docID}#${idx.padStart(10, "0")}`;
    // attr["custom-pdigest-ctime"] = `${docID}#${ct}`;
    attr["custom-off-tomatobacklink"] = "1";
    attr["custom-progmark"] = `${TEMP_CONTENT}#${bookID},${ct}`;
    return siyuan.createDocWithMd(boxID, `${hpath}/[${idx}]${name.slice(0, 10)}`, md, "", attr);
}

export async function setDigestCard(bookID: string, digestID: string) {
    const row = await siyuan.sqlOne(`SELECT a.id FROM blocks a
            INNER JOIN (
                SELECT hpath,content
                FROM blocks
                WHERE type='d'
                AND id ='${bookID}' limit 1
            ) b ON a.hpath = b.hpath || '/digest-' || b.content
        WHERE a.type='d' limit 1`);
    if (row?.id) {
        const cards = await siyuan.getTreeRiffCardsAll(row.id);
        for (const card of cards) {
            console.log(card)
        }
    }
    await siyuan.addRiffCards([digestID]);
}



// SELECT a.*
// FROM blocks a
// INNER JOIN (
//   SELECT hpath
//   FROM blocks
//   WHERE type='d'
//   AND id ='20240123151020-gpjyj0l'
// ) b ON a.hpath LIKE b.hpath || '%'
// where a.type='d'
