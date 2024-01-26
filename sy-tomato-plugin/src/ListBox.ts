import { IProtyle, Plugin } from "siyuan";
import "./index.scss";
import { siyuan } from "./libs/utils";

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
    const kramdowns = await Promise.all((await siyuan.sql(`select id from blocks 
        where type='i' and subType='t' and root_id="${docID}"
        and markdown like "* [X] %"
        limit 30000
    `)).map(b => siyuan.getBlockKramdown(b.id)));

    await Promise.all(kramdowns.map(({ id, kramdown }) => {
        const newKramdown = kramdown.replace("}[X] ", "}[ ] ");
        return siyuan.updateBlock(id, newKramdown);
    }));

    await siyuan.pushMsg(`取消了${kramdowns.length}个任务`);
}

export const listBox = new ListBox();

