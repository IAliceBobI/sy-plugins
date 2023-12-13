import { Plugin, } from "siyuan";
import { chunks, extractLinks, isValidNumber, siyuanCache, sleep } from "./libs/utils";
import { DATA_ID, DATA_NODE_ID, DATA_TYPE } from "./libs/gconst";
import { EventType, events } from "./libs/Events";

const QUERYABLE_ELEMENT = "QUERYABLE_ELEMENT";
const BKMAKER_ADD = "BKMAKER_ADD";
const MENTION_CACHE_TIME = 5 * 60 * 1000;
const CACHE_LIMIT = 100;
const FETCH_INTERVAL = 3000;

class BKMaker {
    private container: HTMLElement;
    private blBox: BackLinkBottomBox;
    private docID: string;
    private item: HTMLElement;
    shouldFreeze: boolean;
    constructor(blBox: BackLinkBottomBox) {
        this.blBox = blBox;
        this.item = blBox.item;
        this.docID = blBox.docID;
        this.shouldFreeze = false;
    }

    async doTheWork() {
        await navigator.locks.request("BackLinkBottomBox-BKMakerLock" + this.docID, { ifAvailable: true }, async (lock) => {
            if (lock) {
                if (!this.shouldFreeze) {
                    const allIDs = await siyuanCache.getChildBlocks(5 * 1000, this.docID);
                    const lastID = this.item.lastElementChild.getAttribute(DATA_NODE_ID);
                    if (allIDs?.slice(-5)?.map(b => b.id)?.includes(lastID)) {
                        const startTime = new Date().getTime();

                        // find or load from cache
                        const divs = Array.from(this.item.parentElement.querySelectorAll(`[${BKMAKER_ADD}="1"]`)?.values() ?? []);
                        if (divs.length == 0) {
                            const oldEle = this.blBox.getCache(this.docID, null);
                            if (oldEle) {
                                this.item.lastElementChild.insertAdjacentElement("afterend", oldEle);
                                divs.push(oldEle);
                            }
                        }

                        // retrieve new data
                        this.container = document.createElement("div");
                        await this.getBackLinks(); // start
                        this.container.setAttribute(DATA_NODE_ID, lastID);
                        this.container.style.border = "1px solid black";
                        this.container.setAttribute(BKMAKER_ADD, "1");

                        // put new data into cache
                        this.blBox.addCache(this.docID, this.container);

                        if (!this.shouldFreeze) {
                            // substitute old for new
                            this.item.lastElementChild.insertAdjacentElement("afterend", this.container);
                            divs.forEach(e => e.parentElement?.removeChild(e));
                        }
                        const duration = (new Date().getTime()) - startTime;
                        const remainTime = FETCH_INTERVAL - duration;
                        if (remainTime > 0) {
                            await sleep(remainTime);
                        }
                    }
                }
            } else {
                const oldEle = this.blBox.getCache(this.docID, null);
                if (oldEle) {
                    this.item.lastElementChild.insertAdjacentElement("afterend", oldEle);
                }
            }
        });
    }

    private shouldStop() {
        return this.docID != this.blBox.docID;
    }

