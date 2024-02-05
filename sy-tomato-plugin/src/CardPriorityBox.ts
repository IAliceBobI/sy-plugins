import { ICardData, IEventBusMap, IProtyle, Plugin, Protyle } from "siyuan";
import "./index.scss";
import { getID, isCardUI, isValidNumber, shuffleArray, siyuan, siyuanCache, timeUtil } from "./libs/utils";
import { CARD_PRIORITY_STOP, CUSTOM_RIFF_DECKS, DATA_NODE_ID, TOMATO_CONTROL_ELEMENT } from "./libs/gconst";
import { DialogText } from "./libs/DialogText";
import { EventType, events } from "./libs/Events";
import CardPriorityBar from "./CardPriorityBar.svelte";

export const CacheMinutes = 5;

class CardPriorityBox {
    plugin: Plugin;
    cards: Map<string, RiffCard>;
    beforeReview: Map<string, DueCard>;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.beforeReview = new Map();
        this.cards = new Map();
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
            if (isCardUI(detail as any)) {
                menu.addItem({
                    iconHTML: "🚗🛑",
                    label: "暂停当前所有未复习完成的闪卡",
                    click: async () => {
                        await this.autoStopRestCards(detail as any);
                    },
                });
            }
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

    async autoStopRestCards(protyle: Protyle) {
        const blocks = (await siyuan.getRiffDueCards()).cards.filter(due => {
            const oldDue = this.beforeReview.get(due.blockID);
            if (oldDue) {
                if (oldDue.state === due.state) {
                    return true;
                }
            }
            return false;
        }).map(due => {
            return { ial: { id: due.blockID } } as unknown as Block;
        });
        await this.stopCards(blocks, protyle?.protyle?.wysiwyg?.element);
    }

    blockIconEvent(detail: IEventBusMap["click-blockicon"]) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "🏆",
            label: "为闪卡设置优先级",
            click: () => {
                this.updatePrioritySelected(detail.blockElements);
            }
        });
        detail.menu.addItem({
            iconHTML: "🛑",
            label: "闪卡暂停/恢复",
            click: (_e, event) => {
                for (const e of detail.blockElements) {
                    this.stopCard(event, e, detail.protyle?.wysiwyg?.element);
                }
            }
        });
        if (isCardUI(detail as any)) {
            detail.menu.addItem({
                iconHTML: "🚗🛑",
                label: "暂停当前所有未复习完成的闪卡",
                click: async () => {
                    await this.autoStopRestCards(detail as any);
                },
            });
        }
    }

    async stopCard(event: MouseEvent, cardElement: HTMLElement, wysiwygElement?: HTMLElement) {
        event.stopPropagation();
        const id = getID(cardElement, [CUSTOM_RIFF_DECKS]);
        if (!id) return;
        const attrs = await siyuan.getBlockAttrs(id);
        if (attrs[CARD_PRIORITY_STOP]) {
            await resumeCard(id);
            await siyuan.pushMsg("继续闪卡");
            await cardPriorityBox.addBtns(wysiwygElement);
        } else {
            await cardPriorityBox.stopCards(
                [{ ial: { id } }] as any,
                wysiwygElement,
            );
        }
    }

    async stopCards(blocks: Block[], wysiwygElement?: HTMLElement) {
        new DialogText(
            `准备暂停${blocks.length}个闪卡，请先设置暂停天数`,
            "2",
            async (days: string) => {
                if (isValidNumber(Number(days))) {
                    let datetimeStr = await siyuan.currentTime(Number(days) * 24 * 60 * 60);
                    datetimeStr = timeUtil.makesureDateTimeFormat(datetimeStr);
                    if (datetimeStr) {
                        for (const b of blocks) {
                            const ial = b.ial as unknown as AttrType;
                            stopCard(ial.id, datetimeStr).then();
                        }
                        await siyuan.pushMsg(`暂停${blocks.length}个闪卡${days}天`);
                    }
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
        const OldLen = options.cards.length;
        if (OldLen <= 1) return options;
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

        const stopped = options.cards.filter(card => stopSet.has(card.blockID));
        await Promise.all(stopped.map(c => siyuan.skipReviewRiffCard(c.cardID)));

        options.cards = options.cards.filter(card => !stopSet.has(card.blockID));
        const len = options.cards.length;
        const n = Math.floor(len * 5 / 100);
        if (n > 0 && len > n) {
            const lastN = options.cards.slice(len - n);
            options.cards = options.cards.slice(0, len - n);
            for (const e of lastN) {
                const randPosition = Math.floor(Math.random() * (len / 3));
                options.cards.splice(randPosition, 0, e);
            }
        }
        this.beforeReview = (await siyuan.getRiffDueCards()).cards
            .filter(c => options.cards.findIndex((v) => v.blockID === c.blockID) >= 0)
            .reduce((m, c) => {
                m.set(c.blockID, c);
                return m;
            }, new Map());
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
        if (!wysiwygElement) return;
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

export async function resumeCard(blockID: string) {
    const newAttrs = {} as AttrType;
    newAttrs["custom-card-priority-stop"] = "";
    newAttrs.bookmark = "";
    return siyuan.setBlockAttrs(blockID, newAttrs);
}

async function stopCard(blockID: string, datetimeStr: string) {
    const newAttrs = {} as AttrType;
    newAttrs["custom-card-priority-stop"] = datetimeStr;
    newAttrs.bookmark = "🛑 Suspended Cards";
    siyuan.setBlockAttrs(blockID, newAttrs);
}

async function resumeCardsDeleteAttr(attrList: AttrType[]) {
    const now = await siyuan.currentTime();
    const tasks = attrList.filter(attrList => {
        const date = attrList["custom-card-priority-stop"];
        if (date && now >= date) {
            delete attrList["custom-card-priority-stop"];
            return true;
        }
        return false;
    })
        .map(attrList => resumeCard(attrList.id));
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

// private updateCardStatistic(options: ICardData, OldLen: number) {
//     options.unreviewedCount = options.cards.length;
//     for (let i = 0; i < OldLen - options.unreviewedCount; i++) {
//         const card = options.cards[i];
//         const cardInfo = this.cards?.get(card.blockID)
//         if (cardInfo) {
//             if (cardInfo.reps > 0) {
//                 options.unreviewedOldCardCount--;
//                 console.log("cardInfo unreviewedOldCardCount--")
//             } else {
//                 options.unreviewedNewCardCount--;
//                 console.log("cardInfo unreviewedNewCardCount--")
//             }
//         } else {
//             if (options.unreviewedOldCardCount > 0) {
//                 options.unreviewedOldCardCount--;
//                 console.log("unreviewedOldCardCount--")
//             } else {
//                 options.unreviewedNewCardCount--;
//                 console.log("unreviewedNewCardCount--")
//             }
//         }
//     }
// }