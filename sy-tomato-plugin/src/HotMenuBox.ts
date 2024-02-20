import { Dialog, IEventBusMap, IProtyle, Plugin } from "siyuan";
import { newID } from "./libs/utils";
import HotMenu from "./HotMenu.svelte";
import { ChatContext } from "./libs/baiduAI";

class HotMenuBox {
    public plugin: Plugin;
    public settingCfg: TomatoSettings;
    public ctx4k: ChatContext;
    public ctx8k: ChatContext;

    async onload(plugin: Plugin) {
        this.ctx4k = new ChatContext(4000);
        this.ctx8k = new ChatContext(8000);
        this.plugin = plugin;
        this.settingCfg = (plugin as any).settingCfg;
        this.plugin.addCommand({
            langKey: "hotMenu",
            hotkey: "⌥A",
            editorCallback: async (protyle: IProtyle) => {
                this.openDialog(protyle);
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
