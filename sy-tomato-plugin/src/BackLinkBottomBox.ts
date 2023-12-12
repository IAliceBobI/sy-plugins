import { Plugin, } from "siyuan";
import { extractLinks, siyuanCache } from "./libs/utils";
import { DATA_ID, DATA_NODE_ID, DATA_TYPE } from "./libs/gconst";
import { EventType, events } from "./libs/Events";

const TOMATO = "tomato_zZmqus5PtYRi";
const QUERYABLE_ELEMENT = "QUERYABLE_ELEMENT";
const BKMakerAdd = "BKMakerAdd";

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

function setReadonly(e: HTMLElement) {
    e.setAttribute("contenteditable", "false");
    e.querySelectorAll('[contenteditable="true"]')?.forEach(sub => {
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

class BKMaker {
    private item: HTMLElement;
    private docID: string;
    private container: HTMLDivElement;
    private isMention: boolean;
    shouldFreeze: boolean;
    constructor(detail: any, isMention: boolean) {
        this.shouldFreeze = false;
        this.isMention = isMention;
        this.item = detail.protyle?.wysiwyg?.element;
        this.docID = detail.protyle?.block.rootID ?? "";
    }

    async doTheWork() {
        await navigator.locks.request("BackLinkBottomBox-BKMakerLock", { ifAvailable: true }, async (lock) => {
            if (lock && this.docID && !this.shouldFreeze) {
                const allIDs = await siyuanCache.getChildBlocks(5 * 1000, this.docID);
                const lastID = this.item.lastElementChild.getAttribute(DATA_NODE_ID);
                if (allIDs?.slice(-5)?.map(b => b.id)?.includes(lastID)) {
                    const divs = this.item.parentElement.querySelectorAll(`[${BKMakerAdd}="1"]`);
                    this.container = document.createElement("div");
                    await this.getBackLinks(this.isMention);
                    setReadonly(this.container);
                    this.container.setAttribute(DATA_NODE_ID, lastID);
                    this.container.style.border = "1px solid black";
                    this.container.setAttribute(BKMakerAdd, "1");
                    this.item.lastElementChild.insertAdjacentElement("afterend", this.container);
                    divs?.forEach(e => e?.parentElement?.removeChild(e));
                }
            }
        });
    }

    private async getBackLinks(isMention: boolean) {
        const allRefs: RefCollector = new Map();
        const backlink2 = await siyuanCache.getBacklink2(15 * 1000, this.docID);
        const contentContainer = document.createElement("div");
        if (!isMention) {
            for (const backlinkDoc of await Promise.all(backlink2.backlinks.map((backlink) => {
                return siyuanCache.getBacklinkDoc(20 * 1000, this.docID, backlink.id);
            }))) {
                for (const backlinksInDoc of backlinkDoc.backlinks) {
                    await this.fillContent(backlinksInDoc, allRefs, contentContainer);
                }
            }
        } else {
            for (const mentionDoc of await Promise.all(backlink2.backmentions.map((mention) => {
                return siyuanCache.getBackmentionDoc(60 * 1000, this.docID, mention.id);
            }))) {
                for (const mentionsInDoc of mentionDoc.backmentions) {
                    await this.fillContent(mentionsInDoc, allRefs, contentContainer);
                }
            }
        }
        const topDiv = document.createElement("div");

        const label = topDiv.appendChild(document.createElement("label"));
        label.classList.add("b3-label__text");
        label.innerText = "🔄";
        topDiv.appendChild(createSpan("&nbsp;".repeat(1)));

        const freezeCheckBox = topDiv.appendChild(document.createElement("input"));
        {
            freezeCheckBox.type = "checkbox";
            freezeCheckBox.classList.add("b3-switch");
            freezeCheckBox.checked = false;
            freezeCheckBox.addEventListener("change", () => {
                this.shouldFreeze = freezeCheckBox.checked;
                if (this.shouldFreeze) label.innerText = "🚫";
                else label.innerText = "🔄";
            });
            topDiv.appendChild(createSpan("&nbsp;".repeat(7)));
        }

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

        for (const { lnk } of allRefs.values()) {
            markQueryable(lnk);
            topDiv.appendChild(lnk);
            lnk.appendChild(createSpan("&nbsp;".repeat(7)));
        }

        this.container.onclick = (ev) => {
            const selection = document.getSelection();
            if (selection.toString().length <= 0) return;
            ev.stopPropagation();
        };

        this.container.appendChild(topDiv);
        this.container.appendChild(hr());
        this.container.appendChild(contentContainer);
        setReadonly(topDiv);
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

class BackLinkBottomBox {
    private plugin: Plugin;
    private static readonly GLOBAL_THIS: Record<string, any> = globalThis;
    private maker: BKMaker;
    private observer: MutationObserver;
    private lastElementID: string;
    private item: HTMLElement;
    private docID: string;

    async onload(plugin: Plugin) {
        BackLinkBottomBox.GLOBAL_THIS[TOMATO] = { BKMaker, "tomato": this };
        this.plugin = plugin;
        this.plugin;
        events.addListener("BackLinkBottomBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static || eventType == EventType.switch_protyle) {
                navigator.locks.request("BackLinkBottomBoxLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        const docID = detail.protyle?.block.rootID ?? "";
                        const exists = this.item?.querySelectorAll(`[${BKMakerAdd}]`)?.length > 0 ?? false;
                        if (exists && this.maker?.shouldFreeze && docID === this.docID) return;
                        this.docID = docID;
                        this.observer?.disconnect();
                        this.maker = new BKMaker(detail, false);
                        await this.maker.doTheWork();
                        this.item = detail.protyle?.wysiwyg?.element;
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
