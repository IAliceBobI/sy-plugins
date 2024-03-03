import { ICardData, IEventBusMap, IProtyle, Plugin } from "siyuan";
import "./index.scss";
import { getID, isCardUI, isValidNumber, siyuan, siyuanCache, timeUtil } from "./libs/utils";
import { CARD_PRIORITY_STOP, CUSTOM_RIFF_DECKS, DATA_NODE_ID, TEMP_CONTENT, TOMATO_CONTROL_ELEMENT } from "./libs/gconst";
import { DialogText } from "./libs/DialogText";
import { EventType, events } from "./libs/Events";
import CardPriorityBar from "./CardPriorityBar.svelte";
import { doStopCards } from "./libs/cardUtils";

export const CacheMinutes = 5;

class CardPriorityBox {
    plugin: Plugin;
    cards: Map<string, RiffCard>;
    beforeReview: Map<string, DueCard>;
    private settingCfg: TomatoSettings;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.settingCfg = (plugin as any).settingCfg;
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
                icon: "iconStar",
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
                icon: "iconStar",
                click: () => {
                    this.updatePrioritySelected([detail.element]);
                },
            });
            menu.addItem({
                label: "当前文档与子文档的闪卡全部推迟",
                icon: "iconFocus",
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
                    label: "推迟当前所有未复习完成的闪卡",
                    click: async () => {
                        await this.stopCards(await this.getRestCards());
                    },
                });
            }
        });

        events.addListener("Tomato-CardPriorityBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static) {
                navigator.locks.request("Tomato-CardPriorityBox-onload", { ifAvailable: true }, async (lock) => {
                    const protyle: IProtyle = detail.protyle;
                    if (!protyle) return;
                    const element = protyle?.element as HTMLElement;
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

        this.plugin.setting.addItem({
            title: "** 连续2次重来加优先级，连续2次简单减优先级",
            description: "依赖：闪卡优先级。",
            createActionElement: () => {
                const checkbox = document.createElement("input") as HTMLInputElement;
                checkbox.type = "checkbox";
                checkbox.checked = this.settingCfg["auto-card-priority"] ?? false;
                checkbox.addEventListener("change", () => {
                    this.settingCfg["auto-card-priority"] = checkbox.checked;
                });
                checkbox.className = "b3-switch fn__flex-center";
                return checkbox;
            },
        });

        if (this.settingCfg["auto-card-priority"]) {
            this.plugin.eventBus.on(EventType.click_flashcard_action as any, async ({ detail }: { detail: { type: string, card: DueCard } }) => {
                const id = detail?.card?.blockID;
                if (!id) return;
                // -1显示答案, -2上一步, -3跳过, 1重来, 2困难, 3良好, 4简单
                if (detail.type === "1" && String(detail.card.state) === "1") {
                    const attr = await siyuan.getBlockAttrs(id);
                    const p = readPriority(attr);
                    this.updateDocPriorityBatchDialog([{ ial: attr } as any], p + 1);
                } else if (detail.type === "4" && String(detail.card.state) === "4") {
                    const attr = await siyuan.getBlockAttrs(id);
                    const p = readPriority(attr);
                    this.updateDocPriorityBatchDialog([{ ial: attr } as any], p - 1);
                }
            });
        }
    }

    async getRestCards() {
        const blocks = (await siyuan.getRiffDueCards()).cards.filter(due => {
            const oldDue = this.beforeReview.get(due.blockID);
            if (oldDue) {
                if (oldDue.state === due.state) {
                    return true;
                }
            }
            return false;
        }).map(due => {
            return { ial: { id: due.blockID } } as unknown as GetCardRetBlock;
        });
        return blocks;
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
            label: "闪卡推迟/取消推迟",
            click: (_e, event) => {
                for (const e of detail.blockElements) {
                    this.stopCard(event, e);
                }
            }
        });
        if (isCardUI(detail as any)) {
            detail.menu.addItem({
                iconHTML: "🚗🛑",
                label: "推迟当前所有未复习完成的闪卡",
                click: async () => {
                    await this.stopCards(await this.getRestCards());
                },
            });
        }
    }

    async stopCard(event: MouseEvent, cardElement: HTMLElement) {
        event.stopPropagation();
        const id = getID(cardElement, [CUSTOM_RIFF_DECKS]);
        if (!id) return;
        const attrs = await siyuan.getBlockAttrs(id);
        if (attrs[CARD_PRIORITY_STOP]) {
            await resumeCard([id], true);
            await siyuan.pushMsg("继续闪卡");
        } else {
            await this.stopCards([{ ial: { id } }] as any);
        }
    }

    async stopCards(blocks: GetCardRetBlock[]) {
        new DialogText(
            `准备推迟${blocks.length}个闪卡，请先设置推迟天数`,
            "2",
            async (days: string) => {
                await doStopCards(days, blocks);
            },
        );
    }

    async updatePrioritySelected(elements: HTMLElement[], priority?: number, dialog?: boolean, cb?: Func) {
        const blocks = (await Promise.all(elements.map(div => {
            return getID(div, [CUSTOM_RIFF_DECKS]);
        }).filter(i => !!i).map(id => siyuan.getBlockAttrs(id)))).map(ial => {
            return { ial };
        }).filter(b => !!b.ial[CUSTOM_RIFF_DECKS]);
        return this.updateDocPriorityBatchDialog(blocks as any, priority, dialog, cb);
    }

    private async updateDocPriorityBatchDialog(blocks: GetCardRetBlock[], priority?: number, dialog?: boolean, cb?: Func) {
        const validNum = isValidNumber(priority);
        if (dialog || !validNum) {
            if (!validNum) priority = 50;
            new DialogText(`为${blocks.length}张卡输入新的优先级`, String(priority), async (priorityTxt: string) => {
                const priority = Number(priorityTxt);
                if (isValidNumber(priority)) {
                    await this.updateDocPriorityLock(priority, blocks, cb);
                } else {
                    await siyuan.pushMsg(`您的输入有误：${priorityTxt}`);
                }
            });
        } else {
            await this.updateDocPriorityLock(priority, blocks, cb);
        }
    }

    // update the entire doc cards
    private updateDocPriorityLock(newPriority: number, blocks: GetCardRetBlock[], cb?: Func) {
        return navigator.locks.request("CardPriorityBox.updateDocPriorityLock", { ifAvailable: true }, async (lock) => {
            if (lock) {
                await siyuan.pushMsg(`设置闪卡优先级为：${newPriority}`, 2000);
                const count = await this.updateDocPriority(newPriority, blocks, cb);
                await siyuan.pushMsg(`已经调整了${count}个闪卡的优先级`, 2000);
            } else {
                await siyuan.pushMsg("正在修改优先级，请耐心等候……", 2000);
            }
        });
    }

    private async updateDocPriority(newPriority: number, blocks: GetCardRetBlock[], cb?: Func) {
        newPriority = ensureValidPriority(newPriority);
        const params = blocks.map(block => {
            const ial = block.ial as unknown as AttrType;
            const priority = readPriority(ial);
            if (newPriority != priority) {
                const attrs = {} as AttrType;
                attrs["custom-card-priority"] = String(newPriority);
                return { id: ial.id, attrs };
            }
        }).filter(i => !!i);
        await siyuan.batchSetBlockAttrs(params);
        if (cb) {
            cb(newPriority);
        } else {
            setTimeout(() => {
                events.protyleReload();
            }, 500);
        }
        return params.length;
    }

    async updateCards(options: ICardData) {
        if (!options?.cards?.length) return options;
        if (!this.plugin) return options;
        const OldLen = options.cards.length;
        if (OldLen <= 1) return options;

        const attrList = await Promise.all(options.cards.map(card => siyuan.getBlockAttrs(card.blockID)));
        await resumeCardsDeleteAttr(attrList);

        type CARD = { card: typeof options.cards[0], p: number };
        const cardsMap = options.cards.reduce((m, c) => {
            m.set(c.blockID, { card: c, p: 0 });
            return m;
        }, new Map<string, CARD>());

        const { review, stop } = attrList.reduce(({ hasPiece, review, stop }, attr) => {
            if (attr?.id) {
                const card = cardsMap.get(attr.id).card;
                const p = readPriority(attr);
                const progmark = attr["custom-progmark"] as string;
                if (progmark?.includes(TEMP_CONTENT)) {
                    if (!hasPiece) {
                        hasPiece = true;
                        review.set(attr.id, { card, p });
                    } else {
                        stop.set(attr.id, { card, p });
                    }
                } else {
                    review.set(attr.id, { card, p });
                }
            }
            return { hasPiece, review, stop };
        }, { hasPiece: false, review: new Map<string, CARD>(), stop: new Map<string, CARD>() });

        await Promise.all([...stop.values()].map(c => siyuan.skipReviewRiffCard(c.card.cardID)));

        options.cards = [...review.values()].map((c) => c.card);
        options.cards.sort((a, b) => review.get(b.blockID).p - review.get(a.blockID).p);
        // const len = options.cards.length;
        // const n = Math.floor(len * 5 / 100);
        // if (n > 0 && len > n) {
        //     const lastN = options.cards.slice(len - n);
        //     options.cards = options.cards.slice(0, len - n);
        //     for (const e of lastN) {
        //         const randPosition = Math.floor(Math.random() * (len / 3));
        //         options.cards.splice(randPosition, 0, e);
        //     }
        // }
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
                    let id = e.getAttribute(DATA_NODE_ID);
                    if (!id) {
                        const e1 = e.parentElement.querySelector(`.protyle-title.protyle-wysiwyg--attr[${DATA_NODE_ID}]`);
                        id = e1.getAttribute(DATA_NODE_ID);
                    }
                    return {
                        "custom-card-priority-stop": e.getAttribute(CARD_PRIORITY_STOP),
                        id,
                    } as AttrType;
                }));
    }

    async addBtns(wysiwygElement: HTMLElement) {
        if (!wysiwygElement) return;
        [...wysiwygElement.querySelectorAll(`[${CUSTOM_RIFF_DECKS}][${DATA_NODE_ID}]`)]
            .map((cardElement: HTMLElement) => {
                cardElement.querySelectorAll(`[${TOMATO_CONTROL_ELEMENT}]`).forEach(e => e.parentElement.removeChild(e));
                const textContent = cardElement.textContent;
                const protyleAttrElement = cardElement.querySelector(".protyle-attr");
                if (protyleAttrElement) {
                    new CardPriorityBar({
                        target: protyleAttrElement,
                        props: {
                            cardElement,
                            textContent,
                        }
                    });
                }
            });
    }
}

