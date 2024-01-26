import { IProtyle, Plugin } from "siyuan";
import "./index.scss";

class ListBox {
    private plugin: Plugin;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "cardPrioritySet",
            hotkey: "F6",
            editorCallback: async (protyle: IProtyle) => {
                const docID = protyle?.block?.rootID;
                await uncheckAll(docID);
            },
        });

        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.cardPrioritySet,
                accelerator: "F6",
                click: async () => {
                    const docID = detail?.protyle?.block?.rootID;
                    await uncheckAll(docID);
                },
            });
        });
    }

}
async function uncheckAll(docID: string) {
    throw new Error("Function not implemented.");
}
export const listBox = new ListBox();

