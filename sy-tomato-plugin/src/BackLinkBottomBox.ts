import { IProtyle, Plugin, Protyle } from "siyuan";
import { EventType, events } from "./libs/Events";
import { MaxCache } from "./libs/cache";
import {
    deleteSelf, disableBK, enableBK, getLastElementID,
    integrateCounting,
    isBkOff,
    shouldInsertDiv
} from "./libs/bkUtils";
import { isCardUI, isValidNumber, siyuanCache, sleep } from "./libs/utils";
import { MarkKey, TEMP_CONTENT, TOMATO_BK_IGNORE } from "./libs/gconst";
import BackLinkBottom from "./BackLinkBottom.svelte";

const BKMAKER_ADD = "BKMAKER_ADD";
const CACHE_LIMIT = 100;

export class BKMaker {
    public disabled: boolean;

    public shouldFreeze: boolean;
    public mentionCount: number;

    public container: HTMLElement;
    public blBox: BackLinkBottomBox;
    public docID: string;
    public lockName: string;
    public item: HTMLElement;
    public protyle: IProtyle;
    public mentionCounting: HTMLSpanElement;

    public freezeCheckBox: HTMLInputElement;
    public label: HTMLLabelElement;
    public settingCfg: TomatoSettings;
    public plugin: Plugin;
    public sv: BackLinkBottom;
    public refreshBK: () => Promise<void>;

    constructor(blBox: BackLinkBottomBox, docID: string) {
        this.mentionCount = blBox.settingCfg["back-link-mention-count"] ?? 1;
        this.docID = docID;
        this.blBox = blBox;
        this.shouldFreeze = false;
        this.mentionCounting = document.createElement("span");
        this.mentionCounting.classList.add("b3-label__text");
        this.settingCfg = blBox.settingCfg;
        this.plugin = blBox.plugin;
        this.lockName = "BackLinkBottomBox-BKMakerLock" + this.docID;
    }

    async doTheWork(item: HTMLElement, protyle: IProtyle) {
        this.disabled = await isBkOff(this.docID);
        if (this.disabled) {
            this.container?.parentElement?.removeChild(this.container);
            return;
        }
        this.noPadding(this.container);
        if (this.protyle?.id === protyle.id) {
            await this.refreshBacklinks();
            return;
        }
        this.item = item;
        this.protyle = protyle;
        const divs = await this.findOrLoadFromCache();
        await navigator.locks.request(this.lockName, { ifAvailable: true }, async (lock) => {
            if (lock && !this.shouldFreeze && await shouldInsertDiv(getLastElementID(this.item), this.docID)) {
                // retrieve new data
                this.container = document.createElement("div");
                this.sv = new BackLinkBottom({
                    target: this.container,
                    props: {
                        maker: this,
                    }
                });
                this.container.setAttribute(BKMAKER_ADD, "1");
                // this.container.classList.add("protyle-wysiwyg");

                // put new data into cache
                this.blBox.divCache.add(this.docID, this.container);

                await sleep(1000);
                if (!this.shouldFreeze) {
                    // substitute old for new
                    await this.insertBkPanel(this.container);
                    integrateCounting(this);
                    deleteSelf(divs);
                }
            }
        });
    }

    async refreshBacklinks() {
        await navigator.locks.request(this.lockName, { ifAvailable: true }, async (lock) => {
            if (this.refreshBK && lock && !this.shouldFreeze) {
                await this.refreshBK();
            }
        });
    }

    private async insertBkPanel(div: HTMLElement) {
        if (!this.disabled) {
            this.noPadding(div);
            this.protyle.wysiwyg.element.insertAdjacentElement("afterend", div);
        }
    }

    private noPadding(div: HTMLElement) {
        if (div && this.protyle?.wysiwyg?.element?.style) {
            this.protyle.wysiwyg.element.style.paddingBottom = "0px";
            div.style.paddingLeft = this.protyle.wysiwyg.element.style.paddingLeft;
            div.style.paddingRight = this.protyle.wysiwyg.element.style.paddingRight;
        }
    }

    async findOrLoadFromCache() {
        if (!this.disabled) {
            return navigator.locks.request(this.lockName, { ifAvailable: true }, async (lock) => {
                const divs = Array.from(this.item?.parentElement?.querySelectorAll(`[${BKMAKER_ADD}="1"]`)?.values() ?? []);
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

        {
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
                        if (c <= 0) c = MaxCount;
                        this.settingCfg["back-link-max-size"] = c;
                    });
                    return input;
                },
            });
        }

        this.plugin.setting.addItem({
            title: "** 底部反链默认提及数",
            description: "",
            createActionElement: () => {
                const input = document.createElement("input") as HTMLInputElement;
                input.className = "input";
                input.value = String(this.settingCfg["back-link-mention-count"] ?? "1");
                input.className = "b3-text-field fn__flex-center";
                input.addEventListener("input", () => {
                    let c = Number(input.value.trim());
                    if (!isValidNumber(c)) c = 1;
                    if (c <= 0) c = 1;
                    this.settingCfg["back-link-mention-count"] = c;
                });
                return input;
            },
        });

        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: "启用/禁用当前文档的底部反链",
                iconHTML: "📴🔙🔗",
                click: async () => {
                    if (this.docID) {
                        const docID = this.docID;
                        if (await isBkOff(docID)) {
                            await enableBK(docID);
                        } else {
                            await disableBK(docID);
                        }
                    }
                },
            });
        });

        events.addListener("BackLinkBottomBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static || eventType == EventType.switch_protyle) {
                navigator.locks.request("BackLinkBottomBoxLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        const protyle = detail.protyle as IProtyle;
                        if (!protyle || !protyle.element) return;
                        if (protyle.element.getAttribute(TOMATO_BK_IGNORE)) return;
                        if (isCardUI(detail)) return;
                        if (isDocFlow(detail)) return;
                        const item = protyle.wysiwyg?.element;
                        if (!item) return;
                        const nextDocID = protyle.block.rootID ?? "";
                        if (!nextDocID) return;
                        if (await skipByAttrs(nextDocID)) return;
                        const maker = this.makerCache.getOrElse(nextDocID, () => { return new BKMaker(this, nextDocID); });
                        maker.doTheWork(item, protyle);
                        if (this.docID != nextDocID) {
                            this.docID = nextDocID;
                            clearInterval(this.keepAliveID);
                            this.keepAliveID = setInterval(async () => {
                                await maker.findOrLoadFromCache();
                                await maker.refreshBacklinks();
                            }, 5000);
                        }
                    }
                });
            }
        });
    }
}

async function skipByAttrs(docID: string): Promise<boolean> {
    const attrs = await siyuanCache.getBlockAttrs(60000, docID);
    const markKey = attrs[MarkKey] ?? "";
    if (markKey.includes(TEMP_CONTENT)) return;

    for (const [k] of Object.entries(attrs)) {
        if (k.startsWith("custom-dailynote-")) {
            return true;
        } else if (k.startsWith("custom-dailycard-")) {
            return true;
        }
    }

    return false;
}

function isDocFlow(detail: Protyle) {
    return detail?.protyle?.element?.classList?.contains("docs-flow__protyle");
}

export const backLinkBottomBox = new BackLinkBottomBox();
