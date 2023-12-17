import { Plugin, Setting } from "siyuan";
import { ICONS } from "./icons";
import { prog } from "./Progressive";
import { events } from "../../sy-tomato-plugin/src/libs/Events";
import { flashBox } from "./FlashBox";

const STORAGE_SETTINGS = "ProgressiveLearning.json"

export default class ThePlugin extends Plugin {
    public settingCfg: SettingCfgType;

    async onload() {
        this.addIcons(ICONS);
        events.onload(this);
        
        this.setting = new Setting({
            confirmCallback: () => {
                this.saveData(STORAGE_SETTINGS, this.settingCfg);
                window.location.reload();
            }
        });
        
        this.settingCfg = await this.loadData(STORAGE_SETTINGS);
        if (!this.settingCfg) this.settingCfg = {};
        await prog.onload(this, this.settingCfg);
        await flashBox.onload(this, this.settingCfg);

        this.addSettingItem("cardBoxCheckbox", "* 闪卡工具", false);
    }

    private addSettingItem(key: string, title: string, defaultValue: boolean) {
        this.setting.addItem({
            title: title,
            createActionElement: () => {
                const checkbox = document.createElement("input") as HTMLInputElement;
                checkbox.type = "checkbox";
                checkbox.addEventListener("change", () => {
                    this.settingCfg[key] = checkbox.checked;
                });
                checkbox.className = "b3-switch fn__flex-center";
                checkbox.checked = this.settingCfg[key] ?? defaultValue;
                return checkbox;
            },
        });
    }

    onunload() {
        console.log("unload progressive learning plugin");
    }
}