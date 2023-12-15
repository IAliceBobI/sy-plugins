import { Dialog, Plugin, } from "siyuan";
import { chunks, extractLinks, isValidNumber, siyuanCache } from "./libs/utils";
import { BLOCK_REF, DATA_ID, DATA_NODE_ID, DATA_TYPE } from "./libs/gconst";
import { EventType, events } from "./libs/Events";
import { MaxCache } from "./libs/cache";
import { SearchEngine } from "./libs/search";
import { SEARCH_HELP } from "./constants";

const MENTION_COUTING_SPAN = "MENTION_COUTING_SPAN";
const QUERYABLE_ELEMENT = "QUERYABLE_ELEMENT";
const BKMAKER_ADD = "BKMAKER_ADD";
const MENTION_CACHE_TIME = 5 * 60 * 1000;
const CACHE_LIMIT = 100;

class BKMaker {
    private shouldFreeze: boolean;
    private mentionCount: number = 1;

    private container: HTMLElement;
    private blBox: BackLinkBottomBox;
    private docID: string;
    private item: HTMLElement;
    private mentionCounting: HTMLSpanElement;

    private freezeCheckBox: HTMLInputElement;
    private label: HTMLLabelElement;

    constructor(blBox: BackLinkBottomBox, docID: string) {
        this.docID = docID;
        this.blBox = blBox;
        this.shouldFreeze = false;
        this.mentionCounting = document.createElement("span");
        this.mentionCounting.classList.add("b3-label__text");
    }

    async doTheWork(item: HTMLElement) {
        this.item = item;
        await navigator.locks.request("BackLinkBottomBox-BKMakerLock" + this.docID, { ifAvailable: true }, async (lock) => {
            const divs = await this.findOrLoadFromCache();
            if (lock && !this.shouldFreeze) {
                const [lastID, lastElement] = getLastElementID(this.item);
                if (await this.sholdInsertDiv(lastID)) {
                    // retrieve new data
                    this.container = document.createElement("div");
                    await this.getBackLinks(); // start
                    this.container.style.border = "1px solid black";
                    this.container.setAttribute(BKMAKER_ADD, "1");

                    // put new data into cache
                    this.blBox.divCache.add(this.docID, this.container);

                    if (!this.shouldFreeze) {
                        // substitute old for new
                        this.container.setAttribute(DATA_NODE_ID, lastID);
                        lastElement.insertAdjacentElement("afterend", this.container);
                        this.integrateCounting();
                        deleteSelf(divs);
                    }
                }
            }
        });
    }

    private async integrateCounting() {
        this.container.querySelector(`[${MENTION_COUTING_SPAN}]`)?.appendChild(this.mentionCounting);
    }

    private async sholdInsertDiv(lastID: string) {
        const allIDs = await siyuanCache.getChildBlocks(3 * 1000, this.docID);
        for (const { id } of allIDs.slice(-5)) {
            if (id === lastID) {
                return true;
            }
        }
        return false;
    }

    private async findOrLoadFromCache() {
        const divs = Array.from(this.item.parentElement.querySelectorAll(`[${BKMAKER_ADD}="1"]`)?.values() ?? []);
        const [lastID, lastElement] = getLastElementID(this.item);
        if (await this.sholdInsertDiv(lastID)) {
            let oldEle: HTMLElement;
            if (divs.length == 0) {
                oldEle = this.blBox.divCache.get(this.docID);
                if (oldEle) {
                    lastElement.insertAdjacentElement("afterend", oldEle);
                }
            } else {
                oldEle = divs.pop() as HTMLElement;
                deleteSelf(divs);
            }
            if (oldEle) {
                oldEle.setAttribute(DATA_NODE_ID, lastID);
                this.integrateCounting();
                divs.push(oldEle);
            }
        }
        return divs;
    }

