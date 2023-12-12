import { Plugin, } from "siyuan";
import { extractLinks, shuffleArray, siyuanCache } from "./libs/utils";
import { DATA_ID, DATA_NODE_ID, DATA_TYPE } from "./libs/gconst";
import { EventType, events } from "./libs/Events";

const QUERYABLE_ELEMENT = "QUERYABLE_ELEMENT";
const BKMakerAdd = "BKMakerAdd";
const MentionLimit = 10;

function markQueryable(e: HTMLElement) {
    e.setAttribute(QUERYABLE_ELEMENT, "1");
}

function hr() {
    return document.createElement("hr");
}

function createSpan(innerHTML: string) {
    const span = document.createElement("span");
    span.innerHTML = innerHTML;
    return span;
}

function setReadonly(e: HTMLElement, all = false) {
    e.setAttribute("contenteditable", "false");
    if (all) e.querySelectorAll('[contenteditable="true"]')?.forEach(sub => {
        sub?.setAttribute("contenteditable", "false");
    });
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

interface IBackLinkBottomBox {
    mentionEnabled: boolean;
    docID: string;
    item: HTMLElement;
}

class BKMaker {
    private container: HTMLDivElement;
    private blBox: IBackLinkBottomBox;
    private docID: string;
    private item: HTMLElement;
    shouldFreeze: boolean;
    constructor(blBox: IBackLinkBottomBox) {
        this.blBox = blBox;
        this.item = blBox.item;
        this.docID = blBox.docID;
        this.shouldFreeze = false;
    }

    async doTheWork() {
        await navigator.locks.request("BackLinkBottomBox-BKMakerLock" + this.docID, { ifAvailable: true }, async (lock) => {
            if (lock && !this.shouldFreeze) {
                const allIDs = await siyuanCache.getChildBlocks(5 * 1000, this.docID);
                const lastID = this.item.lastElementChild.getAttribute(DATA_NODE_ID);
                if (allIDs?.slice(-5)?.map(b => b.id)?.includes(lastID)) {
                    const divs = this.item.parentElement.querySelectorAll(`[${BKMakerAdd}="1"]`);
                    this.container = document.createElement("div");
                    this.item.lastElementChild.insertAdjacentElement("afterend", this.container);
                    await this.getBackLinks(); // start
                    this.container.setAttribute(DATA_NODE_ID, lastID);
                    this.container.style.border = "1px solid black";
                    this.container.setAttribute(BKMakerAdd, "1");
                    setReadonly(this.container, true);
                    divs?.forEach(e => e?.parentElement?.removeChild(e));
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
                this.refreshTopDiv(topDiv, allRefs);
            }
        }
        if (this.blBox.mentionEnabled) {
            for (const mentionDoc of await Promise.all(backlink2.backmentions.map((mention) => {
                return siyuanCache.getBackmentionDoc(60 * 1000, this.docID, mention.id);
            }))) {
                for (const mentionsInDoc of shuffleArray(mentionDoc.backmentions).slice(0, MentionLimit)) {
                    if (this.shouldStop()) return;
                    await this.fillContent(mentionsInDoc, allRefs, contentContainer);
                    this.refreshTopDiv(topDiv, allRefs);
                }
            }
        }

        this.container.onclick = (ev) => {
            const selection = document.getSelection();
            if (selection.toString().length <= 0) return;
            ev.stopPropagation();
        };

        setReadonly(btnDiv);
        setReadonly(topDiv);
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
        this.addMentionCheckBox(topDiv);
        {
            const query = topDiv.appendChild(document.createElement("input"));
            query.classList.add("b3-text-field");
            query.placeholder = "反链过滤";
            // query.addEventListener("blur", () => {
            //     this.queryGetFocus = false;
            // });
            query.addEventListener("focus", () => {
                this.shouldFreeze = true;
                freezeCheckBox.checked = true;
                label.innerText = "🚫";
            });
            query.addEventListener("input", (event) => {
                const newValue = (event.target as any).value;
                this.container.querySelectorAll(`[${QUERYABLE_ELEMENT}="1"]`).forEach(e => {
                    const el = e as HTMLElement;
                    if (!e.textContent.toLowerCase().includes(newValue.toLowerCase())) {
                        el.style.display = "none";
                    } else {
                        el.style.display = "";
                    }
                });
            });
            topDiv.appendChild(createSpan("&nbsp;".repeat(7)));
        }
    }

    private addMentionCheckBox(topDiv: HTMLDivElement) {
        const mentionCheckBox = topDiv.appendChild(document.createElement("input"));
        mentionCheckBox.title = "是否显示提及（每次刷新随机展示一部分提及）";
        mentionCheckBox.type = "checkbox";
        mentionCheckBox.classList.add("b3-switch");
        mentionCheckBox.checked = this.blBox.mentionEnabled;
        mentionCheckBox.addEventListener("change", () => {
            this.blBox.mentionEnabled = mentionCheckBox.checked;
        });
        topDiv.appendChild(createSpan("&nbsp;".repeat(4)));
    }

    private addRefreshCheckBox(topDiv: HTMLDivElement) {
        const label = topDiv.appendChild(document.createElement("label"));
        {
            label.classList.add("b3-label__text");
            label.innerText = "🔄";
            topDiv.appendChild(createSpan("&nbsp;".repeat(1)));
        }

        const freezeCheckBox = topDiv.appendChild(document.createElement("input"));
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
        setReadonly(div);
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
        for (const refPath of blockPaths) {
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

            let { kramdown } = await siyuanCache.getBlockKramdown(15 * 1000, refPath.id);
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
        setReadonly(div);
        return div;
    }
}

class BackLinkBottomBox implements IBackLinkBottomBox {
    plugin: Plugin;
    private maker: BKMaker;
    private observer: MutationObserver;
    private lastElementID: string;
    item: HTMLElement;
    docID: string = "";
    mentionEnabled: boolean = false;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        events.addListener("BackLinkBottomBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static || eventType == EventType.switch_protyle) {
                navigator.locks.request("BackLinkBottomBoxLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        const nextDocID = detail.protyle?.block.rootID ?? "";
                        if (!nextDocID) return;
                        const exists = this.item?.querySelector(`[${BKMakerAdd}]`) ?? false;
                        if (exists && this.maker?.shouldFreeze && nextDocID === this.docID) return;
                        this.item = detail.protyle?.wysiwyg?.element;
                        if (!this.item) return;
                        this.docID = nextDocID;
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
