import { ICardData, IEventBusMap, IProtyle, Plugin } from "siyuan";
import "./index.scss";
import { getID, isValidNumber, shuffleArray, siyuan } from "./libs/utils";
import { CARD_PRIORITY, CUSTOM_RIFF_DECKS, SPACE, TOMATO_CONTROL_ELEMENT } from "./libs/gconst";
import { DialogText } from "./libs/DialogText";
import { EventType, events } from "./libs/Events";

class CardPriorityBox {
    private plugin: Plugin;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "cardPrioritySet",
            hotkey: "F6",
            editorCallback: (protyle: IProtyle) => {
                this.updateDocPriorityLock(protyle);
            },
        });

        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.cardPrioritySet,
                accelerator: "F6",
                click: () => {
                    this.updateDocPriorityLock(detail.protyle);
                },
            });
            menu.addItem({
                label: "为闪卡设置优先级",
                click: () => {
                    this.updatePriority(detail.protyle, [detail.element]);
                },
            });
        });

        events.addListener("Tomato-CardPriorityBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static) {
                navigator.locks.request("Tomato-CardPriorityBox-onload", { ifAvailable: true }, async (lock) => {
                    const protyle: IProtyle = detail.protyle;
                    if (!protyle) return;
                    const element = protyle?.wysiwyg?.element as HTMLElement;
                    if (lock && element) {
                        await addBtns(element);
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
                this.updatePriority(detail.protyle, detail.blockElements);
            }
        });
    }

    private async updatePriority(protyle: IProtyle, elements: HTMLElement[]) {
        const blocks = (await Promise.all(elements.map(div => {
            return getID(div, [CUSTOM_RIFF_DECKS]);
        }).filter(i => !!i).map(id => siyuan.getBlockAttrs(id)))).map(ial => {
            return { ial };
        }).filter(b => !!b.ial[CUSTOM_RIFF_DECKS]);
        return this.updateDocPriorityLock(protyle, blocks as any);
    }

    private async updateDocPriorityLock(protyle: IProtyle, blocks?: Block[]) {
        new DialogText("输入新的优先级", "50", async (newPriority: string) => {
            const p = Number(newPriority);
            if (isValidNumber(p)) {
                return navigator.locks.request("CardPriorityBox.updateDocPriorityLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        await siyuan.pushMsg(`设置闪卡优先级为：${newPriority}`);
                        const count = await this.updateDocPriority(protyle, p, blocks);
                        await siyuan.pushMsg(`已经调整了${count}个闪卡的优先级`);
                    } else {
                        await siyuan.pushMsg("正在修改优先级，请耐心等候……");
                    }
                });
            } else {
                await siyuan.pushMsg(`您的输入有误：${newPriority}`);
            }
        });
    }

    private async updateDocPriority(protyle: IProtyle, newPriority: number, blocks?: Block[]) {
        newPriority = ensureValidPriority(newPriority);
        if (!blocks) {
            const docID = protyle?.block?.rootID;
            if (!docID) return;
            blocks = await siyuan.getTreeRiffCardsAll(docID);
        }
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
}

async function addBtns(element: HTMLElement) {
    [...element.querySelectorAll(`[${CUSTOM_RIFF_DECKS}]`)]
        .filter(e => e.querySelectorAll(`[${TOMATO_CONTROL_ELEMENT}]`).length == 0)
        .map((e: HTMLElement) => {
            const priority = e.getAttribute(CARD_PRIORITY) ?? "50";
            const div = e.appendChild(document.createElement("div"));
            div.setAttribute(TOMATO_CONTROL_ELEMENT, "1");
            // div.style.paddingLeft = "20px";
            div.contentEditable = "false";
            div.style.display = "flex"
            div.style.justifyContent = "space-between"
            div.style.fontSize = "small"

            div.appendChild(document.createElement("span"));//2
            const label = div.appendChild(document.createElement("label"));//1
            const subDiv = div.appendChild(document.createElement("div")); // 0
            div.appendChild(document.createElement("span"));//1
            div.appendChild(document.createElement("span"));//2

            const subOne = subDiv.appendChild(document.createElement("a"));
            const span = subDiv.appendChild(document.createElement("span"));
            const addOne = subDiv.appendChild(document.createElement("a"));

            label.textContent = "闪卡优先级"
            span.textContent = SPACE + `${priority}` + SPACE;

            addOne.classList.add("b3-button");
            addOne.classList.add("b3-button--white");
            addOne.textContent = "➕";

            subOne.classList.add("b3-button");
            subOne.classList.add("b3-button--white");
            subOne.textContent = "➖";
        });
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
