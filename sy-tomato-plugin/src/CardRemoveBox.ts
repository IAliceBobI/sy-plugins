import { Plugin } from "siyuan";
import { events } from "./libs/Events";
import { siyuan } from "./libs/utils";
import { CUSTOM_RIFF_DECKS } from "./libs/gconst";

class CardRemoveBox {
    private plugin: Plugin;
    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "removeDocCards",
            hotkey: "",
            callback: async () => {
                await this.removeDocCards(events.docID);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.removeDocCards,
                icon: "iconFlashcard",
                click: () => {
                    const docID = detail.protyle.block.rootID;
                    this.removeDocCards(docID);
                },
            });
        });
    }

    private async removeDocCards(docID: string) {
        if (!docID) return;
        const ids = (await siyuan.sql(`select block_id as id from attributes 
            where name="${CUSTOM_RIFF_DECKS}"
            and root_id="${docID}"
            limit 30000
        `)).map(row => row.id);
        await siyuan.removeRiffCards(ids);
    }
}

export const cardRemoveBox = new CardRemoveBox();

