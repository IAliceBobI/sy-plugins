import { IProtyle, Plugin } from "siyuan";
import { EventType, events } from "./libs/Events";

class Tag2RefBox {
    public plugin: Plugin;
    public settingCfg: TomatoSettings;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.settingCfg = (plugin as any).settingCfg;
        events.addListener("BackLinkBottomBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static) {
                navigator.locks.request("BackLinkBottomBoxLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        const protyle = detail.protyle as IProtyle;
                        if (!protyle || !protyle.element) return;
                        if (protyle.element.classList.contains("card__block")) return;
                        const item = protyle.wysiwyg?.element;
                        if (!item) return;
                        const nextDocID = protyle.block.rootID ?? "";
                        if (!nextDocID) return;

                    }
                });
            }
        });
    }
}


export const tag2RefBox = new Tag2RefBox();
