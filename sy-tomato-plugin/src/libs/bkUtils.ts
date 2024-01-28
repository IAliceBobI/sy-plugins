import { Plugin, openTab } from "siyuan";
import { BLOCK_REF, DATA_ID, DATA_NODE_ID, DATA_TYPE, WEB_SPACE } from "./gconst";
import { SearchEngine } from "./search";
import { chunks, extractLinks, siyuanCache } from "./utils";

export function setReadonly(e: HTMLElement, all = false) {
    e.setAttribute("contenteditable", "false");
    if (all) e.querySelectorAll('[contenteditable="true"]')?.forEach(sub => {
        sub?.setAttribute("contenteditable", "false");
    });
    return e;
}

// export function refTag(id: string, text: string, count: number, len?: number): HTMLSpanElement {
//     const span = document.createElement("span") as HTMLSpanElement;
//     const refSpan = span.appendChild(document.createElement("span"));
//     refSpan.setAttribute(DATA_TYPE, BLOCK_REF);
//     refSpan.setAttribute(DATA_ID, id);
//     refSpan.innerText = text;
//     if (len) {
//         let sliced = text.slice(0, len);
//         if (sliced.length != text.length) sliced += "……";
//         refSpan.innerText = sliced;
//     }
//     const countSpan = span.appendChild(document.createElement("span"));
//     if (count > 0) {
//         countSpan.classList.add("tomato-style__code");
//         countSpan.innerText = String(count);
//     }
//     return span;
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
    // const totalLen = self.protyle.contentElement.scrollHeight;
    // const scrollPosition = self.protyle.contentElement.scrollTop;
    // const winHeight = window.innerHeight;
    // if (1000 + scrollPosition + winHeight >= totalLen) {
    //     l(`${1000 + scrollPosition + winHeight} > ${totalLen}`)
    //     return true;
    // }
    // return false;
    const allIDs = await siyuanCache.getTailChildBlocks(2500, docID, 5);
    for (const { id } of allIDs) {
        if (id === lastID) {
            return true;
        }
    }
    return false;
}

export function getSecondLastElementID(item: HTMLElement) {
    let last = item.lastElementChild.previousElementSibling as HTMLElement;
    if (!last) last = item.lastElementChild as HTMLElement;
    return last.getAttribute(DATA_NODE_ID);
}

export function getLastElementID(item: HTMLElement) {
    return item.lastElementChild.getAttribute(DATA_NODE_ID);
}

export function createEyeBtn() {
    const btn = document.createElement("button");
    btn.title = "隐藏";
    btn.classList.add("b3-button");
    btn.classList.add("b3-button--text");
    btn.style.border = "none";
    btn.style.outline = "none";
    btn.innerHTML = icon("Eye");
    return btn;
}

export const MENTION_CACHE_TIME = 1 * 60 * 1000;

export interface IBKMaker {
    plugin: Plugin
    docID: string
    container: HTMLElement;
    label: HTMLElement;
    freezeCheckBox: HTMLInputElement;
    mentionCount: number;
    shouldFreeze: boolean;
    mentionCounting: HTMLSpanElement;
    blBox: any;
    settingCfg: TomatoSettings;
}

export async function getBackLinks(self: IBKMaker) {
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

    refreshTopDiv(self, topDiv, allRefs);

    self.container.querySelectorAll(`[${DATA_TYPE}~="${BLOCK_REF}"]`).forEach((e: HTMLElement) => {
        const btn = document.createElement("button") as HTMLButtonElement;
        btn.setAttribute(DATA_ID, e.getAttribute(DATA_ID));
        btn.style.border = "transparent";
        btn.style.background = "var(--b3-button)";
        btn.style.color = "var(--b3-protyle-inline-blockref-color)";
        btn.textContent = e.textContent;
        btn.addEventListener("click", () => {
            setTimeout(() => {
                openTab({ app: self.plugin.app, doc: { id: e.getAttribute(DATA_ID), action: ["cb-get-all", "cb-get-focus"] } });
            }, 2500);
            window.location.href = "siyuan://blocks/" + e.getAttribute(DATA_ID);
        });
        e.parentElement.replaceChild(btn, e);
    });
}

