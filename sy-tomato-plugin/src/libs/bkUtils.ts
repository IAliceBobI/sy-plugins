import { isIterable } from "./functional";
import { DATA_NODE_ID } from "./gconst";
import { siyuanCache } from "./utils";
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
