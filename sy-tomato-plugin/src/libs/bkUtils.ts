import { DATA_NODE_ID } from "./gconst";
import { SearchEngine } from "./search";
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
    for (const { id } of allIDs) {
        if (id === lastID) {
            return true;
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
    return item.lastElementChild.getAttribute(DATA_NODE_ID);
}

export const MENTION_CACHE_TIME = 1 * 60 * 1000;

export async function getBackLinks(self: BKMaker) {
    const allRefs: RefCollector = new Map();
    const backlink2 = await siyuanCache.getBacklink2(6 * 1000, self.docID);
    const contentContainer = document.createElement("div");
    const btnDiv = document.createElement("div");
    // initBtnDiv(self, btnDiv);
    const topDiv = document.createElement("div");
    self.container.appendChild(topDiv);
    self.container.appendChild(btnDiv);
    self.container.appendChild(contentContainer);

    const maxCount = self.settingCfg["back-link-max-size"] ?? 100;
    for (const backlinkDoc of await Promise.all(backlink2.backlinks.slice(0, maxCount).map((backlink) => {
        return siyuanCache.getBacklinkDoc(12 * 1000, self.docID, backlink.id);
    }))) {
        for (const backlinksInDoc of backlinkDoc.backlinks) {
            contentContainer.appendChild(hr());
            await fillContent(self, backlinksInDoc, allRefs, contentContainer);
        }
    }
    if (self.mentionCount > 0) {
        let count = 0;
        outer: for (const mention of backlink2.backmentions) {
            const mentionDoc = await siyuanCache.getBackmentionDoc(MENTION_CACHE_TIME, self.docID, mention.id);
            for (const mentionItem of mentionDoc.backmentions) {
                contentContainer.appendChild(hr());
                await fillContent(self, mentionItem, allRefs, contentContainer);
                ++count;
                self.mentionCounting.innerText = `提及读取中：${count}`;
                if (count >= self.mentionCount) break outer;
            }
        }
        self.mentionCounting.innerText = "";
    }
    // self.container.querySelectorAll(`[${DATA_TYPE}~="${BLOCK_REF}"]`).forEach((e: HTMLElement) => {
    //     const btn = document.createElement("button") as HTMLButtonElement;
    //     btn.setAttribute(DATA_ID, e.getAttribute(DATA_ID));
    //     btn.style.border = "transparent";
    //     btn.style.background = "var(--b3-button)";
    //     btn.style.color = "var(--b3-protyle-inline-blockref-color)";
    //     btn.textContent = e.textContent;
    //     btn.addEventListener("click", () => {
    //         setTimeout(() => {
    //             openTab({ app: self.plugin.app, doc: { id: e.getAttribute(DATA_ID), action: ["cb-get-all", "cb-get-focus"] } });
    //         }, 2500);
    //         window.location.href = "siyuan://blocks/" + e.getAttribute(DATA_ID);
    //     });
    //     e.parentElement.replaceChild(btn, e);
    // });
}

export const MENTION_COUTING_SPAN = "MENTION_COUTING_SPAN";

export async function integrateCounting(self: BKMaker) {
    self.container.querySelector(`[${MENTION_COUTING_SPAN}]`)?.appendChild(self.mentionCounting);
}

function searchInDiv(self: BKMaker, query: string) {
    const se = new SearchEngine(true);
    se.setQuery(query);
    self.container.querySelectorAll(`[${QUERYABLE_ELEMENT}]`).forEach((e: HTMLElement) => {
        const m = se.match(e.textContent);
        if (!m) {
            e.style.display = "none";
        } else {
            e.style.display = "";
        }
    });
}


