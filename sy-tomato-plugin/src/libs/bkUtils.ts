import { Lute } from "siyuan";
import { isIterable } from "./functional";
import { BACKLINK_CACHE_TIME, BLOCK_REF, BlockNodeEnum, DATA_ID, DATA_NODE_ID, DATA_SUBTYPE, DATA_TYPE, SPACE, STATICLINK, TOMATO_BK_STATIC } from "./gconst";
import { NewLute, cleanDiv, dom2div, getID, set_href, siyuan, siyuanCache } from "./utils";
import { BKMaker } from "@/BackLinkBottomBox";

// export function setReadonly(e: HTMLElement, all = false) {
//     e.setAttribute("contenteditable", "false");
//     if (all) e.querySelectorAll('[contenteditable="true"]')?.forEach(sub => {
//         sub?.setAttribute("contenteditable", "false");
//     });
//     return e;
// }

export function deleteSelf(divs: Element[]) {
    divs.forEach(e => e.parentElement?.removeChild(e));
}

export function icon(name: string, size?: number) {
    if (size) {
        return `<svg width="${size}px" height="${size}px"><use xlink:href="#icon${name}"></use></svg>`;
    }
    return `<svg><use xlink:href="#icon${name}"></use></svg>`;
}

export async function shouldInsertDiv(lastID: string, docID: string) {
    const allIDs = await siyuanCache.getTailChildBlocks(2500, docID, 5);
    if (isIterable(allIDs)) {
        for (const { id } of allIDs) {
            if (id === lastID) {
                return true;
            }
        }
    }
    return false;
}

// export function getSecondLastElementID(item: HTMLElement) {
//     let last = item.lastElementChild.previousElementSibling as HTMLElement;
//     if (!last) last = item.lastElementChild as HTMLElement;
//     return last.getAttribute(DATA_NODE_ID);
// }

export function getLastElementID(item: HTMLElement) {
    return item?.lastElementChild?.getAttribute(DATA_NODE_ID) ?? "";
}

export const MENTION_CACHE_TIME = 1 * 60 * 1000;

export const MENTION_COUTING_SPAN = "MENTION_COUTING_SPAN";

export function integrateCounting(self: BKMaker) {
    self.container?.querySelector(`[${MENTION_COUTING_SPAN}]`)?.appendChild(self.mentionCounting);
}

export async function cleanBackLinks(docID: string) {
    const rows = await siyuan.getDocAttrs(docID, TOMATO_BK_STATIC);
    const bk = (await Promise.all(rows.map(r => siyuan.getRowByID(r.block_id))))
        .filter(b => b.subtype == "h1");
    for (const i of bk) {
        const { doOperations } = await siyuan.getHeadingDeleteTransaction(i.id);
        await siyuan.transactions(doOperations);
    }
}

export async function insertBackLinks(docID: string) {
    const lute: Lute = NewLute();
    const allRefs: RefCollector = new Map();
    const backlink2 = await siyuan.getBacklink2(docID);
    let md = [`# 静态反链\n{: ${TOMATO_BK_STATIC}="1" }`];

    const links = (await Promise.all(backlink2.backlinks.map(backlink => {
        return siyuan.getBacklinkDoc(docID, backlink.id);
    })))
        .map((i) => i.backlinks)
        .flat()
        .filter((bk) => !!bk);

    const backLinks = links.map((bk) => {
        const bkDiv = dom2div(bk.dom);
        return { bk, bkDiv } as BacklinkSv;
    });
    await Promise.all(backLinks.map((backLink) => path2div(backLink, docID, allRefs)));
    await Promise.all(backLinks.map((backLink) => scanAllRef(backLink.bkDiv, docID, allRefs)));

    const lnkLine = [...allRefs.values()].reduce((md, i) => {
        md.push(`[[[${i.text}]]](siyuan://blocks/${i.id}?focus=1)^${i.count}^`);
        return md;
    }, []).join(SPACE.repeat(2));
    if (lnkLine) md.push(lnkLine + `\n{: ${STATICLINK}="1" }`);

    md = links.reduce((list, bk) => {
        if (pushPath(bk, list, docID)) {
            pushDom(bk, lute, list);
        }
        return list;
    }, md);

    const content = md.join("\n");
    await siyuan.appendBlock(content, docID);
}