export async function resumeCard(blockIDs: string[], setDue = false) {
    if (blockIDs.length == 0) return;
    const newAttrs = {} as AttrType;
    newAttrs["custom-card-priority-stop"] = "";
    newAttrs.bookmark = "";
    await siyuan.batchSetBlockAttrs(blockIDs.map(b => {
        return { id: b, attrs: newAttrs };
    }));
    if (setDue) {
        let datetimeStr = await siyuan.currentTime(-60 * 60 * 24); // TODO: XX
        datetimeStr = timeUtil.makesureDateTimeFormat(datetimeStr);
        await siyuan.batchSetRiffCardsDueTimeByBlockID(blockIDs.map((b) => {
            return {
                id: b,
                due: datetimeStr.replace(/[- :]/g, ""),
            };
        }));
    }
    if (blockIDs.length > 0) {
        setTimeout(() => {
            events.protyleReload();
        }, 500);
    }
}

async function resumeCardsDeleteAttr(attrList: AttrType[]) {
    const now = await siyuan.currentTime();
    const ids = attrList.filter(attrList => {
        const date = attrList["custom-card-priority-stop"];
        if (date && now >= date) {
            delete attrList["custom-card-priority-stop"];
            return true;
        }
        return false;
    })
        .map(attrList => attrList.id).filter(i => !!i);
    return resumeCard(ids);
}

function readPriority(ial: AttrType) {
    if (!ial) return 50;
    let priority = Number(ial["custom-card-priority"]);
    if (!isValidNumber(priority)) {
        priority = 50;
    }
    return priority;
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