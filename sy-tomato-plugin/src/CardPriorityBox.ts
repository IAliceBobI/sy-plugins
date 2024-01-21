import { ICardData, IEventBusMap, IProtyle, Plugin, confirm } from "siyuan";
import "./index.scss";
import { getID, isValidNumber, shuffleArray, siyuan, siyuanCache } from "./libs/utils";
import { CARD_PRIORITY, CUSTOM_RIFF_DECKS, DATA_NODE_ID, SPACE, TOMATO_CONTROL_ELEMENT } from "./libs/gconst";
import { DialogText } from "./libs/DialogText";
import { EventType, events } from "./libs/Events";

const CacheMinutes = 5;

class CardPriorityBox {
    private plugin: Plugin;
    private cards: Map<string, RiffCard>;

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

    private async updatePrioritySelected(elements: HTMLElement[], priority?: number) {
        const blocks = (await Promise.all(elements.map(div => {
            return getID(div, [CUSTOM_RIFF_DECKS]);
        }).filter(i => !!i).map(id => siyuan.getBlockAttrs(id)))).map(ial => {
            return { ial };
        }).filter(b => !!b.ial[CUSTOM_RIFF_DECKS]);
        return this.updateDocPriorityBatchDialog(blocks as any, priority);
    }

    private async updateDocPriorityBatchDialog(blocks: Block[], priority?: number) {
        if (isValidNumber(priority)) {
            await this.updateDocPriorityLock(priority, blocks);
        } else {
            new DialogText(`为${blocks.length}张卡输入新的优先级`, "50", async (priorityTxt: string) => {
                const priority = Number(priorityTxt);
                if (isValidNumber(priority)) {
                    return this.updateDocPriorityLock(priority, blocks);
                } else {
                    await siyuan.pushMsg(`您的输入有误：${priorityTxt}`);
                }
            });
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
        shuffleArray(options.cards);
        const attrMap = (await Promise.all(options.cards.map(card => siyuan.getBlockAttrs(card.blockID))))
            .reduce((map, attr) => {
                if (attr?.id) {
                    map.set(attr.id, readPriority(attr));
                }
                return map;
            }, new Map<string, number>());
        options.cards.sort((a, b) => attrMap.get(b.blockID) - attrMap.get(a.blockID));
        return options;
    }

    private async addBtns(element: HTMLElement) {
        [...element.querySelectorAll(`[${CUSTOM_RIFF_DECKS}]`)]
            .map((e: HTMLElement) => {
                e.querySelectorAll(`[${TOMATO_CONTROL_ELEMENT}]`).forEach(e => e.parentElement.removeChild(e));

                const cardID = e.getAttribute(DATA_NODE_ID);
                const text = e.textContent;

                let priority = Number(e.getAttribute(CARD_PRIORITY) ?? "50");
                if (!isValidNumber(priority)) priority = 50;

                const div = e.querySelector(".protyle-attr")?.appendChild(document.createElement("div"));
                if (div) {
                    div.setAttribute(TOMATO_CONTROL_ELEMENT, "1");
                    div.style.display = "flex";

                    const subDiv = div.appendChild(document.createElement("div"));
                    const subOne = subDiv.appendChild(document.createElement("a"));
                    const priText = subDiv.appendChild(document.createElement("span"));
                    const addOne = subDiv.appendChild(document.createElement("a"));
                    const spanSpace = subDiv.appendChild(document.createElement("span"));
                    const rmCard = subDiv.appendChild(document.createElement("a"));


                    priText.textContent = `${SPACE + priority + SPACE}`;
                    if (this.cards?.has(cardID)) {
                        priText.title = `${JSON.stringify(this.cards.get(cardID))}【${CacheMinutes}分钟缓存】`;
                        priText.innerHTML = `<strong>${priText.textContent}</strong>`;
                    }
                    spanSpace.textContent = SPACE;

                    addOne.title = "闪卡优先级+1";
                    addOne.textContent = "➕";

                    subOne.title = "闪卡优先级-1";
                    subOne.textContent = "➖";

                    rmCard.title = "取消制卡";
                    rmCard.textContent = "🚫";

                    addOne.addEventListener("click", async () => {
                        await this.updatePrioritySelected([e], priority + 1);
                        await this.addBtns(element);
                    });
                    subOne.addEventListener("click", async () => {
                        await this.updatePrioritySelected([e], priority - 1);
                        await this.addBtns(element);
                    });
                    rmCard.addEventListener("click", () => {
                        confirm("删除闪卡", text, async () => {
                            await siyuan.removeRiffCards([cardID]);
                            e.querySelectorAll(`[${TOMATO_CONTROL_ELEMENT}]`).forEach(e => {
                                e.parentElement.removeChild(e);
                            });
                        });
                    });
                }
            });
    }
}


function readPriority(ial: AttrType) {
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
