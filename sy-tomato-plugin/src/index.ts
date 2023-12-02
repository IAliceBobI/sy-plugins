import { Plugin, Setting } from "siyuan";
import { ICONS } from "./icons";
import { tomatoClock } from "./TomatoClock";
import { linkBox } from "./LinkBox";
import { schedule } from "./Schedule";
import { readingPointBox } from "./ReadingPointBox";
import { cpBox } from "./CpBox";
import { backLinkBox } from "./BackLinkBox";
import { backLinkBottomBox } from "./BackLinkBottomBox";
import { cardBox } from "./CardBox";
import { events } from "@/libs/Events";
import { STORAGE_SETTINGS } from "./constants";

export default class ThePlugin extends Plugin {
    private settingCfg: { [key: string]: boolean };
    async onload() {
        this.addIcons(ICONS);
        events.onload(this);
        this.settingCfg = await this.loadData(STORAGE_SETTINGS);
        if (!this.settingCfg) this.settingCfg = {};
        if (this.settingCfg.tomatoClockCheckbox ?? true) tomatoClock.onload(this);
        if (this.settingCfg.scheduleCheckbox ?? true) schedule.onload(this);
        if (this.settingCfg.readingPointBoxCheckbox ?? true) readingPointBox.onload(this);
        if (this.settingCfg.cardBoxCheckbox ?? false) cardBox.onload(this);
        if (this.settingCfg.cpBoxCheckbox ?? false) cpBox.onload(this);
        if (this.settingCfg.linkBoxCheckbox ?? false) linkBox.onload(this);
        if (this.settingCfg.backLinkBoxCheckbox ?? false) backLinkBox.onload(this);
        if (this.settingCfg.backLinkBottomBoxCheckbox ?? true) backLinkBottomBox.onload(this);

        this.setting = new Setting({
            confirmCallback: () => {
                this.saveData(STORAGE_SETTINGS, this.settingCfg);
                window.location.reload();
            }
        });

        this.addSettingItem("tomatoClockCheckbox", "状态栏番茄钟", true);
        this.addSettingItem("scheduleCheckbox", "内容提醒", true);
        this.addSettingItem("readingPointBoxCheckbox", "阅读点", true);
        this.addSettingItem("cardBoxCheckbox", "闪卡工具", false);
        this.addSettingItem("cpBoxCheckbox", "长内容工具", false);
        this.addSettingItem("linkBoxCheckbox", "双向互链", false);
        this.addSettingItem("backLinkBoxCheckbox", "极简反链", false);
        this.addSettingItem("backLinkBottomBoxCheckbox", "底部反链", true);
    }

    private addSettingItem(key: string, title: string, defaultValue: boolean) {
        const checkbox = document.createElement("input") as HTMLInputElement;
        checkbox.type = "checkbox";
        checkbox.addEventListener("change", () => {
            this.settingCfg[key] = checkbox.checked;
        });
        this.setting.addItem({
            title: title,
            createActionElement: () => {
                checkbox.className = "b3-switch fn__flex-center";
                checkbox.checked = this.settingCfg[key] ?? defaultValue;
                return checkbox;
            },
        });
    }
}