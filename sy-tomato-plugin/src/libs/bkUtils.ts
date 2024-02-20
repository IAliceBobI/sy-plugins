import { Lute } from "siyuan";
import { isIterable } from "./functional";
import { BLOCK_REF, DATA_ID, DATA_NODE_ID, DATA_TYPE } from "./gconst";
import { NewLute, cleanDiv, siyuan, siyuanCache } from "./utils";
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

export async function insertBackLinks(docID: string) {
    const lute: Lute = NewLute();
    const backlink2 = await siyuan.getBacklink2(docID);
    let md = ["* # 静态反链"];
    md = (await Promise.all(backlink2.backlinks.map(backlink => {
        return siyuan.getBacklinkDoc(docID, backlink.id);
    })))
        .map((i) => i.backlinks)
        .flat()
        .filter((bk) => !!bk)
        .reduce((list, bk) => {
            pushPath(bk, list);
            pushDom(bk, lute, list);
            return list;
        }, md);
    const content = md.join("\n");
    await siyuan.appendBlock(content, docID);
}

function pushDom(bk: Backlink, lute: Lute, list: string[]) {
    const div = document.createElement("div") as HTMLElement;
    div.innerHTML = bk.dom;
    cleanDiv(div.firstElementChild as any, false, false);
    div.querySelectorAll(`[${DATA_TYPE}~="${BLOCK_REF}"]`).forEach((e: HTMLElement) => {
        const id = e.getAttribute(DATA_ID);
        e.setAttribute(DATA_TYPE, "a");
        e.setAttribute("data-href", `siyuan://blocks/${id}?focus=1`);
    });
    const md = lute.BlockDOM2Md(div.innerHTML);
    list.push("* " + md);
}

function pushPath(bk: Backlink, list: string[]) {
    const file = bk.blockPaths[0];
    const target = bk.blockPaths[bk.blockPaths.length - 1];
    list.push(`* [${file.name}](siyuan://blocks/${target.id}?focus=1)`);
}