    private async getBackLinks() {
        const allRefs: RefCollector = new Map();
        const backlink2 = await siyuanCache.getBacklink2(6 * 1000, this.docID);
        const contentContainer = document.createElement("div");
        const btnDiv = document.createElement("div");
        this.initBtnDiv(btnDiv);
        const topDiv = document.createElement("div");
        this.container.appendChild(btnDiv);
        this.container.appendChild(topDiv);
        this.container.appendChild(hr());
        this.container.appendChild(contentContainer);

        for (const backlinkDoc of await Promise.all(backlink2.backlinks.map((backlink) => {
            return siyuanCache.getBacklinkDoc(12 * 1000, this.docID, backlink.id);
        }))) {
            for (const backlinksInDoc of backlinkDoc.backlinks) {
                await this.fillContent(backlinksInDoc, allRefs, contentContainer);
            }
        }
        if (this.mentionCount > 0) {
            let count = 0;
            outer: for (const mention of backlink2.backmentions) {
                const mentionDoc = await siyuanCache.getBackmentionDoc(MENTION_CACHE_TIME, this.docID, mention.id);
                for (const mentionItem of mentionDoc.backmentions) {
                    await this.fillContent(mentionItem, allRefs, contentContainer);
                    ++count;
                    this.mentionCounting.innerText = `提及读取中：${count}`;
                    if (count >= this.mentionCount) break outer;
                }
            }
            this.mentionCounting.innerText = "";
        }

        this.refreshTopDiv(topDiv, allRefs);

        topDiv.onclick = (ev) => {
            const selection = document.getSelection();
            if (selection.toString().length <= 0) return;
            ev.stopPropagation();
        };
        contentContainer.onclick = (ev) => {
            const selection = document.getSelection();
            if (selection.toString().length <= 0) return;
            ev.stopPropagation();
        };

        setReadonly(topDiv, true);
        setReadonly(contentContainer, true);
    }

    private refreshTopDiv(topDiv: HTMLDivElement, allRefs: RefCollector) {
        topDiv.innerHTML = "";
        for (const { lnk, id } of allRefs.values()) {
            const d = topDiv.appendChild(document.createElement("span"));
            markQueryable(d);
            const btn = d.appendChild(this.createEyeBtn());
            btn.addEventListener("click", () => {
                this.freeze();
                this.container.querySelectorAll(`[${QUERYABLE_ELEMENT}]`).forEach((e: HTMLElement) => {
                    const divs = e.querySelectorAll(`[${DATA_ID}="${id}"]`);
                    if (divs.length > 0) {
                        e.style.display = "none";
                    }
                });
            });
            d.appendChild(lnk);
            d.appendChild(createSpan("&nbsp;".repeat(7)));
        }
    }

    private freeze() {
        this.shouldFreeze = true;
        this.freezeCheckBox.checked = true;
        this.label.innerHTML = icon("Focus", 15);
    }

    private unfreeze() {
        this.shouldFreeze = false;
        this.freezeCheckBox.checked = false;
        this.label.innerHTML = icon("Play", 15);
    }

    private initBtnDiv(topDiv: HTMLDivElement) {
        this.addRefreshCheckBox(topDiv);
        this.addMentionCheckBox(topDiv);
        {
            const help = topDiv.appendChild(document.createElement("span"));
            help.classList.add("b3-label__text");
            help.title = "搜索语法";
            help.innerHTML = icon("Help", 20);
            help.addEventListener("click", () => { new Dialog({ title: "搜索语法", content: SEARCH_HELP }); });
            topDiv.appendChild(createSpan("&nbsp;".repeat(1)));
        }
        const query = topDiv.appendChild(document.createElement("input"));
        setReadonly(query);
        {
            query.title = "必须包含AA、BB，DD与EE至少包含一个，但不能包含CC，也不能包含FF";
            query.classList.add("b3-text-field");
            query.placeholder = "AA BB !CC DD|EE !FF";
            query.addEventListener("focus", () => { this.freeze(); });
            query.addEventListener("input", (event) => {
                const newValue: string = (event.target as any).value;
                this.searchInDiv(newValue.trim());
            });
            topDiv.appendChild(createSpan("&nbsp;".repeat(2)));
        }
        {
            const btn = topDiv.appendChild(document.createElement("button")) as HTMLButtonElement;
            setReadonly(btn);
            btn.title = "粘贴内容到查询框，并锁定";
            btn.classList.add("b3-button");
            btn.classList.add("b3-button--outline");
            btn.addEventListener("click", () => {
                this.freeze();
                navigator.clipboard.readText().then(t => {
                    query.value = t;
                    this.searchInDiv(query.value);
                });
            });
            btn.innerHTML = icon("Paste");
            topDiv.appendChild(createSpan("&nbsp;".repeat(2)));
        }
        {
            const btn = topDiv.appendChild(document.createElement("button")) as HTMLButtonElement;
            setReadonly(btn);
            btn.title = "清空查询框，并解除锁定";
            btn.classList.add("b3-button");
            btn.classList.add("b3-button--outline");
            btn.addEventListener("click", () => {
                this.unfreeze();
                query.value = "";
                this.searchInDiv(query.value);
            });
            btn.innerHTML = icon("Trashcan");
            topDiv.appendChild(createSpan("&nbsp;".repeat(2)));
        }
        const container_mention_counting = topDiv.appendChild(document.createElement("span"));
        container_mention_counting.setAttribute(MENTION_COUTING_SPAN, "1");
    }

