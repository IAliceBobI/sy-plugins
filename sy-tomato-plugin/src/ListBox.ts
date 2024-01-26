import { IProtyle, Plugin } from "siyuan";
import "./index.scss";

class ListBox {
    private plugin: Plugin;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "uncheckAll",
            hotkey: "",
            editorCallback: async (protyle: IProtyle) => {
                const docID = protyle?.block?.rootID;
                await uncheckAll(docID);
            },
        });

        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.uncheckAll,
                accelerator: "",
                click: async () => {
                    const docID = detail?.protyle?.block?.rootID;
                    await uncheckAll(docID);
                },
            });
        });
    }

}

async function uncheckAll(docID: string) {
    // elect * from blocks where root_id='20240126095806-l5m1c8h' and markdown like "* [X] %"
}

export const listBox = new ListBox();

