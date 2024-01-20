import { ICardData, IEventBusMap, IProtyle, Plugin } from "siyuan";
import "./index.scss";
import { getID, isValidNumber, shuffleArray, siyuan } from "./libs/utils";
import { CUSTOM_RIFF_DECKS } from "./libs/gconst";
import { DialogText } from "./libs/DialogText";

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
                        await siyuan.pushMsg(`设置闪卡优先级为：${newPriority}`)
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
        newPriority = ensureValidPriority(newPriority)
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
