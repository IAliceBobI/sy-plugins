import { Plugin, } from "siyuan";
import { extractLinks, siyuanCache } from "./libs/utils";
import { DATA_ID, DATA_NODE_ID, DATA_TYPE } from "./libs/gconst";
import { EventType, events } from "./libs/Events";

const TOMATO = "tomato_zZmqus5PtYRi";
const QUERYABLE_ELEMENT = "QUERYABLE_ELEMENT";

function makeQueryable(e: HTMLElement) {
    e.setAttribute(QUERYABLE_ELEMENT, "1");
}

function hr() {
    return document.createElement("hr");
}

function createDiv(innerHTML: string) {
    const div = document.createElement("div");
    div.innerHTML = innerHTML;
    return div;
}

function setReadonly(e: HTMLElement) {
    e.setAttribute("contenteditable", "false");
    e.querySelectorAll('[contenteditable="true"]')?.forEach(sub => {
        sub?.setAttribute("contenteditable", "false");
    });
}

function refTag(id: string, text: string, count: number, len?: number): any {
    let countTag = "";
    if (count > 0) {
        countTag = `<span class="tomato-style__code">${count}</span>`;
    }
    if (len) {
        let sliced = text.slice(0, len);
        if (sliced.length != text.length) sliced += "……";
        return `<span data-type="block-ref" data-id="${id}">${sliced}</span>` + countTag;
    } else {
        return `<span data-type="block-ref" data-id="${id}">${text}</span>` + countTag;
    }
}

function scanAllRef(allRefs: RefCollector, div: HTMLDivElement) {
    for (const element of div.querySelectorAll(`[${DATA_TYPE}="block-ref"]`)) {
        const id = element.getAttribute(DATA_ID);
        const txt = element.textContent;
        addRef(txt, id, allRefs);
    }
}

function addRef(txt: string, id: string, allRefs: RefCollector) {
    if (txt != "*" && id != this.docID) {
        const key = id + txt;
        const c = (allRefs.get(key)?.count ?? 0) + 1;
        const spanStr = refTag(id, txt, c);
        allRefs.set(key, {
            count: c,
            lnk: spanStr,
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
    queryGetFocus: boolean;
    constructor(detail: any, isMention: boolean) {
        this.queryGetFocus = false;
        this.isMention = isMention;
        this.item = detail.protyle?.wysiwyg?.element;
        this.docID = detail.protyle?.block.rootID ?? "";
    }

    async doTheWork() {
        await navigator.locks.request("BackLinkBottomBox-BKMakerLock", { ifAvailable: true }, async (lock) => {
            if (lock && this.docID && !this.queryGetFocus) {
                const allIDs = await siyuanCache.getChildBlocks(5 * 1000, this.docID);
                const lastID = this.item.lastElementChild.getAttribute(DATA_NODE_ID);
                if (allIDs?.slice(-5)?.map(b => b.id)?.includes(lastID)) {
                    const divs = this.item.parentElement.querySelectorAll('[BKMakerAdd="1"]');
                    this.container = document.createElement("div");
                    await this.getBackLinks(this.isMention);
                    setReadonly(this.container);
                    this.container.setAttribute(DATA_NODE_ID, lastID);
                    this.container.style.border = "1px solid black";
                    this.container.setAttribute("BKMakerAdd", "1");
                    this.item.lastElementChild.insertAdjacentElement("afterend", this.container);
                    divs?.forEach(e => e?.parentElement?.removeChild(e));
                }

            }
        });
    }

    private async getBackLinks(isMention: boolean) {
        const allRefs: RefCollector = new Map();
        const backlink2 = await siyuanCache.getBacklink2(15 * 1000, this.docID);
        const tempContainer = document.createElement("div");
        if (!isMention) {
            for (const backlinkDoc of await Promise.all(backlink2.backlinks.map((backlink) => {
                return siyuanCache.getBacklinkDoc(20 * 1000, this.docID, backlink.id);
            }))) {
                for (const backlinksInDoc of backlinkDoc.backlinks) {
                    await this.fillContent(backlinksInDoc, allRefs, tempContainer);
                }
            }
        } else {
            for (const mentionDoc of await Promise.all(backlink2.backmentions.map((mention) => {
                return siyuanCache.getBackmentionDoc(60 * 1000, this.docID, mention.id);
            }))) {
                for (const mentionsInDoc of mentionDoc.backmentions) {
                    await this.fillContent(mentionsInDoc, allRefs, tempContainer);
                }
            }
        }
        const div = document.createElement("div");

        const query = div.appendChild(document.createElement("input"));
        query.classList.add("b3-text");
        query.addEventListener("blur", () => {
            this.queryGetFocus = false;
        });
        query.addEventListener("focus", () => {
            this.queryGetFocus = true;
        });
        query.addEventListener("input", function (event) {
            const newValue = (event.target as any).value;
            console.log("Input value changed: " + newValue);
        });

        const allLnks = [...allRefs.values()];
        const spaces = "&nbsp;".repeat(10);
        div.appendChild(createDiv(allLnks.map(i => i.lnk).join(spaces)));

        this.container.onclick = (ev) => {
            const selection = document.getSelection();
            if (selection.toString().length <= 0) return;
            ev.stopPropagation();
        };

        this.container.appendChild(div);
        this.container.appendChild(hr());
        this.container.appendChild(tempContainer);
        setReadonly(div);
    }

    private async fillContent(backlinksInDoc: Backlink, allRefs: RefCollector, tempContainer: HTMLElement) {
        const div = document.createElement("div") as HTMLDivElement;
        makeQueryable(div);
        div.innerHTML = backlinksInDoc?.dom ?? "";
        scanAllRef(allRefs, div);
        setReadonly(div);
        tempContainer.appendChild(await this.path2div(backlinksInDoc?.blockPaths ?? [], allRefs));
        tempContainer.appendChild(div);
        tempContainer.appendChild(hr());
    }

    private async path2div(blockPaths: BlockPath[], allRefs: RefCollector) {
        const div = document.createElement("div") as HTMLDivElement;
        const refPathList = [];
        for (const refPath of blockPaths) {
            if (refPath.type == "NodeDocument") {
                if (refPath.id == this.docID) break;
                const fileName = refPath.name.split("/").pop();
                refPathList.push(refTag(refPath.id, fileName, 0));
                addRef(fileName, refPath.id, allRefs);
                continue;
            }

            if (refPath.type == "NodeHeading") {
                refPathList.push(refTag(refPath.id, refPath.name, 0));
                addRef(refPath.name, refPath.id, allRefs);
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
                    addRef(idLnk.txt, idLnk.id, allRefs);
                }
            }
        }
        div.innerHTML = refPathList.join(" ➡ ");
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

    async onload(plugin: Plugin) {
        BackLinkBottomBox.GLOBAL_THIS[TOMATO] = { BKMaker, "tomato": this };
        this.plugin = plugin;
        this.plugin;
        events.addListener("BackLinkBottomBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static || eventType == EventType.switch_protyle) {
                navigator.locks.request("BackLinkBottomBoxLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        if (this.maker?.queryGetFocus) return;
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
