import { ICardData, IProtyle, Plugin } from "siyuan";
import "./index.scss";
import { isValidNumber, siyuan } from "./libs/utils";

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
                label: "闪卡增加一点优先级",
                icon: "iconFlashcard",
                accelerator: "⌥E",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    if (blockID) {
                        // this.blankSpaceCard(blockID, blank, detail?.range, detail?.protyle, cardType);
                    }
                },
            });
            menu.addItem({
                label: "闪卡减少一点优先级",
                icon: "iconFlashcard",
                accelerator: "⌘`",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    if (blockID) {
                        // this.blankSpaceCard(blockID, blank, detail?.range, detail?.protyle, cardType, getDailyPath());
                    }
                },
            });
        });
    }

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "",
            label: "闪卡增加一点优先级",
            click: () => {
                this.updatePriority(detail.protyle, +1);
            }
        });
        detail.menu.addItem({
            iconHTML: "",
            label: "闪卡减少一点优先级",
            click: () => {
                this.updatePriority(detail.protyle, -1);
            }
        });
    }

    private async updateDocPriorityLock(protyle: IProtyle, delta: number) {
        return navigator.locks.request("CardPriorityBox.updateDocPriorityLock", { ifAvailable: true }, async (lock) => {
            if (lock) {
                await pushPriorityMsg(delta)
                const count = await this.updateDocPriority(protyle, delta);
                siyuan.pushMsg(`已经调整了${count}个闪卡的优先级`);
            } else {
                siyuan.pushMsg("正在修改优先级，请耐心等候……");
            }
        });
    }

    private async updateDocPriority(protyle: IProtyle, delta: number) {
        const docID = protyle?.block?.rootID;
        if (!docID) return;
        const blocks = await siyuan.getTreeRiffCardsAll(docID);
        const tasks = await Promise.all(blocks.map(block => {
            const ial = block.ial as unknown as AttrType;
            if (delta == 0) {
                return setPriority(ial.id, 50);
            } else {
                let priority = Number(ial["custom-card-priority"]);
                if (!isValidNumber(priority)) {
                    priority = 50;
                }
                const newPriority = ensureValidPriority(priority + delta);
                if (newPriority != priority) {
                    return setPriority(ial.id, newPriority);
                }
            }
        }).filter(i => !!i));
        return tasks.length;
    }

    private async updatePriority(_protyle: IProtyle, _delta: number) {

    }

    async updateCards(options: ICardData) {
        if (!this.plugin) return;
        // console.log(options);
        return options;
    }

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
