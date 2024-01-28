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
            title: "刷新虚拟引用",
            position: "left",
            callback: async () => {
                await siyuan.refreshVirtualBlockRef();
                events.protyleReload();
                await siyuan.pushMsg("已经刷新虚拟引用");
            }
        });
    }
}

export const toolbarBox = new ToolbarBox();
