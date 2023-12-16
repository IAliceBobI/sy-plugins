import { Dialog, IProtyle, Plugin, openTab, } from "siyuan";
import { isValidNumber, siyuanCache } from "./libs/utils";
import { BLOCK_REF, DATA_ID, DATA_TYPE } from "./libs/gconst";
import { EventType, events } from "./libs/Events";
import { MaxCache } from "./libs/cache";
import { SearchEngine } from "./libs/search";
import { SEARCH_HELP } from "./constants";
import {
    IBKMaker,
    MENTION_CACHE_TIME,
    QUERYABLE_ELEMENT, createEyeBtn, createSpan,
    deleteSelf, fillContent, getLastElementID, hr, icon, markQueryable,
    shouldInsertDiv
} from "./libs/bkUtils";

const MENTION_COUTING_SPAN = "MENTION_COUTING_SPAN";
const BKMAKER_ADD = "BKMAKER_ADD";
const CACHE_LIMIT = 100;

class BKMakerOut implements IBKMaker {
    private shouldFreeze: boolean;
    private mentionCount: number = 1;

    private container: HTMLElement;
    private blBox: BackLinkBottomBoxOut;
    public docID: string;
    private item: HTMLElement;
    private protyle: IProtyle;
    private mentionCounting: HTMLSpanElement;
    // private scrollTop: number;

    private freezeCheckBox: HTMLInputElement;
    private label: HTMLLabelElement;

    constructor(blBox: BackLinkBottomBoxOut, docID: string) {
        this.docID = docID;
        this.blBox = blBox;
        this.shouldFreeze = false;
        this.mentionCounting = document.createElement("span");
        this.mentionCounting.classList.add("b3-label__text");
    }

    async doTheWork(item: HTMLElement, protyle: IProtyle) {
        this.item = item;
        this.protyle = protyle;
        const divs = await this.findOrLoadFromCache();
        await navigator.locks.request("BackLinkBottomBox-BKMakerLock" + this.docID, { ifAvailable: true }, async (lock) => {
            if (lock && !this.shouldFreeze && await shouldInsertDiv(getLastElementID(this.item), this.docID)) {
                // retrieve new data
                this.container = document.createElement("div");
                await this.getBackLinks(); // start
                this.container.setAttribute(BKMAKER_ADD, "1");
                this.container.classList.add("protyle-wysiwyg");

                // put new data into cache
                this.blBox.divCache.add(this.docID, this.container);

                if (!this.shouldFreeze) {
                    // substitute old for new
                    this.insertBkPanel(this.container);
                    this.integrateCounting();
                    deleteSelf(divs);
                }
            }
        });
    }

    // private saveScrollTop() {
    //     this.scrollTop = this.protyle.contentElement.scrollTop;
    // }

    // private restoreScrollTop() {
    //     this.protyle.contentElement.scrollTop = this.scrollTop;
    // }

    private async integrateCounting() {
        this.container.querySelector(`[${MENTION_COUTING_SPAN}]`)?.appendChild(this.mentionCounting);
    }

    private async insertBkPanel(div: HTMLElement) {
        // this.saveScrollTop();
        this.protyle.wysiwyg.element.style.paddingBottom = "0px";
        div.style.paddingLeft = this.protyle.wysiwyg.element.style.paddingLeft;
        div.style.paddingRight = this.protyle.wysiwyg.element.style.paddingRight;
        this.protyle.wysiwyg.element.insertAdjacentElement("afterend", div);
        // this.protyle.contentElement.appendChild(div);
        // this.restoreScrollTop();
    }

