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
        this.plugin.addTopBar({
            icon: "iconFocus",
            title: this.plugin.i18n.locateDoc,
            position: "left",
            callback: locateDoc,
        });

        this.plugin.addCommand({
            langKey: "refreshVirRef",
            hotkey: "",
            callback: refreshVirRef,
        });
        this.plugin.addCommand({
            langKey: "locateDoc",
            hotkey: "⌥1",
            callback: locateDoc,
        });
    }
}

async function locateDoc() {
    const docTreeBtn = document.querySelector('[data-title="文档树"][aria-label*="文档树"]') as HTMLButtonElement;
    if (docTreeBtn) {
        if (!docTreeBtn.classList.contains("dock__item--active")) {
            docTreeBtn.click();
        }
    }
    const collapseBtn = document.querySelector('[data-type="collapse"][aria-label*="折叠"]') as HTMLButtonElement;
    if (collapseBtn) {
        collapseBtn.click();
    }
    const focusBtn = document.querySelector('[data-type="focus"][aria-label*="定位打开的文档"]') as HTMLButtonElement;
    if (focusBtn) {
        focusBtn.click();
    }
}

async function refreshVirRef() {
    await siyuan.refreshVirtualBlockRef();
    events.protyleReload();
    await siyuan.pushMsg("已经刷新虚拟引用", 2000);
}

export const toolbarBox = new ToolbarBox();