    private searchInDiv(query: string) {
        const se = new SearchEngine(true);
        se.setQuery(query);
        this.container.querySelectorAll(`[${QUERYABLE_ELEMENT}]`).forEach((e: HTMLElement) => {
            const m = se.match(e.textContent);
            if (!m) {
                e.style.display = "none";
            } else {
                e.style.display = "";
            }
        });
    }

    private addMentionCheckBox(topDiv: HTMLDivElement) {
        const mentionInput = topDiv.appendChild(document.createElement("input"));
        setReadonly(mentionInput);
        mentionInput.title = "展开的提及数";
        mentionInput.classList.add("b3-text-field");
        mentionInput.size = 1;
        mentionInput.value = String(this.mentionCount);
        mentionInput.addEventListener("focus", () => {
            this.freeze();
        });
        mentionInput.addEventListener("blur", () => {
            this.unfreeze();
        });
        mentionInput.addEventListener("input", () => {
            const n = Number(mentionInput.value.trim());
            if (isValidNumber(n) && n > 0) {
                this.mentionCount = n;
            } else {
                this.mentionCount = 0;
            }
        });
        topDiv.appendChild(createSpan("&nbsp;".repeat(4)));
    }

    private addRefreshCheckBox(topDiv: HTMLDivElement) {
        this.label = topDiv.appendChild(document.createElement("label"));
        setReadonly(this.label);
        {
            this.label.classList.add("b3-label");
            this.label.classList.add("b3-label__text");
            this.label.classList.add("b3-label--noborder");
            topDiv.appendChild(createSpan("&nbsp;".repeat(1)));
        }

        this.freezeCheckBox = topDiv.appendChild(document.createElement("input"));
        setReadonly(this.freezeCheckBox);
        {
            this.freezeCheckBox.title = "是否自动刷新";
            this.freezeCheckBox.type = "checkbox";
            this.freezeCheckBox.classList.add("b3-switch");
            this.unfreeze();
            this.freezeCheckBox.addEventListener("change", () => {
                if (this.freezeCheckBox.checked) this.freeze();
                else this.unfreeze();
            });
            topDiv.appendChild(createSpan("&nbsp;".repeat(4)));
        }
    }

    private async fillContent(backlinksInDoc: Backlink, allRefs: RefCollector, tc: HTMLElement) {
        const temp = document.createElement("div") as HTMLDivElement;
        markQueryable(temp);
        const div = document.createElement("div") as HTMLDivElement;
        div.innerHTML = backlinksInDoc?.dom ?? "";
        scanAllRef(allRefs, div, this.docID);
        temp.appendChild(await this.path2div(temp, backlinksInDoc?.blockPaths ?? [], allRefs));
        temp.appendChild(div);
        tc.appendChild(temp);
    }

