import { BLOCK_REF, DATA_ID, DATA_NODE_ID, DATA_TYPE } from "./gconst";
import { SearchEngine } from "./search";
import { chunks, extractLinks, isValidNumber, siyuanCache } from "./utils";

export function setReadonly(e: HTMLElement, all = false) {
    e.setAttribute("contenteditable", "false");
    if (all) e.querySelectorAll('[contenteditable="true"]')?.forEach(sub => {
        sub?.setAttribute("contenteditable", "false");
    });
    return e;
}

export const QUERYABLE_ELEMENT = "QUERYABLE_ELEMENT";

export function markQueryable(e: HTMLElement) {
    e.setAttribute(QUERYABLE_ELEMENT, "1");
}

export function hr() {
    return document.createElement("hr");
}

export function createSpan(innerHTML: string) {
    const span = document.createElement("span");
    span.innerHTML = innerHTML;
    return span;
}

export function refTag(id: string, text: string, count: number, len?: number): HTMLSpanElement {
    const span = document.createElement("span") as HTMLSpanElement;

    const refSpan = span.appendChild(document.createElement("span"));
    refSpan.setAttribute(DATA_TYPE, BLOCK_REF);
    refSpan.setAttribute(DATA_ID, id);
    refSpan.innerText = text;
    if (len) {
        let sliced = text.slice(0, len);
        if (sliced.length != text.length) sliced += "……";
        refSpan.innerText = sliced;
    }

    const countSpan = span.appendChild(document.createElement("span"));
    if (count > 0) {
        countSpan.classList.add("tomato-style__code");
        countSpan.innerText = String(count);
    }
    return span;
}

export function scanAllRef(allRefs: RefCollector, div: HTMLDivElement, docID: string) {
    for (const element of div.querySelectorAll(`[${DATA_TYPE}*="${BLOCK_REF}"]`)) {
        const id = element.getAttribute(DATA_ID);
        const txt = element.textContent;
        addRef(txt, id, allRefs, docID);
    }
}

export function addRef(txt: string, id: string, allRefs: RefCollector, docID: string) {
    if (txt != "*" && id != docID) {
        const key = id + txt;
        const c = (allRefs.get(key)?.count ?? 0) + 1;
        const span = refTag(id, txt, c);
        allRefs.set(key, {
            count: c,
            lnk: span,
            text: txt,
            id,
        });
    }
}

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
    const allIDs = await siyuanCache.getChildBlocks(3 * 1000, docID);
    for (const { id } of allIDs.slice(-5)) {
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

export const MENTION_CACHE_TIME = 5 * 60 * 1000;

export interface IBKMaker {
    docID: string
    freeze: Func;
    unfreeze: Func;
    container: HTMLElement;
    label: HTMLElement;
    freezeCheckBox: HTMLInputElement;
    mentionCount: number;
}

export function searchInDiv(self: IBKMaker,query: string) {
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

export async function fillContent(self: IBKMaker, backlinksInDoc: Backlink, allRefs: RefCollector, tc: HTMLElement) {
    const temp = document.createElement("div") as HTMLDivElement;
    markQueryable(temp);
    const div = document.createElement("div") as HTMLDivElement;
    div.innerHTML = backlinksInDoc?.dom ?? "";
    scanAllRef(allRefs, div, self.docID);
    temp.appendChild(await path2div(self, temp, backlinksInDoc?.blockPaths ?? [], allRefs));
    temp.appendChild(div);
    tc.appendChild(temp);
}

export async function path2div(self: IBKMaker, docBlock: HTMLElement, blockPaths: BlockPath[], allRefs: RefCollector) {
    const div = document.createElement("div") as HTMLDivElement;
    const btn = div.appendChild(createEyeBtn());
    btn.addEventListener("click", () => {
        self.freeze();
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
    refPathList.forEach((s, idx) => {
        s = s.cloneNode(true) as HTMLScriptElement;
        if (idx < refPathList.length - 1) {
            s.appendChild(createSpan("  ➡  "));
        }
        div.appendChild(s);
    });
    return div;
}

export function addRefreshCheckBox(self: IBKMaker, topDiv: HTMLDivElement) {
    self.label = topDiv.appendChild(document.createElement("label"));
    {
        self.label.classList.add("b3-label");
        self.label.classList.add("b3-label__text");
        self.label.classList.add("b3-label--noborder");
        topDiv.appendChild(createSpan("&nbsp;".repeat(1)));
    }

    self.freezeCheckBox = topDiv.appendChild(document.createElement("input"));
    {
        self.freezeCheckBox.title = "是否自动刷新";
        self.freezeCheckBox.type = "checkbox";
        self.freezeCheckBox.classList.add("b3-switch");
        self.unfreeze();
        self.freezeCheckBox.addEventListener("change", () => {
            if (self.freezeCheckBox.checked) self.freeze();
            else self.unfreeze();
        });
        topDiv.appendChild(createSpan("&nbsp;".repeat(4)));
    }
}

export function addMentionCheckBox(self: IBKMaker, topDiv: HTMLDivElement) {
    const mentionInput = topDiv.appendChild(document.createElement("input"));
    mentionInput.title = "展开的提及数";
    mentionInput.classList.add("b3-text-field");
    mentionInput.size = 1;
    mentionInput.value = String(self.mentionCount);
    mentionInput.addEventListener("focus", () => {
        self.freeze();
    });
    mentionInput.addEventListener("blur", () => {
        self.unfreeze();
    });
    mentionInput.addEventListener("input", () => {
        const n = Number(mentionInput.value.trim());
        if (isValidNumber(n) && n > 0) {
            self.mentionCount = n;
        } else {
            self.mentionCount = 0;
        }
    });
    topDiv.appendChild(createSpan("&nbsp;".repeat(4)));
}