import { ICardData, IEventBusMap, IProtyle, Plugin } from "siyuan";
import "./index.scss";
import { getID, isValidNumber, shuffleArray, siyuan, siyuanCache, sleep } from "./libs/utils";
import { CUSTOM_RIFF_DECKS } from "./libs/gconst";

class CardPriorityBox {
    private plugin: Plugin;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "cardPriorityReset",
            hotkey: "F6",
            editorCallback: (protyle: IProtyle) => {
                this.updateDocPriorityLock(protyle, 0);
            },
        });
        this.plugin.addCommand({
            langKey: "cardPrioritySub",
            hotkey: "F7",
            editorCallback: (protyle: IProtyle) => {
                this.updateDocPriorityLock(protyle, -1);
            },
        });
        this.plugin.addCommand({
            langKey: "cardPriorityAdd",
            hotkey: "F8",
            editorCallback: (protyle: IProtyle) => {
                this.updateDocPriorityLock(protyle, +1);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.cardPriorityReset,
                icon: "iconRestore",
                accelerator: "F6",
                click: () => {
                    this.updateDocPriorityLock(detail.protyle, 0);
                },
            });
            menu.addItem({
                label: this.plugin.i18n.cardPrioritySub,
                icon: "iconDown",
                accelerator: "F7",
                click: () => {
                    this.updateDocPriorityLock(detail.protyle, -1);
                },
            });
            menu.addItem({
                label: this.plugin.i18n.cardPriorityAdd,
                icon: "iconUp",
                accelerator: "F8",
                click: () => {
                    this.updateDocPriorityLock(detail.protyle, +1);
                },
            });
            menu.addItem({
                label: "闪卡减少一点优先级",
                icon: "iconDown",
                click: () => {
                    this.updatePriority(detail.protyle, [detail.element], -1);
                },
            });
            menu.addItem({
                label: "闪卡增加一点优先级",
                icon: "iconUp",
                click: () => {
                    this.updatePriority(detail.protyle, [detail.element], +1);
                },
            });
        });
        this.loadCards().then();
    }

    private async loadCards() {
        const cards = [...await siyuan.getRiffCardsAll()];
        // while (true) {
        for (const card of cards) {
            try {
                await siyuanCache.getBlockAttrs(60000, card.id)
                // console.log(card.id)
            } catch (_e) { }
            finally {
                await sleep(10);
            }
        }
        // }
    }

    blockIconEvent(detail: IEventBusMap["click-blockicon"]) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "⬇️",
            label: "闪卡减少一点优先级",
            click: () => {
                this.updatePriority(detail.protyle, detail.blockElements, -1);
            }
        });
        detail.menu.addItem({
            iconHTML: "⬆️",
            label: "闪卡增加一点优先级",
            click: () => {
                this.updatePriority(detail.protyle, detail.blockElements, +1);
            }
        });
    }

    private async updatePriority(protyle: IProtyle, elements: HTMLElement[], delta: number) {
        const blocks = (await Promise.all(elements.map(div => {
            return getID(div, [CUSTOM_RIFF_DECKS]);
        }).filter(i => !!i).map(id => siyuan.getBlockAttrs(id)))).map(ial => {
            return { ial };
        }).filter(b => !!b.ial[CUSTOM_RIFF_DECKS]);
        return this.updateDocPriorityLock(protyle, delta, blocks as any);
    }

    private async updateDocPriorityLock(protyle: IProtyle, delta: number, blocks?: Block[]) {
        return navigator.locks.request("CardPriorityBox.updateDocPriorityLock", { ifAvailable: true }, async (lock) => {
            if (lock) {
                await pushPriorityMsg(delta);
                const count = await this.updateDocPriority(protyle, delta, blocks);
                await siyuan.pushMsg(`已经调整了${count}个闪卡的优先级`);
            } else {
                await siyuan.pushMsg("正在修改优先级，请耐心等候……");
            }
        });
    }

    private async updateDocPriority(protyle: IProtyle, delta: number, blocks?: Block[]) {
        if (!blocks) {
            const docID = protyle?.block?.rootID;
            if (!docID) return;
            blocks = await siyuan.getTreeRiffCardsAll(docID);
        }
        const tasks = await Promise.all(blocks.map(block => {
            const ial = block.ial as unknown as AttrType;
            const priority = readPriority(ial);
            if (delta == 0) {
                if (priority != 50) {
                    return setPriority(ial.id, 50);
                }
            } else {
                const newPriority = ensureValidPriority(priority + delta);
                if (priority != newPriority) {
                    return setPriority(ial.id, newPriority);
                }
            }
        }).filter(i => !!i));
        return tasks.length;
    }

    async updateCards(options: ICardData) {
        if (!this.plugin) return options;
        siyuan.pushMsg("正在根据优先级排序……", 2000);
        const handle = setTimeout(() => {
            siyuan.pushMsg(`您的卡数量有${options.cards.length}个，闪卡越多排序越久，<br>
建议到 设置 -> 闪卡，<br>
限制新卡上限、复习卡上限。`, 15000);
        }, 6000);
        const start = new Date();
        try {
            let count = 0;
            const attrMap = (await Promise.all(options.cards.map(card => siyuanCache.getBlockAttrs(60000, card.blockID))))
                .reduce((map, attr) => {
                    if (attr?.id) {
                        map.set(attr.id, readPriority(attr));
                    } else {
                        count++;
                    }
                    return map;
                }, new Map<string, number>());
            options.cards = shuffleArray(options.cards);
            options.cards = options.cards.sort((a, b) => attrMap.get(b.blockID) - attrMap.get(a.blockID));
            if (count > 0) {
                console.log(`您有${count}个疑似失效的闪卡。卡包里有闪卡，但笔记本里找不到对应的闪卡。`);
            }
        } finally {
            clearTimeout(handle);
            const end = new Date().getTime() - start.getTime();
            siyuan.pushMsg(`按优先级排序${options.cards.length}个闪卡，花费${end / 1000}秒。<br>数据库已经预热，下次排序更快。`, 2000);
        }
        return options;
    }
}

function readPriority(ial: AttrType) {
    let priority = Number(ial["custom-card-priority"]);
    if (!isValidNumber(priority)) {
        priority = 50;
    }
    return priority;
}

async function pushPriorityMsg(delta: number) {
    if (delta == 0) {
        return siyuan.pushMsg("开始重置闪卡的优先级为50");
    } else if (delta == -1) {
        return siyuan.pushMsg("开始减少一点所有闪卡的优先级");
    } else if (delta == 1) {
        return siyuan.pushMsg("开始增加一点所有闪卡的优先级");
    }
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
