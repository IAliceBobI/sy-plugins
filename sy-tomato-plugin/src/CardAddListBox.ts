import { Plugin } from "siyuan";
import { getCursorElement, siyuan } from "@/libs/utils";
import "./index.scss";
import { BlockNodeEnum, CUSTOM_RIFF_DECKS, DATA_NODE_ID, DATA_NODE_INDEX, DATA_TYPE } from "./libs/gconst";

class CardAddListBox {
    private plugin: Plugin;
    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "addFlashCard",
            hotkey: "⌘1",
            callback: async () => {
                await this.addFlashCard(getCursorElement() as any);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.addFlashCard,
                icon: "iconFlashcard",
                click: () => {
                    this.addFlashCard(detail.element);
                },
            });
        });
    }

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "📌🗃️",
            label: this.plugin.i18n.addFlashCard,
            click: () => {
                for (const element of detail.blockElements) {
                    this.addFlashCard(element);
                    break;
                }
            }
        });
    }

    private async addFlashCard(element: HTMLElement) {
        if (!element) return;
        const { id, isCard } = findListTypeByElement(element);
        if (!isCard) {
            await siyuan.addRiffCards([id]);
        } else {
            await siyuan.removeRiffCards([id]);
        }
    }
}

export const cardAddListBox = new CardAddListBox();

function findListTypeByElement(e: HTMLElement) {
    let id: string;
    let isCard: boolean;
    for (let i = 0; i < 1000 && e; i++, e = e.parentElement) {
        const tmpID = e.getAttribute(DATA_NODE_ID);
        const dataType = e.getAttribute(DATA_TYPE);
        if (tmpID && e.hasAttribute(DATA_NODE_INDEX) && dataType == BlockNodeEnum.NODE_LIST) {
            id = tmpID;
            isCard = e.hasAttribute(CUSTOM_RIFF_DECKS);
        }
    }
    return { id, isCard };
}
