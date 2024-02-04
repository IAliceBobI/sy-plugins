import { IProtyle, Plugin, Protyle } from "siyuan";
import { EventType, events } from "./libs/Events";
import { MaxCache } from "./libs/cache";
import {
    deleteSelf, getLastElementID,
    integrateCounting,
    shouldInsertDiv
} from "./libs/bkUtils";
import { isValidNumber, siyuanCache } from "./libs/utils";
import { MarkKey, TEMP_CONTENT, TOMATO_BK_IGNORE } from "./libs/gconst";
import BackLinkBottom from "./BackLinkBottom.svelte";

const BKMAKER_ADD = "BKMAKER_ADD";
const CACHE_LIMIT = 100;

export class BKMaker {
    public shouldFreeze: boolean;
    public mentionCount: number;

    public container: HTMLElement;
    public blBox: BackLinkBottomBox;
    public docID: string;
    public item: HTMLElement;
    public protyle: IProtyle;
    public mentionCounting: HTMLSpanElement;

    public freezeCheckBox: HTMLInputElement;
    public label: HTMLLabelElement;
    public settingCfg: TomatoSettings;
    public plugin: Plugin;

    constructor(blBox: BackLinkBottomBox, docID: string) {
        this.mentionCount = 1;
        this.docID = docID;
        this.blBox = blBox;
        this.shouldFreeze = false;
        this.mentionCounting = document.createElement("span");
        this.mentionCounting.classList.add("b3-label__text");
        this.settingCfg = blBox.settingCfg;
        this.plugin = blBox.plugin;
    }

    async doTheWork(item: HTMLElement, protyle: IProtyle) {
        this.item = item;
        this.protyle = protyle;
        const divs = await this.findOrLoadFromCache();
        await navigator.locks.request("BackLinkBottomBox-BKMakerLock" + this.docID, { ifAvailable: true }, async (lock) => {
            this.protyle.wysiwyg.element.style.paddingBottom = "0px";
            if (lock && !this.shouldFreeze && await shouldInsertDiv(getLastElementID(this.item), this.docID)) {
                // retrieve new data
                this.container = document.createElement("div");
                new BackLinkBottom({
                    target: this.container,
                    props: {
                        maker: this,
                    }
                });
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

    private async insertBkPanel(div: HTMLElement) {
        this.protyle.wysiwyg.element.style.paddingBottom = "0px";
        div.style.paddingLeft = this.protyle.wysiwyg.element.style.paddingLeft;
        div.style.paddingRight = this.protyle.wysiwyg.element.style.paddingRight;
        this.protyle.wysiwyg.element.insertAdjacentElement("afterend", div);
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
    public settingCfg: TomatoSettings;
    public divCache: MaxCache<HTMLElement> = new MaxCache(CACHE_LIMIT);
    public bkProtyleCache: MaxCache<Protyle> = new MaxCache(CACHE_LIMIT * 2, (t) => { t.destroy(); });
    private makerCache: MaxCache<BKMaker> = new MaxCache(CACHE_LIMIT);
    private docID: string;
    private keepAliveID: any;
    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.settingCfg = (plugin as any).settingCfg;
        const MaxCount = 100;
        if (!isValidNumber(this.settingCfg["back-link-max-size"])) this.settingCfg["back-link-max-size"] = MaxCount;
        this.plugin.setting.addItem({
            title: "** 底部反链最大展开的文件数",
            description: "注意：一个文件中可能有多个反链。所以此设置不等于反链数量。",
            createActionElement: () => {
                const input = document.createElement("input") as HTMLInputElement;
                input.className = "input";
                input.value = String(this.settingCfg["back-link-max-size"]);
                input.className = "b3-text-field fn__flex-center";
                input.addEventListener("input", () => {
                    let c = Number(input.value.trim());
                    if (!isValidNumber(c)) c = MaxCount;
                    if (c == 0) c = MaxCount;
                    this.settingCfg["back-link-max-size"] = c;
                });
                return input;
            },
        });

        events.addListener("BackLinkBottomBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static || eventType == EventType.switch_protyle) {
                navigator.locks.request("BackLinkBottomBoxLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        const protyle = detail.protyle as IProtyle;
                        if (!protyle || !protyle.element) return;
                        if (protyle.element.getAttribute(TOMATO_BK_IGNORE)) return;
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
    const attrs = await siyuanCache.getBlockAttrs(60000, docID);
    const v = attrs[MarkKey] ?? "";
    return v.includes(TEMP_CONTENT);
}

export const backLinkBottomBox = new BackLinkBottomBox();
