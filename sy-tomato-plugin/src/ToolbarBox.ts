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
                title: this.plugin.i18n.spaceRepeat + "Alt+0",
                position: "left",
                callback: () => {
                    openTab({ app: this.plugin.app, card: { type: "all" } });
                }
            });
        }
        this.plugin.addCommand({
            langKey: "spaceRepeat",
            hotkey: "⌥0",
            callback: () => {
                openTab({ app: this.plugin.app, card: { type: "all" } });
            }
        });

        this.plugin.addTopBar({
            icon: "iconRef",
            title: this.plugin.i18n.refreshVirRef + "F5",
            position: "left",
            callback: refreshVirRef,
        });
        this.plugin.addCommand({
            langKey: "refreshVirRef",
            hotkey: "F5",
            callback: refreshVirRef,
        });

        this.plugin.addTopBar({
            icon: "iconFocus",
            title: this.plugin.i18n.locateDoc + "Alt+1",
            position: "left",
            callback: () => { locateDoc(); },
        });
        this.plugin.addCommand({
            langKey: "locateDoc",
            hotkey: "⌥1",
            callback: () => { locateDoc(true); },
        });
    }
}

function gotoFile() {
    const collapseBtn = document.querySelector('[data-type="collapse"][aria-label*="折叠"]') as HTMLButtonElement;
    collapseBtn?.click();
    const focusBtn = document.querySelector('[data-type="focus"][aria-label*="定位打开的文档"]') as HTMLButtonElement;
    focusBtn?.click();
}

function locateDoc(close = false) {
    const docTreeBtn = document.querySelector('[data-title="文档树"][aria-label*="文档树"]') as HTMLButtonElement;
    if (docTreeBtn) {
        const opened = docTreeBtn.classList.contains("dock__item--active");
        if (!opened) {
            docTreeBtn.click();
            gotoFile();
        } else {
            if (close) {
                docTreeBtn.click();
            } else {
                gotoFile();
            }
        }
    }
}

async function refreshVirRef() {
    await siyuan.refreshVirtualBlockRef();
    events.protyleReload();
    await siyuan.pushMsg("已经刷新虚拟引用", 2000);
}

export const toolbarBox = new ToolbarBox();
