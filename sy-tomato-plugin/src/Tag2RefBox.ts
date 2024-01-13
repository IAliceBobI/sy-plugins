import { IProtyle, Plugin } from "siyuan";
import { EventType, events } from "./libs/Events";

class Tag2RefBox {
    public plugin: Plugin;
    public settingCfg: TomatoSettings;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.settingCfg = (plugin as any).settingCfg;
        events.addListener("Tomato-Tag2RefBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static) {
                navigator.locks.request("Tomato-Tag2RefBox-Lock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        const protyle = detail.protyle as IProtyle;
                        const nextDocID = protyle.block.rootID ?? "";
                        if (!nextDocID) return;
                        console.log("xxx")
                    }
                });
            }
        });
    }
}


export const tag2RefBox = new Tag2RefBox();
