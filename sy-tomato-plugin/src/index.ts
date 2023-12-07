import { Plugin, Setting } from "siyuan";
import { ICONS } from "./icons";
import { tomatoClock } from "./TomatoClock";
import { linkBox } from "./LinkBox";
import { schedule } from "./Schedule";
import { readingPointBox } from "./ReadingPointBox";
import { cpBox } from "./CpBox";
import { backLinkBottomBox } from "./BackLinkBottomBox";
import { cardBox } from "./CardBox";
import { EventType, events } from "@/libs/Events";
import { STORAGE_SETTINGS } from "./constants";
import { siyuan } from "@/libs/utils";

export default class ThePlugin extends Plugin {
    private static readonly GLOBAL_THIS: Record<string, any> = globalThis;

    private settingCfg: { [key: string]: boolean };
    private blockIconEventBindThis = this.blockIconEvent.bind(this);

    async onload() {
        ThePlugin.GLOBAL_THIS["siyuan_zZmqus5PtYRi"] = siyuan;
        this.addIcons(ICONS);
        events.onload(this);
        this.eventBus.on(EventType.click_blockicon, this.blockIconEventBindThis);

        this.setting = new Setting({
            confirmCallback: () => {
                this.saveData(STORAGE_SETTINGS, this.settingCfg);
                window.location.reload();
            }
        });

        this.settingCfg = await this.loadData(STORAGE_SETTINGS);
        if (!this.settingCfg) this.settingCfg = {};

        if (this.settingCfg.tomatoClockCheckbox ?? true) await tomatoClock.onload(this);
        if (this.settingCfg.scheduleCheckbox ?? true) await schedule.onload(this);
        if (this.settingCfg.readingPointBoxCheckbox ?? true) await readingPointBox.onload(this);
        if (this.settingCfg.cardBoxCheckbox ?? false) await cardBox.onload(this);
        if (this.settingCfg.cpBoxCheckbox ?? false) await cpBox.onload(this);
        if (this.settingCfg.linkBoxCheckbox ?? false) await linkBox.onload(this);
        if (this.settingCfg.backLinkBottomBoxCheckbox ?? true) await backLinkBottomBox.onload(this);

        this.addSettingItem("tomatoClockCheckbox", "状态栏番茄钟", true);
        this.addSettingItem("scheduleCheckbox", "内容提醒", true);
        this.addSettingItem("readingPointBoxCheckbox", "阅读点", true);
        this.addSettingItem("cardBoxCheckbox", "闪卡工具", false);
        this.addSettingItem("cpBoxCheckbox", "长内容工具", false);
        this.addSettingItem("linkBoxCheckbox", "双向互链", false);
        this.addSettingItem("backLinkBottomBoxCheckbox", "底部反链", true);
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

    private blockIconEvent({ detail }: any) {
        readingPointBox.blockIconEvent(detail);
        schedule.blockIconEvent(detail);
        backLinkBottomBox.blockIconEvent(detail);
        linkBox.blockIconEvent(detail);
        cardBox.blockIconEvent(detail);
    }
}