import { BLOCK_REF, DATA_ID, DATA_NODE_ID, DATA_TYPE } from "./gconst";
import { siyuanCache } from "./utils";

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

export async function sholdInsertDiv(lastID: string, docID: string) {
    // const totalLen = this.protyle.contentElement.scrollHeight;
    // const scrollPosition = this.protyle.contentElement.scrollTop;
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