import { ICardData, IEventBusMap, IProtyle, Plugin } from "siyuan";
import "./index.scss";
import { getID, isValidNumber, shuffleArray, siyuan, siyuanCache, timeUtil } from "./libs/utils";
import { CARD_PRIORITY_STOP, CUSTOM_RIFF_DECKS, DATA_NODE_ID, TOMATO_CONTROL_ELEMENT } from "./libs/gconst";
import { DialogText } from "./libs/DialogText";
import { EventType, events } from "./libs/Events";
import CardPriorityBar from "./CardPriorityBar.svelte";

export const CacheMinutes = 5;

class CardPriorityBox {
    plugin: Plugin;
    cards: Map<string, RiffCard>;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "cardPrioritySet",
            hotkey: "F6",
            editorCallback: async (protyle: IProtyle) => {
                const docID = protyle?.block?.rootID;
                if (!docID) return;
                const blocks = await siyuan.getTreeRiffCardsAll(docID);
                this.updateDocPriorityBatchDialog(blocks);
            },
        });

        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.cardPrioritySet,
                accelerator: "F6",
                click: async () => {
                    const docID = detail?.protyle?.block?.rootID;
                    if (!docID) return;
                    const blocks = await siyuan.getTreeRiffCardsAll(docID);
                    this.updateDocPriorityBatchDialog(blocks);
                },
            });
            menu.addItem({
                label: "为闪卡设置优先级",
                click: () => {
                    this.updatePrioritySelected([detail.element]);
                },
            });
            menu.addItem({
                label: "当前文档与子文档的闪卡全部暂停",
                click: async () => {
                    const docID = detail?.protyle?.block?.rootID;
                    if (!docID) return;
                    const blocks = await siyuan.getTreeRiffCardsAll(docID);
                    await this.stopCards(blocks);
                },
            });
        });

        events.addListener("Tomato-CardPriorityBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static) {
                navigator.locks.request("Tomato-CardPriorityBox-onload", { ifAvailable: true }, async (lock) => {
                    const protyle: IProtyle = detail.protyle;
                    if (!protyle) return;
                    const element = protyle?.wysiwyg?.element as HTMLElement;
                    const docID = protyle?.block?.rootID;
                    if (lock && element && docID) {
                        siyuanCache.getTreeRiffCardsMap(CacheMinutes * 60 * 1000, docID).then(map => {
                            this.cards = map;
                        });
                        await this.addBtns(element);
                        await this.resumeCards(element);
                    }
                });
            }
        });
    }

    blockIconEvent(detail: IEventBusMap["click-blockicon"]) {
        if (!this.plugin) return;
        detail.menu.addItem({
            label: "为闪卡设置优先级",
            click: () => {
                this.updatePrioritySelected(detail.blockElements);
            }
        });
    }

    async stopCards(blocks: Block[], wysiwygElement?: HTMLElement) {
        new DialogText(
            `准备暂停${blocks.length}个闪卡，请先设置闪卡恢复日期`,
            await siyuan.currentTime(10),
            async (datetimeStr: string) => {
                const tidiedStr =
                    timeUtil.makesureDateTimeFormat(datetimeStr);
                if (tidiedStr) {
                    const attrs = {} as AttrType;
                    attrs["custom-card-priority-stop"] = datetimeStr;
                    for (const b of blocks) {
                        const ial = b.ial as unknown as AttrType;
                        await siyuan.setBlockAttrs(ial.id, attrs);
                    }
                    await siyuan.pushMsg("暂停闪卡到：" + datetimeStr);
                } else {
                    await siyuan.pushMsg("输入格式错误");
                }
                if (wysiwygElement) await cardPriorityBox.addBtns(wysiwygElement);
            },
        );
    }

    async updatePrioritySelected(elements: HTMLElement[], priority?: number, cb?: Func) {
        const blocks = (await Promise.all(elements.map(div => {
            return getID(div, [CUSTOM_RIFF_DECKS]);
        }).filter(i => !!i).map(id => siyuan.getBlockAttrs(id)))).map(ial => {
            return { ial };
        }).filter(b => !!b.ial[CUSTOM_RIFF_DECKS]);
        return this.updateDocPriorityBatchDialog(blocks as any, priority, cb);
    }

    private async updateDocPriorityBatchDialog(blocks: Block[], priority?: number, cb?: Func) {
        if (!isValidNumber(priority) || cb) {
            new DialogText(`为${blocks.length}张卡输入新的优先级`, String(priority), async (priorityTxt: string) => {
                const priority = Number(priorityTxt);
                if (isValidNumber(priority)) {
                    await this.updateDocPriorityLock(priority, blocks);
                    await cb();
                } else {
                    await siyuan.pushMsg(`您的输入有误：${priorityTxt}`);
                }
            });
        } else {
            await this.updateDocPriorityLock(priority, blocks);
        }
    }

    private updateDocPriorityLock(newPriority: number, blocks: Block[]): any {
        return navigator.locks.request("CardPriorityBox.updateDocPriorityLock", { ifAvailable: true }, async (lock) => {
            if (lock) {
                await siyuan.pushMsg(`设置闪卡优先级为：${newPriority}`, 2000);
                const count = await this.updateDocPriority(newPriority, blocks);
                await siyuan.pushMsg(`已经调整了${count}个闪卡的优先级`, 2000);
            } else {
                await siyuan.pushMsg("正在修改优先级，请耐心等候……", 2000);
            }
        });
    }

    private async updateDocPriority(newPriority: number, blocks: Block[]) {
        newPriority = ensureValidPriority(newPriority);
        const tasks = await Promise.all(blocks.map(block => {
            const ial = block.ial as unknown as AttrType;
            const priority = readPriority(ial);
            if (newPriority != priority) {
                return setPriority(ial.id, newPriority);
            }
        }).filter(i => !!i));
        return tasks.length;
    }

    async updateCards(options: ICardData) {
        if (!this.plugin) return options;
        let len = options.cards.length;
        if (len <= 1) return options;
        options.cards = shuffleArray(options.cards);
        const attrList = await Promise.all(options.cards.map(card => siyuan.getBlockAttrs(card.blockID)));

        resumeCardsDeleteAttr(attrList);

        const [attrMap, stopSet] = attrList.reduce(([attrMap, stopSet], attr) => {
            if (attr?.id) {
                const p = readPriority(attr);
                attrMap.set(attr.id, readPriority(attr));
                if (p == -1) stopSet.add(attr.id);
            }
            return [attrMap, stopSet];
        }, [new Map<string, number>(), new Set<string>()]);
        options.cards.sort((a, b) => attrMap.get(b.blockID) - attrMap.get(a.blockID));
        const stoped = options.cards.filter(card => stopSet.has(card.blockID));
        let available = options.cards.filter(card => !stopSet.has(card.blockID));
        len = available.length;
        const n = Math.floor(len * 5 / 100);
        if (n > 0 && len > n) {
            const lastN = available.slice(len - n);
            available = available.slice(0, len - n);
            for (const e of lastN) {
                const randPosition = Math.floor(Math.random() * (len / 3));
                available.splice(randPosition, 0, e);
            }
        }
        options.cards = [...available, ...stoped];
        return options;
    }

    async resumeCards(wysiwygElement: HTMLElement) {
        return resumeCardsDeleteAttr(
            [...wysiwygElement.querySelectorAll(`[${CARD_PRIORITY_STOP}]`)]
                .map((e: HTMLElement) => {
                    return {
                        "custom-card-priority-stop": e.getAttribute(CARD_PRIORITY_STOP),
                        id: e.getAttribute(DATA_NODE_ID)
                    } as AttrType;
                }));
    }

    async addBtns(wysiwygElement: HTMLElement) {
        [...wysiwygElement.querySelectorAll(`[${CUSTOM_RIFF_DECKS}]`)]
            .map((cardElement: HTMLElement) => {
                cardElement.querySelectorAll(`[${TOMATO_CONTROL_ELEMENT}]`).forEach(e => e.parentElement.removeChild(e));
                const textContent = cardElement.textContent;
                const protyleAttrElement = cardElement.querySelector(".protyle-attr");
                if (protyleAttrElement) {
                    new CardPriorityBar({
                        target: protyleAttrElement,
                        props: {
                            cardElement,
                            wysiwygElement,
                            textContent,
                        }
                    });
                }
            });
    }
}

async function resumeCardsDeleteAttr(attrList: AttrType[]) {
    const now = await siyuan.currentTime();
    const newAttrs = {} as AttrType;
    newAttrs["custom-card-priority-stop"] = "";
    const tasks = attrList.filter(attrList => {
        const date = attrList["custom-card-priority-stop"];
        if (date && now >= date) {
            delete attrList["custom-card-priority-stop"];
            return true;
        }
        return false;
    })
        .map(attrList => siyuan.setBlockAttrs(attrList.id, newAttrs));
    return Promise.all(tasks);
}

function readPriority(ial: AttrType) {
    if (ial["custom-card-priority-stop"]) {
        return -1;
    }
    let priority = Number(ial["custom-card-priority"]);
    if (!isValidNumber(priority)) {
        priority = 50;
    }
    return priority;
}

async function setPriority(blockID: string, newPriority: number) {
    const attr = {} as AttrType;
    attr["custom-card-priority"] = String(newPriority);
    return siyuan.setBlockAttrs(blockID, attr);
}

function ensureValidPriority(priority: number) {
    if (priority > 100) priority = 100;
    if (priority < 0) priority = 0;
    return priority;
}

export const cardPriorityBox = new CardPriorityBox();
