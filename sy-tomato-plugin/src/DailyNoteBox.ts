import { IProtyle, Lute, Plugin } from "siyuan";
import { events } from "./libs/Events";
import { NewLute, cleanDiv, siyuan } from "./libs/utils";
import { DATA_NODE_ID, PROTYLE_WYSIWYG_SELECT } from "./libs/gconst";

class DailyNoteBox {
    private plugin: Plugin;
    private lute: Lute;

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        const protyle: IProtyle = detail.protyle;
        detail.menu.addItem({
            iconHTML: "",
            label: this.plugin.i18n.moveBlock2today,
            click: () => {
                this.findDivs(protyle);
            }
        });
    }

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.lute = NewLute();
        this.plugin.addCommand({
            langKey: "moveBlock2today",
            hotkey: "⌘6",
            editorCallback: (protyle) => {
                this.findDivs(protyle);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.moveBlock2today,
                icon: "iconMove",
                accelerator: "",
                click: () => {
                    this.moveBlock2today(events.lastBlockID);
                },
            });
        });
    }

    async moveBlock2today(blockID: string) {
        if (!blockID) return;
        const { id: docID } = await siyuan.createDailyNote(events.boxID);
        const { dom } = await siyuan.getBlockDOM(blockID);
        const div = document.createElement("div");
        div.innerHTML = dom;
        cleanDiv(div.firstElementChild as HTMLDivElement, false);
        const md = this.lute.BlockDOM2Md(div.innerHTML);
        await siyuan.appendBlock(md, docID);
        await siyuan.safeUpdateBlock(blockID, "");
    }

    async findDivs(protyle: IProtyle) {
        const multiLine = protyle.element.getElementsByTagName("div") as unknown as HTMLDivElement[] ?? [];
        let flag = false;
        for (const div of multiLine) {
            if (div.classList.contains(PROTYLE_WYSIWYG_SELECT)) {
                div.classList.remove(PROTYLE_WYSIWYG_SELECT);
                const id = div.getAttribute(DATA_NODE_ID);
                await this.moveBlock2today(id);
                flag = true;
            }
        }
        if (!flag) {
            await this.moveBlock2today(events.lastBlockID);
        }
    }
}

export const dailyNoteBox = new DailyNoteBox();