function pushDom(bk: Backlink, lute: Lute, list: string[]) {
    const div = document.createElement("div") as HTMLElement;
    div.innerHTML = bk.dom;
    cleanDiv(div.firstElementChild as any, false, false);
    div.querySelectorAll(`[${DATA_SUBTYPE}="h1"]`).forEach((e: HTMLElement) => {
        e.setAttribute(DATA_SUBTYPE, "h2");
    });
    div.querySelectorAll(`[${DATA_TYPE}~="${BLOCK_REF}"]`).forEach((e: HTMLElement) => {
        const id = e.getAttribute(DATA_ID);
        set_href(e, id);
    });
    const md = lute.BlockDOM2Md(div.innerHTML);
    list.push(md);
}

function pushPath(bk: Backlink, list: string[], docID: string) {
    const file = bk.blockPaths[0];
    const target = bk.blockPaths[bk.blockPaths.length - 1];
    if (docID == file?.id) return false;
    file.name = file.name?.split("/")?.pop() ?? "";
    bk.blockPaths[0] = file;
    target.name = "[@]";
    bk.blockPaths[bk.blockPaths.length - 1] = target;
    const path = bk.blockPaths.map(p => `[${p.name}](siyuan://blocks/${p.id})`);
    list.push(`📃${path.join("---")}\n{: ${STATICLINK}="1" }`);
    return true;
}

export async function path2div(backlinkSv: BacklinkSv, docID: string, allRefs: RefCollector) {
    for (const blockPath of backlinkSv.bk.blockPaths.slice(0, -1)) {
        if (blockPath.type == BlockNodeEnum.NODE_DOCUMENT) {
            const fileName = blockPath.name.split("/").pop();
            await addRef(fileName, blockPath.id, docID, allRefs);
            if (backlinkSv.attrs) backlinkSv.attrs.isThisDoc = blockPath.id == docID;
        } else if (blockPath.type == BlockNodeEnum.NODE_HEADING) {
            await addRef(blockPath.name, blockPath.id, docID, allRefs);
        } else {
            const { dom } = await siyuanCache.getBlockDOM(
                2 * BACKLINK_CACHE_TIME,
                blockPath.id,
            );
            await scanAllRef(dom2div(dom), docID, allRefs);
        }
    }
}

export async function scanAllRef(div: HTMLElement, docID: string, allRefs: RefCollector) {
    for (const element of div.querySelectorAll(
        `[${DATA_TYPE}~="${BLOCK_REF}"]`,
    )) {
        const id = element.getAttribute(DATA_ID);
        const txt = element.textContent;
        await addRef(txt, id, docID, allRefs, getID(element));
    }
}

async function addRef(txt: string, id: string, docID: string, allRefs: RefCollector, dataNodeID?: string) {
    if (txt == "*" || txt == "@" || txt == "@*") return;
    if (
        Array.from(
            txt.matchAll(/^c?\d{4}-\d{2}-\d{2}(@第\d+周-星期.{1})?$/g),
        ).length > 0
    )
        return;
    if (!dataNodeID) dataNodeID = id;
    const key = id + txt;
    const value: LinkItem =
        allRefs.get(key) ??
        ({ count: 0, dataNodeIDSet: new Set(), attrs: {} } as LinkItem);
    if (!value.dataNodeIDSet.has(dataNodeID)) {
        value.count += 1;
        value.dataNodeIDSet.add(dataNodeID);
        value.id = id;
        value.text = txt;
        value.attrs = {
            isThisDoc:
                id == docID ||
                (await getRootID(dataNodeID)) == docID,
        };
        allRefs.set(key, value);
    }
}

async function getRootID(dataNodeID: string) {
    const row = await siyuanCache.sqlOne(
        MENTION_CACHE_TIME,
        `select root_id from blocks where id="${dataNodeID}"`,
    );
    return row?.root_id ?? "";
}