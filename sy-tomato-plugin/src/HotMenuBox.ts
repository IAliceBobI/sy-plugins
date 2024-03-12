import { Dialog, IEventBusMap, IProtyle, Plugin } from "siyuan";
import { getCursorElement, newID } from "./libs/utils";
import HotMenu from "./HotMenu.svelte";
import { ChatContext } from "./libs/baiduAI";
import { addFlashCard } from "./libs/listUtils";
import { removeDocCards } from "./libs/cardUtils";
import { STORAGE_SETTINGS } from "./constants";

class HotMenuBox {
    public plugin: Plugin;
    public settingCfg: TomatoSettings;
    public ctx4k: ChatContext;
    public ctx8k: ChatContext;

    async saveCfg() {
        await this.plugin.saveData(STORAGE_SETTINGS, this.settingCfg);
        window.location.reload();
    }

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.settingCfg = (plugin as any).settingCfg;
        this.ctx4k = new ChatContext(4000);
        this.ctx8k = new ChatContext(8000);
        this.plugin.addCommand({
            langKey: "hotMenu",
            hotkey: "⌥A",
            editorCallback: async (protyle: IProtyle) => {
                this.openDialog(protyle);
            },
        });
        this.plugin.addCommand({
            langKey: "addFlashCard",
            hotkey: "⌘1",
            editorCallback: async () => {
                await addFlashCard(getCursorElement() as any);
            },
        });
        this.plugin.addCommand({
            langKey: "removeDocCards",
            hotkey: "",
            editorCallback: async (protyle: IProtyle) => {
                await removeDocCards(protyle.block.rootID);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.hotMenu,
                icon: "iconMenu",
                accelerator: "⌥A",
                click: async () => {
                    this.openDialog(detail.protyle);
                },
            });
        });
    }

    blockIconEvent(detail: IEventBusMap["click-blockicon"]) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "📃",
            label: this.plugin.i18n.hotMenu,
            click: () => {
                this.openDialog(detail.protyle);
            }
        });
    }

    private openDialog(protyle: IProtyle) {
        const id = newID();
        const dialog = new Dialog({
            title: this.plugin.i18n.hotMenu,
            content: `<div id='${id}'></div>`,
        });
        new HotMenu({
            target: dialog.element.querySelector("#" + id),
            props: {
                dialog,
                protyle,
            }
        });
    }
}

export const hotMenuBox = new HotMenuBox();