    async findOrLoadFromCache() {
        return navigator.locks.request("BackLinkBottomBox-BKMakerLock" + this.docID, { ifAvailable: true }, async (lock) => {
            const divs = Array.from(this.item.parentElement.querySelectorAll(`[${BKMAKER_ADD}="1"]`)?.values() ?? []);
            if (lock && await shouldInsertDiv(getLastElementID(this.item), this.docID)) {
                let oldEle: HTMLElement;
                if (divs.length == 0) {
                    oldEle = this.blBox.divCache.get(this.docID);
                    if (oldEle) {
                        this.insertBkPanel(oldEle);
                    }
                } else {
                    oldEle = divs.pop() as HTMLElement;
                    deleteSelf(divs);
                }
                if (oldEle) {
                    this.integrateCounting();
                    divs.push(oldEle);
                }
            }
            return divs;
        });
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
                await fillContent(this, backlinksInDoc, allRefs, contentContainer);
            }
        }
        if (this.mentionCount > 0) {
            let count = 0;
            outer: for (const mention of backlink2.backmentions) {
                const mentionDoc = await siyuanCache.getBackmentionDoc(MENTION_CACHE_TIME, this.docID, mention.id);
                for (const mentionItem of mentionDoc.backmentions) {
                    await fillContent(this, mentionItem, allRefs, contentContainer);
                    ++count;
                    this.mentionCounting.innerText = `提及读取中：${count}`;
                    if (count >= this.mentionCount) break outer;
                }
            }
            this.mentionCounting.innerText = "";
        }

        this.refreshTopDiv(topDiv, allRefs);

        this.container.querySelectorAll(`[${DATA_TYPE}*="${BLOCK_REF}"]`).forEach((e: HTMLElement) => {
            const btn = document.createElement("button") as HTMLButtonElement;
            btn.setAttribute(DATA_ID, e.getAttribute(DATA_ID));
            btn.style.border = "transparent";
            btn.style.background = "var(--b3-button)";
            btn.style.color = "var(--b3-protyle-inline-blockref-color)";
            btn.textContent = e.textContent;
            btn.addEventListener("click", () => {
                openTab({ app: this.blBox.plugin.app, doc: { id: e.getAttribute(DATA_ID), action: ["cb-get-all", "cb-get-focus", "cb-get-hl"] } });
            });
            e.parentElement.replaceChild(btn, e);
        });
    }

    private refreshTopDiv(topDiv: HTMLDivElement, allRefs: RefCollector) {
        topDiv.innerHTML = "";
        for (const { lnk, id } of allRefs.values()) {
            const d = topDiv.appendChild(document.createElement("span"));
            markQueryable(d);
            const btn = d.appendChild(createEyeBtn());
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

    public freeze() {
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
            help.innerHTML = icon("Help", 16);
            help.addEventListener("click", () => { new Dialog({ title: "搜索语法", content: SEARCH_HELP }); });
            topDiv.appendChild(createSpan("&nbsp;".repeat(1)));
        }
        const query = topDiv.appendChild(document.createElement("input"));
        {
            query.title = "必须包含AA、BB，DD与EE至少包含一个，但不能包含CC，也不能包含FF";
            query.classList.add("b3-text-field");
            query.size = 50;
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
            btn.title = "粘贴内容到搜索框，并锁定";
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
            btn.title = "复制搜索框内容到剪贴板";
            btn.classList.add("b3-button");
            btn.classList.add("b3-button--outline");
            btn.addEventListener("click", async () => {
                navigator.clipboard.writeText(query.value);
            });
            btn.innerHTML = icon("Copy");
            topDiv.appendChild(createSpan("&nbsp;".repeat(2)));
        }
        {
            const btn = topDiv.appendChild(document.createElement("button")) as HTMLButtonElement;
            btn.title = "清空搜索框，并解除锁定";
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
        {
            this.label.classList.add("b3-label");
            this.label.classList.add("b3-label__text");
            this.label.classList.add("b3-label--noborder");
            topDiv.appendChild(createSpan("&nbsp;".repeat(1)));
        }

        this.freezeCheckBox = topDiv.appendChild(document.createElement("input"));
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


}

class BackLinkBottomBoxOut {
    public plugin: Plugin;
    public divCache: MaxCache<HTMLElement> = new MaxCache(CACHE_LIMIT);
    private makerCache: MaxCache<BKMakerOut> = new MaxCache(CACHE_LIMIT);
    private keepAliveID: any;
    private docID: string;
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
                        const maker = this.makerCache.getOrElse(nextDocID, () => { return new BKMakerOut(this, nextDocID); });
                        maker.doTheWork(item, detail.protyle);
                        if (this.docID != nextDocID) {
                            this.docID = nextDocID;
                            clearInterval(this.keepAliveID);
                            this.keepAliveID = setInterval(() => {
                                maker.findOrLoadFromCache();
                            }, 1500);
                            setTimeout(() => {
                                clearInterval(this.keepAliveID);
                                this.keepAliveID = null;
                            }, 5000);
                        }
                    }
                });
            }
        });
    }
}

export const backLinkBottomBoxOut = new BackLinkBottomBoxOut();
