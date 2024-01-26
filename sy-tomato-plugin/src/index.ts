import { ICardData, Plugin, Setting } from "siyuan";
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
import { imgOverlayBox } from "./ImgOverlayBox";
import { dailyNoteBox } from "./DailyNoteBox";
import { cmdBlockBox } from "./CmdBlockBox";
import { cardPriorityBox } from "./CardPriorityBox";
import { tag2RefBox } from "./Tag2RefBox";
import { toolbarBox } from "./ToolbarBox";
import { listBox } from "./ListBox";

export default class ThePlugin extends Plugin {
    private static readonly GLOBAL_THIS: Record<string, any> = globalThis;

    private settingCfg: TomatoSettings;
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
        if (!this.settingCfg) this.settingCfg = {} as TomatoSettings;

        this.addSettingItem("tomatoClockCheckbox", "* 状态栏番茄钟", true);
        if (this.settingCfg.tomatoClockCheckbox ?? true) await tomatoClock.onload(this);

        this.addSettingItem("scheduleCheckbox", "* 内容提醒", true);
        if (this.settingCfg.scheduleCheckbox ?? true) await schedule.onload(this);

        this.addSettingItem("readingPointBoxCheckbox", "* 阅读点", true);
        if (this.settingCfg.readingPointBoxCheckbox ?? true) await readingPointBox.onload(this);

        this.addSettingItem("cardBoxCheckbox", "* 闪卡工具", false);
        if (this.settingCfg.cardBoxCheckbox ?? false) await cardBox.onload(this);

        this.addSettingItem("cardPriorityBoxCheckbox", "* 闪卡优先级", false);
        if (this.settingCfg.cardPriorityBoxCheckbox ?? false) await cardPriorityBox.onload(this);

        this.addSettingItem("cpBoxCheckbox", "* 长内容工具", false);
        if (this.settingCfg.cpBoxCheckbox ?? false) await cpBox.onload(this);

        this.addSettingItem("linkBoxCheckbox", "* 双向互链", false);
        if (this.settingCfg.linkBoxCheckbox ?? false) await linkBox.onload(this);

        this.addSettingItem("toolbarBoxCheckbox", "* 开启toolbar按钮", true, "打开闪卡、刷新虚拟引用");
        if (this.settingCfg.toolbarBoxCheckbox ?? true) await toolbarBox.onload(this);

        this.addSettingItem("dailyNoteBoxCheckbox", "* 移动内容到 daily note", false);
        if (this.settingCfg.dailyNoteBoxCheckbox ?? false) await dailyNoteBox.onload(this);

        this.addSettingItem("imgOverlayCheckbox", "* 图片遮挡", false);
        if (this.settingCfg.imgOverlayCheckbox ?? false) await imgOverlayBox.onload(this);

        this.addSettingItem("backLinkBottomBoxCheckbox", "* 底部反链", false);
        if (this.settingCfg.backLinkBottomBoxCheckbox ?? false) await backLinkBottomBox.onload(this);

        this.addSettingItem("tag2RefBoxCheckbox", "* 自动将标签转为引用（引用也继承标签的层级关系）", false, "请勿匆忙开启！开启会将当前编辑区内的标签转为引用！");
        if (this.settingCfg.tag2RefBoxCheckbox ?? false) await tag2RefBox.onload(this);

        this.addSettingItem("cmdBlockBoxCheckbox", "* 命令块", false);
        if (this.settingCfg.cmdBlockBoxCheckbox ?? false) await cmdBlockBox.onload(this);

        this.addSettingItem("listBoxCheckbox", "* 列表工具", true, "取消文档中所有todo任务的勾选");
        if (this.settingCfg.listBoxCheckbox ?? true) await listBox.onload(this);
    }

    private addSettingItem(key: string, title: string, defaultValue: boolean, description = "") {
        const checkbox = document.createElement("input") as HTMLInputElement;
        this.setting.addItem({
            title: title,
            description,
            createActionElement: () => {
                checkbox.type = "checkbox";
                checkbox.addEventListener("change", () => {
                    this.settingCfg[key] = checkbox.checked;
                });
                checkbox.className = "b3-switch fn__flex-center";
                checkbox.checked = this.settingCfg[key] ?? defaultValue;
                return checkbox;
            },
        });
        return checkbox;
    }

    private blockIconEvent({ detail }: any) {
        readingPointBox.blockIconEvent(detail);
        schedule.blockIconEvent(detail);
        linkBox.blockIconEvent(detail);
        cardBox.blockIconEvent(detail);
        cardPriorityBox.blockIconEvent(detail);
        imgOverlayBox.blockIconEvent(detail);
        dailyNoteBox.blockIconEvent(detail);
        cmdBlockBox.blockIconEvent(detail);
    }

    async updateCards(options: ICardData) {
        return cardPriorityBox.updateCards(options);
    }
}