    private async getBackLinks() {
        const allRefs: RefCollector = new Map();
        const backlink2 = await siyuanCache.getBacklink2(15 * 1000, this.docID);
        const contentContainer = document.createElement("div");
        const btnDiv = document.createElement("div");
        this.initBtnDiv(btnDiv);
        const topDiv = document.createElement("div");
        this.container.appendChild(btnDiv);
        this.container.appendChild(topDiv);
        this.container.appendChild(hr());
        this.container.appendChild(contentContainer);

        for (const backlinkDoc of await Promise.all(backlink2.backlinks.map((backlink) => {
            return siyuanCache.getBacklinkDoc(20 * 1000, this.docID, backlink.id);
        }))) {
            for (const backlinksInDoc of backlinkDoc.backlinks) {
                if (this.shouldStop()) return;
                await this.fillContent(backlinksInDoc, allRefs, contentContainer);
            }
        }
        if (this.blBox.mentionCount > 0) {
            let count = 0;
            outer: for (const mention of backlink2.backmentions) {
                if (this.shouldStop()) return;
                const mentionDoc = await siyuanCache.getBackmentionDoc(MENTION_CACHE_TIME, this.docID, mention.id);
                for (const mentionItem of mentionDoc.backmentions) {
                    if (this.shouldStop()) return;
                    await this.fillContent(mentionItem, allRefs, contentContainer);
                    if (++count >= this.blBox.mentionCount) break outer;
                }
            }
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
        for (const { lnk } of allRefs.values()) {
            const d = topDiv.appendChild(document.createElement("span"));
            markQueryable(d);
            d.appendChild(lnk);
            d.appendChild(createSpan("&nbsp;".repeat(7)));
        }
    }

    private initBtnDiv(topDiv: HTMLDivElement) {
        const { freezeCheckBox, label } = this.addRefreshCheckBox(topDiv);
        const clickQueryField = () => {
            this.shouldFreeze = true;
            freezeCheckBox.checked = true;
            label.innerText = "🚫";
        };
        this.addMentionCheckBox(topDiv, clickQueryField, freezeCheckBox, label);
        const query = topDiv.appendChild(document.createElement("input"));
        setReadonly(query);
        {
            query.classList.add("b3-text-field");
            query.placeholder = "反链过滤";
            query.addEventListener("focus", clickQueryField);
            query.addEventListener("input", (event) => {
                const newValue: string = (event.target as any).value;
                this.searchInDiv(newValue.trim());
            });
            topDiv.appendChild(createSpan("&nbsp;".repeat(2)));
        }
        {
            const btn = topDiv.appendChild(document.createElement("button")) as HTMLButtonElement;
            setReadonly(btn);
            btn.title = "粘贴内容到查询框";
            btn.classList.add("b3-button");
            btn.classList.add("b3-button--outline");
            btn.addEventListener("click", async () => {
                clickQueryField();
                query.value = (await navigator.clipboard.readText()).trim();
                this.searchInDiv(query.value);
            });
            btn.innerHTML = "<svg><use xlink:href=\"#iconPaste\"></use></svg>";
            topDiv.appendChild(createSpan("&nbsp;".repeat(2)));
        }
        {
            const btn = topDiv.appendChild(document.createElement("button")) as HTMLButtonElement;
            setReadonly(btn);
            btn.title = "清空查询框";
            btn.classList.add("b3-button");
            btn.classList.add("b3-button--outline");
            btn.addEventListener("click", async () => {
                clickQueryField();
                query.value = "";
                this.searchInDiv(query.value);
            });
            btn.innerHTML = "<svg><use xlink:href=\"#iconTrashcan\"></use></svg>";
        }
    }

    private searchInDiv(newValue: string) {
        this.container.querySelectorAll(`[${QUERYABLE_ELEMENT}="1"]`).forEach(e => {
            const el = e as HTMLElement;
            if (!e.textContent.toLowerCase().includes(newValue.toLowerCase())) {
                el.style.display = "none";
            } else {
                el.style.display = "";
            }
        });
    }

    private addMentionCheckBox(topDiv: HTMLDivElement, clickQueryField: Func, freezeCheckBox: HTMLInputElement, label: HTMLElement) {
        const mentionInput = topDiv.appendChild(document.createElement("input"));
        setReadonly(mentionInput);
        mentionInput.title = "展开的提及数";
        mentionInput.classList.add("b3-text-field");
        mentionInput.size = 1;
        mentionInput.value = String(this.blBox.mentionCount);
        mentionInput.addEventListener("focus", () => {
            clickQueryField();
        });
        mentionInput.addEventListener("blur", () => {
            this.shouldFreeze = freezeCheckBox.checked = false;
            label.innerText = "🔄";
        });
        mentionInput.addEventListener("input", () => {
            const n = Number(mentionInput.value.trim());
            if (isValidNumber(n) && n > 0) {
                this.blBox.mentionCount = n;
            } else {
                this.blBox.mentionCount = 0;
            }
        });
        topDiv.appendChild(createSpan("&nbsp;".repeat(4)));
    }

    private addRefreshCheckBox(topDiv: HTMLDivElement) {
        const label = topDiv.appendChild(document.createElement("label"));
        setReadonly(label);
        {
            label.classList.add("b3-label__text");
            label.innerText = "🔄";
            topDiv.appendChild(createSpan("&nbsp;".repeat(1)));
        }

        const freezeCheckBox = topDiv.appendChild(document.createElement("input"));
        setReadonly(freezeCheckBox);
        {
            freezeCheckBox.title = "是否自动刷新";
            freezeCheckBox.type = "checkbox";
            freezeCheckBox.classList.add("b3-switch");
            freezeCheckBox.checked = false;
            freezeCheckBox.addEventListener("change", () => {
                this.shouldFreeze = freezeCheckBox.checked;
                if (this.shouldFreeze) label.innerText = "🚫";
                else label.innerText = "🔄";
            });
            topDiv.appendChild(createSpan("&nbsp;".repeat(4)));
        }
        return { freezeCheckBox, label };
    }

    private async fillContent(backlinksInDoc: Backlink, allRefs: RefCollector, tc: HTMLElement) {
        const temp = document.createElement("div") as HTMLDivElement;
        markQueryable(temp);
        const div = document.createElement("div") as HTMLDivElement;
        div.innerHTML = backlinksInDoc?.dom ?? "";
        scanAllRef(allRefs, div, this.docID);
        temp.appendChild(await this.path2div(backlinksInDoc?.blockPaths ?? [], allRefs));
        temp.appendChild(div);
        tc.appendChild(temp);
    }

    private async path2div(blockPaths: BlockPath[], allRefs: RefCollector) {
        const div = document.createElement("div") as HTMLDivElement;
        div.appendChild(createSpan("📄 "));
        // leading.classList.add("b3-label__text")
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
}

class BackLinkBottomBox {
    public plugin: Plugin;
    private maker: BKMaker;
    private observer: MutationObserver;
    private lastElementID: string;
    private cache: Map<string, { container: HTMLElement, timestamp: number }> = new Map();
    private _item: HTMLElement;
    public get item(): HTMLElement {
        return this._item;
    }
    private _docID: string = "";
    public get docID(): string {
        return this._docID;
    }
    public mentionCount: number = 1;

    public addCache(docID: string, container: HTMLElement): HTMLElement {
        const entries = Array.from(this.cache.entries());
        if (entries.length > CACHE_LIMIT) {
            entries.sort((e1, e2) => {
                return e1[1].timestamp - e2[1].timestamp;
            }).slice(0, entries.length / 2).forEach(e => {
                this.cache.delete(e[0]);
            });
        }
        this.cache.set(docID, { container, timestamp: new Date().getTime() });
        return container;
    }

    public getCache(docID: string, defaultValue: HTMLElement): HTMLElement {
        return this.cache.get(docID)?.container ?? defaultValue;
    }

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        events.addListener("BackLinkBottomBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static || eventType == EventType.switch_protyle) {
                navigator.locks.request("BackLinkBottomBoxLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        const nextDocID = detail.protyle?.block.rootID ?? "";
                        if (!nextDocID) return;
                        const exists = this.item?.querySelector(`[${BKMAKER_ADD}]`) ?? false;
                        if (exists && this.maker?.shouldFreeze && nextDocID === this.docID) return;
                        this._item = detail.protyle?.wysiwyg?.element;
                        if (!this.item) return;
                        this._docID = nextDocID;
                        this.observer?.disconnect();
                        this.maker = new BKMaker(this);
                        this.maker.doTheWork();

                        // OB
                        this.lastElementID = this.item.lastElementChild.getAttribute(DATA_NODE_ID);
                        this.observer = new MutationObserver((_mutationsList) => {
                            const newLastID = this.item.lastElementChild.getAttribute(DATA_NODE_ID);
                            if (newLastID != this.lastElementID) {
                                this.lastElementID = newLastID;
                                this.maker.doTheWork();
                            }
                        });
                        this.observer.observe(this.item, { childList: true });
                    }
                });
            }
        });
    }
}

export const backLinkBottomBox = new BackLinkBottomBox();

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
    refSpan.setAttribute(DATA_TYPE, "block-ref");
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
    for (const element of div.querySelectorAll(`[${DATA_TYPE}*="block-ref"]`)) {
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
