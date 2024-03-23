import { Dialog, IEventBusMap, IProtyle, Plugin } from "siyuan";
import { newID } from "../../sy-tomato-plugin/src/libs/utils";
import DigestProgressive from "./DigestProgressive.svelte";

class DigestProgressiveBox {
    plugin: Plugin;
    settings: SettingCfgType;

    blockIconEvent(detail: IEventBusMap["click-blockicon"]) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "➕🍕",
            label: this.plugin.i18n.digestProgressive,
            accelerator: "⌥Z",
            click: () => {
                this.openDialog(detail.protyle);
            }
        });
    }

    async onload(plugin: Plugin, settings: SettingCfgType) {
        this.plugin = plugin;
        this.settings = settings;
        this.plugin.addCommand({
            langKey: "digestProgressive",
            hotkey: "⌥Z",
            editorCallback: async (protyle: IProtyle) => {
                this.openDialog(protyle);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.digestProgressive,
                iconHTML: "➕🍕",
                accelerator: "⌥Z",
                click: async () => {
                    this.openDialog(detail.protyle);
                },
            });
        });
    }

    private openDialog(protyle: IProtyle) {
        const id = newID();
        const dialog = new Dialog({
            title: this.plugin.i18n.digestProgressive,
            content: `<div id='${id}'></div>`,
        });
        new DigestProgressive({
            target: dialog.element.querySelector("#" + id),
            props: {
                dialog,
                protyle,
            }
        });
    }
}

export const digestProgressiveBox = new DigestProgressiveBox();

