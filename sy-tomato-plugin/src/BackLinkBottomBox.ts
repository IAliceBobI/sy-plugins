import { IProtyle, Plugin } from "siyuan";
import { EventType, events } from "./libs/Events";
import { MaxCache } from "./libs/cache";
import {
    IBKMaker,
    deleteSelf, getBackLinks, getLastElementID,
    init,
    integrateCounting,
    shouldInsertDiv
} from "./libs/bkUtils";
import { siyuanCache } from "./libs/utils";

const BKMAKER_ADD = "BKMAKER_ADD";
const CACHE_LIMIT = 100;

class BKMaker implements IBKMaker {
    public shouldFreeze: boolean;
    public mentionCount: number;

    public container: HTMLElement;
    public blBox: BackLinkBottomBox;
    public docID: string;
    public item: HTMLElement;
    public protyle: IProtyle;
    public mentionCounting: HTMLSpanElement;
    // private scrollTop: number;

    public freezeCheckBox: HTMLInputElement;
    public label: HTMLLabelElement;

    constructor(blBox: BackLinkBottomBox, docID: string) {
        init(this, docID, blBox);
    }

    async doTheWork(item: HTMLElement, protyle: IProtyle) {
        this.item = item;
        this.protyle = protyle;
        const divs = await this.findOrLoadFromCache();
        await navigator.locks.request("BackLinkBottomBox-BKMakerLock" + this.docID, { ifAvailable: true }, async (lock) => {
            if (lock && !this.shouldFreeze && await shouldInsertDiv(getLastElementID(this.item), this.docID)) {
                // retrieve new data
                this.container = document.createElement("div");
                await getBackLinks(this); // start
                this.container.setAttribute(BKMAKER_ADD, "1");
                this.container.classList.add("protyle-wysiwyg");

                // put new data into cache
                this.blBox.divCache.add(this.docID, this.container);

                if (!this.shouldFreeze) {
                    // substitute old for new
                    this.insertBkPanel(this.container);
                    integrateCounting(this);
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
                    integrateCounting(this);
                    divs.push(oldEle);
                }
            }
            return divs;
        });
    }
}

class BackLinkBottomBox {
    public plugin: Plugin;
    public divCache: MaxCache<HTMLElement> = new MaxCache(CACHE_LIMIT);
    private makerCache: MaxCache<BKMaker> = new MaxCache(CACHE_LIMIT);
    private docID: string;
    private keepAliveID: any;
    async onload(plugin: Plugin) {
        this.plugin = plugin;
        events.addListener("BackLinkBottomBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static || eventType == EventType.switch_protyle) {
                navigator.locks.request("BackLinkBottomBoxLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        const protyle = detail.protyle as IProtyle;
                        if (!protyle || !protyle.element) return;
                        if (protyle.element.classList.contains("card__block")) return;
                        const item = protyle.wysiwyg?.element;
                        if (!item) return;
                        const nextDocID = protyle.block.rootID ?? "";
                        if (!nextDocID) return;
                        if (await isBookCard(nextDocID)) return;
                        const maker = this.makerCache.getOrElse(nextDocID, () => { return new BKMaker(this, nextDocID); });
                        maker.doTheWork(item, protyle);
                        if (this.docID != nextDocID) {
                            this.docID = nextDocID;
                            // keep
                            clearInterval(this.keepAliveID);
                            this.keepAliveID = setInterval(() => {
                                maker.findOrLoadFromCache();
                            }, 2000);
                        }
                    }
                });
            }
        });
    }
}

async function isBookCard(docID: string): Promise<boolean> {
    const MarkKey = "custom-progmark"; // for doc
    const TEMP_CONTENT = "插件管理勿改managedByPluginDoNotModify";
    const attrs = await siyuanCache.getBlockAttrs(60000, docID);
    const v = attrs[MarkKey] ?? "";
    return v.includes(TEMP_CONTENT);
}

// async function isDailyCard(docID: string) {
//     const row = await siyuanCache.sqlOne(60 * 1000, `select hpath from blocks where id = "${docID}"`);
//     const hpath = row?.hpath ?? "";
//     if (hpath.startsWith("/daily card")) return true;
//     return false;
// }

export const backLinkBottomBox = new BackLinkBottomBox();