    private async path2div(docBlock: HTMLElement, blockPaths: BlockPath[], allRefs: RefCollector) {
        const div = document.createElement("div") as HTMLDivElement;
        const btn = div.appendChild(this.createEyeBtn());
        btn.addEventListener("click", () => {
            this.freeze();
            docBlock.style.display = "none";
        });
        const refPathList: HTMLSpanElement[] = [];
        for (const ret of chunks(await Promise.all(blockPaths.map((refPath) => {
            return [refPath, siyuanCache.getBlockKramdown(MENTION_CACHE_TIME, refPath.id)];
        }).flat()), 2)) {
            const [refPath, { kramdown: _kramdown }] = ret as [BlockPath, GetBlockKramdown];
            if (refPath.type == "NodeDocument") {
                if (refPath.id == this.docID) break;
                const fileName = refPath.name.split("/").pop();
                refPathList.push(refTag(refPath.id, fileName, 0));
                addRef(fileName, refPath.id, allRefs, this.docID);
                continue;
            }

            if (refPath.type == "NodeHeading") {
                refPathList.push(refTag(refPath.id, refPath.name, 0));
                addRef(refPath.name, refPath.id, allRefs, this.docID);
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
                    addRef(idLnk.txt, idLnk.id, allRefs, this.docID);
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

    private createEyeBtn() {
        const btn = document.createElement("button");
        btn.title = "隐藏";
        btn.classList.add("b3-button");
        btn.classList.add("b3-button--text");
        btn.style.border = "none";
        btn.style.outline = "none";
        btn.innerHTML = icon("Eye");
        return btn;
    }
}

class BackLinkBottomBox {
    public plugin: Plugin;
    public divCache: MaxCache<HTMLElement> = new MaxCache(CACHE_LIMIT);

    private makerCache: MaxCache<BKMaker> = new MaxCache(CACHE_LIMIT);
    private observer: MutationObserver;
    private docID: string = "";

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        events.addListener("BackLinkBottomBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static || eventType == EventType.switch_protyle) {
                navigator.locks.request("BackLinkBottomBoxLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        const item = detail.protyle?.wysiwyg?.element;
                        if (!item) return;
                        const nextDocID = detail.protyle?.block.rootID ?? "";
                        if (!nextDocID) return;
                        if (this.docID != nextDocID) {
                            this.docID = nextDocID;
                            // OB
                            this.observer?.disconnect();
                            const maker = this.makerCache.getOrElse(nextDocID, () => { return new BKMaker(this, nextDocID); });
                            maker.doTheWork(item);
                            let [lastElementID] = getLastElementID(item);
                            this.observer = new MutationObserver((_mutationsList) => {
                                const [newLastID] = getLastElementID(item);
                                if (newLastID != lastElementID) {
                                    lastElementID = newLastID;
                                    maker.doTheWork(item);
                                }
                            });
                            this.observer.observe(item, { childList: true });
                        } else {
                            const maker = this.makerCache.getOrElse(nextDocID, () => { return new BKMaker(this, nextDocID); });
                            maker.doTheWork(item);
                        }
                    }
                });
            }
        });
    }
}

export const backLinkBottomBox = new BackLinkBottomBox();

function getLastElementID(item: HTMLElement): [string, HTMLElement] {
    let last = item.lastElementChild.previousElementSibling as HTMLElement;
    if (!last) last = item.lastElementChild as HTMLElement;
    return [last.getAttribute(DATA_NODE_ID), last];
}

function markQueryable(e: HTMLElement) {
    e.setAttribute(QUERYABLE_ELEMENT, "1");
}

function hr() {
    return setReadonly(document.createElement("hr"));
}

function createSpan(innerHTML: string) {
    const span = document.createElement("span");
    setReadonly(span);
    span.innerHTML = innerHTML;
    return span;
}

function setReadonly(e: HTMLElement, all = false) {
    e.setAttribute("contenteditable", "false");
    if (all) e.querySelectorAll('[contenteditable="true"]')?.forEach(sub => {
        sub?.setAttribute("contenteditable", "false");
    });
    return e;
}

function refTag(id: string, text: string, count: number, len?: number): HTMLSpanElement {
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

function scanAllRef(allRefs: RefCollector, div: HTMLDivElement, docID: string) {
    for (const element of div.querySelectorAll(`[${DATA_TYPE}*="${BLOCK_REF}"]`)) {
        const id = element.getAttribute(DATA_ID);
        const txt = element.textContent;
        addRef(txt, id, allRefs, docID);
    }
}

function addRef(txt: string, id: string, allRefs: RefCollector, docID: string) {
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

function deleteSelf(divs: Element[]) {
    divs.forEach(e => e.parentElement?.removeChild(e));
}

function icon(name: string, size?: number) {
    if (size) {
        return `<svg width="${size}px" height="${size}px"><use xlink:href="#icon${name}"></use></svg>`;
    }
    return `<svg><use xlink:href="#icon${name}"></use></svg>`;
}
