import { Lute, openTab, Plugin } from "siyuan";
import { DATA_NODE_ID, DATA_NODE_INDEX, IN_BOOK_INDEX, PARAGRAPH_INDEX, PDIGEST_CTIME, PROG_ORIGIN_TEXT, RefIDKey, TEMP_CONTENT } from "../../sy-tomato-plugin/src/libs/gconst";
import { cleanDiv, siyuan, timeUtil } from "../../sy-tomato-plugin/src/libs/utils";
import { getHPathByDocID } from "./helper";
import { getBookID } from "../../sy-tomato-plugin/src/libs/progressive";

async function newDigestDoc(docID: string, anchorID: string, bookID: string, boxID: string, idx: string, name: string, md: string) {
    const hpath = await getHPathByDocID(bookID, "digest");
    const attr = {} as AttrType;
    const ct = new Date().getTime();
    // attr["custom-pdigest-index"] = `${docID}#${idx.padStart(10, "0")}`;
    attr["custom-pdigest-parent-id"] = docID;
    attr["custom-pdigest-last-id"] = anchorID;
    attr["custom-pdigest-ctime"] = `${bookID}#${ct}`;
    attr["custom-off-tomatobacklink"] = "1";
    attr["custom-progmark"] = `${TEMP_CONTENT}#${bookID},${ct}`;
    return siyuan.createDocWithMd(boxID, `${hpath}/[${idx}]${name.slice(0, 10)}`, md, "", attr);
}

async function setDigestCard(bookID: string, digestID: string) {
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
        await siyuan.removeRiffCards(cards.map(card => card.id));
    }
    await siyuan.addRiffCards([digestID]);
    await siyuan.reviewRiffCardByBlockID(digestID, 2);
    const due = timeUtil.getYYYYMMDDHHmmssPlus0(timeUtil.nowts());
    await siyuan.batchSetRiffCardsDueTimeByBlockID([{ id: digestID, due }]);
}

export async function finishDigest(docName: string, lastID: string, digestID: string, ctime: string, plugin: Plugin) {
    await siyuan.removeRiffCards([digestID]);
    await siyuan.setBlockAttrs(digestID, { "custom-pdigest-ctime": "🔨#" + ctime, "title": "🔨" + docName } as AttrType);
    let { bookID } = await getBookID(digestID);
    if (!bookID) bookID = digestID;
    const rows = await siyuan.sqlAttr(`select block_id from attributes where 
        name="${PDIGEST_CTIME}" 
        and value like "${bookID}#%"
        and value<"${ctime}" 
        and block_id!="${digestID}"
        order by value desc limit 1`);
    if (await tryOpen(rows, plugin)) return;
    const latestRows = await siyuan.sqlAttr(`select block_id from attributes where 
        name="${PDIGEST_CTIME}" 
        and value like "${bookID}#%"
        and block_id!="${digestID}"
        order by value desc limit 1`);
    if (await tryOpen(latestRows, plugin)) return;
    await openTab({
        app: plugin.app,
        doc: {
            id: lastID,
            zoomIn: false,
            action: ["cb-get-hl", "cb-get-context"],
        },
    });
}

async function tryOpen(rows: Attributes[], plugin: Plugin) {
    if (rows.length > 0) {
        await siyuan.addRiffCards([rows[0].block_id]);
        await openTab({
            app: plugin.app,
            doc: {
                id: rows[0].block_id,
                zoomIn: false,
                action: ["cb-get-hl", "cb-get-context"],
            },
        });
        return true;
    }
    return false;
}

export async function digest(anchorID: string, docID: string, boxID: string, allText: string, selected: HTMLElement[], lute: Lute, plugin: Plugin) {
    const md = [];
    let idx: string;
    let i = 0;
    for (const div of selected) {
        let inBookIdx = div.getAttribute(IN_BOOK_INDEX);
        if (!inBookIdx) inBookIdx = div.getAttribute(DATA_NODE_INDEX);

        let originID = div.getAttribute(RefIDKey);
        if (!originID) originID = div.getAttribute(DATA_NODE_ID);

        if (!idx) idx = inBookIdx;

        const cloned = div.cloneNode(true) as HTMLDivElement;
        await cleanDiv(cloned, true, true, false);
        cloned.setAttribute(RefIDKey, originID);
        cloned.setAttribute(IN_BOOK_INDEX, inBookIdx);
        cloned.setAttribute(PARAGRAPH_INDEX, String(i));
        cloned.setAttribute(PROG_ORIGIN_TEXT, "1");
        md.push(lute.BlockDOM2Md(cloned.outerHTML));
        i++;
    }
    if (!idx) idx = "0";
    let { bookID } = await getBookID(docID);
    if (!bookID) bookID = docID;
    const digestID = await newDigestDoc(
        docID,
        anchorID,
        bookID,
        boxID,
        idx,
        allText,
        md.join("\n"),
    );
    await openTab({
        app: plugin.app,
        doc: {
            id: digestID,
            zoomIn: false,
            action: ["cb-get-hl", "cb-get-context"],
        },
    });
    await setDigestCard(bookID, digestID);
}