export const MENTION_COUTING_SPAN = "MENTION_COUTING_SPAN";

export async function integrateCounting(self: IBKMaker) {
    self.container.querySelector(`[${MENTION_COUTING_SPAN}]`)?.appendChild(self.mentionCounting);
}

function refreshTopDiv(self: IBKMaker, topDiv: HTMLDivElement, allRefs: RefCollector) {
    topDiv.innerHTML = "";
    for (const { lnk, id } of allRefs.values()) {
        const d = topDiv.appendChild(document.createElement("span"));
        markQueryable(d);
        const btn = d.appendChild(createEyeBtn());
        btn.addEventListener("click", () => {
            freeze(self);
            self.container.querySelectorAll(`[${QUERYABLE_ELEMENT}]`).forEach((e: HTMLElement) => {
                const divs = e.querySelectorAll(`[${DATA_ID}="${id}"]`);
                if (divs.length > 0) {
                    e.style.display = "none";
                }
            });
        });
        d.appendChild(lnk);
        d.appendChild(createSpan(WEB_SPACE.repeat(2)));
    }
}

function searchInDiv(self: IBKMaker, query: string) {
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

async function fillContent(self: IBKMaker, backlinksInDoc: Backlink, allRefs: RefCollector, tc: HTMLElement) {
    const temp = document.createElement("div") as HTMLDivElement;
    markQueryable(temp);
    const div = document.createElement("div") as HTMLDivElement;
    div.innerHTML = backlinksInDoc?.dom ?? "";
    scanAllRef(allRefs, div, self.docID);
    temp.appendChild(await path2div(self, temp, backlinksInDoc?.blockPaths ?? [], allRefs));
    temp.appendChild(div);
    tc.appendChild(temp);
}

async function path2div(self: IBKMaker, docBlock: HTMLElement, blockPaths: BlockPath[], allRefs: RefCollector) {
    const div = document.createElement("div") as HTMLDivElement;
    const btn = div.appendChild(createEyeBtn());
    btn.addEventListener("click", () => {
        freeze(self);
        docBlock.style.display = "none";
    });
    const refPathList: HTMLSpanElement[] = [];
    for (const ret of chunks(await Promise.all(blockPaths.map((refPath) => {
        return [refPath, siyuanCache.getBlockKramdown(MENTION_CACHE_TIME, refPath.id)];
    }).flat()), 2)) {
        const [refPath, { kramdown: _kramdown }] = ret as [BlockPath, GetBlockKramdown];
        if (refPath.type == "NodeDocument") {
            if (refPath.id == self.docID) break;
            const fileName = refPath.name.split("/").pop();
            refPathList.push(refTag(refPath.id, fileName, 0));
            addRef(fileName, refPath.id, allRefs, self.docID);
            continue;
        }

        if (refPath.type == "NodeHeading") {
            refPathList.push(refTag(refPath.id, refPath.name, 0));
            addRef(refPath.name, refPath.id, allRefs, self.docID);
        } else {
            refPathList.push(refTag(refPath.id, refPath.name, 0, 15));
        }

        let kramdown = _kramdown;
        if (refPath.type == "NodeListItem" && kramdown) {
            kramdown = kramdown.split("\n")[0];
        }
        if (kramdown) {
            const { idLnks } = extractLinks(kramdown);
            for (const idLnk of idLnks) {
                addRef(idLnk.txt, idLnk.id, allRefs, self.docID);
            }
        }
    }
    refPathList.forEach((s, idx, arr) => {
        s = s.cloneNode(true) as HTMLScriptElement;
        if (idx < arr.length - 1) {
            s.appendChild(createSpan("  ➡  "));
        } else {
            const e = s.querySelector(`[${DATA_ID}]`);
            if (e) {
                e.textContent = "[...]";
            }
        }
        div.appendChild(s);
    });
    return div;
}

