import { Plugin, openTab } from "siyuan";
import { events } from "./libs/Events";
import { siyuan } from "./libs/utils";

class ToolbarBox {
    public plugin: Plugin;
    public settingCfg: TomatoSettings;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.settingCfg = (plugin as any).settingCfg;
        if (!events.isMobile) {
            this.plugin.addTopBar({
                icon: "iconRiffCard",
                title: "间隔重复",
                position: "left",
                callback: () => {
                    openTab({ app: this.plugin.app, card: { type: "all" } });
                }
            });
        }

        this.plugin.addTopBar({
            icon: "iconRef",
            title: this.plugin.i18n.refreshVirRef,
            position: "left",
            callback: refreshVirRef,
        });
        this.plugin.addCommand({
            langKey: "refreshVirRef",
            hotkey: "",
            callback: refreshVirRef,
        });
    }
}

async function refreshVirRef() {
    await siyuan.refreshVirtualBlockRef();
    events.protyleReload();
    await siyuan.pushMsg("已经刷新虚拟引用", 2000);
}

export const toolbarBox = new ToolbarBox();
