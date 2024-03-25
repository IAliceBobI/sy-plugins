import { Lute, openTab, Plugin } from "siyuan";
import { DATA_NODE_ID, DATA_NODE_INDEX, IN_BOOK_INDEX, PARAGRAPH_INDEX, PDIGEST_CTIME, PROG_ORIGIN_TEXT, RefIDKey, TEMP_CONTENT } from "../../sy-tomato-plugin/src/libs/gconst";
import { cleanDiv, get_siyuan_lnk_md, getContenteditableElement, NewNodeID, set_href, siyuan, timeUtil } from "../../sy-tomato-plugin/src/libs/utils";
import { getHPathByDocID, getTraceDoc } from "./helper";
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

export async function cleanDigest(digestID: string) {
    let { bookID } = await getBookID(digestID);
    if (!bookID) bookID = digestID;
    const rows = await siyuan.sqlAttr(`select block_id from attributes where name="${PDIGEST_CTIME}" and value like "🔨#${bookID}#% limit 1000000"`);
    for (const row of rows) {
        await siyuan.removeDocByID(row.block_id);
    }
}

async function setDigestCard(bookID: string, digestID: string) {
    const row = await siyuan.sqlOne(`SELECT a.id FROM blocks a
            INNER JOIN (
                SELECT hpath,content
                FROM blocks
                WHERE type='d'
                AND id ='${bookID}'
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

export async function getDigestLnk(digestID: string, boxID: string, plugin: Plugin) {
    let { bookID } = await getBookID(digestID);
    if (!bookID) bookID = digestID;
    const rows = await siyuan.sql(`select ial,content,id from blocks where id = "${bookID}" or id in 
        (select block_id from attributes where name="${PDIGEST_CTIME}" and value like "${bookID}#%" limit 1000000)`);
    if (rows.length <= 1) return;

    const [attrMap, parents] = rows.map(r => {
        const a = parseIAL(r.ial);
        a.title = r.content;
        a.id = r.id;
        return a;
    }).reduce(([a, p], attr) => {
        a.set(attr.id, attr);
        p.add(attr["custom-pdigest-parent-id"]);
        return [a, p];
    }, [new Map<string, AttrType>(), new Set<string>()]);

    const bookName = attrMap.get(bookID).title;

    const leaves = [...attrMap.keys()].reduce((l, id) => {
        if (!parents.has(id) && id != bookID) l.push(attrMap.get(id));
        return l;
    }, [] as AttrType[]).sort((a, b) => -a["custom-pdigest-ctime"].localeCompare(b["custom-pdigest-ctime"]));

    const lines = leaves.map(leave => {
        const lnk: AttrType[] = [];
        lnk.push(leave);
        do {
            if (leave["custom-pdigest-parent-id"] == bookID) break;
            leave = attrMap.get(leave["custom-pdigest-parent-id"]);
            if (leave) lnk.push(leave);
        } while (leave);
        return lnk;
    }).map(list => {
        const line: string[] = [];
        for (const attr of list) line.push(get_siyuan_lnk_md(attr.id, attr.title));
        line.push(get_siyuan_lnk_md(bookID, bookName));
        return `${line.join(" -> ")}\n{: id="${NewNodeID()}"}\n{: id="${NewNodeID()}"}`;
    });

    const hpath = await getHPathByDocID(bookID, "trace");
    const trace = await getTraceDoc(bookID, boxID, hpath);
    await siyuan.clearAll(trace);
    await siyuan.insertBlockAsChildOf(lines.join("\n"), trace);
    await openTab({
        app: plugin.app,
        doc: {
            id: trace,
            zoomIn: false,
            action: ["cb-get-hl", "cb-get-context"],
        },
    });
}


function parseIAL(ial: string) {
    const attrs = ial.matchAll(/([^\s]+)="([^\s]+)"/g);
    const obj = {} as AttrType;
    for (const attr of attrs) obj[attr[1]] = attr[2];
    return obj;
}

export async function finishDigest(docName: string, lastID: string, digestID: string, ctime: string, plugin: Plugin) {
    await siyuan.removeRiffCards([digestID]);
    await siyuan.setBlockAttrs(digestID, { "custom-pdigest-ctime": "🔨#" + ctime } as AttrType);
    await siyuan.renameDocByID(digestID, "🔨" + docName);
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
    if (selected == null || selected.length == 0) return;
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
        changeBG(div);
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
    addPlusLnk(selected, digestID, lute);
}

async function addPlusLnk(selected: HTMLElement[], digestID: string, lute: Lute) {
    const div = selected[selected.length - 1];
    const edit = getContenteditableElement(div);
    if (edit) {
        const span = edit.appendChild(document.createElement("span")) as HTMLElement;
        set_href(span, digestID, "+");
        return siyuan.safeUpdateBlock(div.getAttribute(DATA_NODE_ID), lute.BlockDOM2Md(div.outerHTML));
    }
}

async function changeBG(div: HTMLElement) {
    div.style.backgroundColor = "var(--b3-font-background11)";
    const attrs = { "style": "background-color: var(--b3-font-background11);" } as AttrType;
    return siyuan.setBlockAttrs(div.getAttribute(DATA_NODE_ID), attrs);
}

