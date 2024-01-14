import { Plugin, Setting } from "siyuan";
import { ICONS } from "./icons";
import { prog } from "./Progressive";
import { EventType, events } from "../../sy-tomato-plugin/src/libs/Events";
import { flashBox } from "./FlashBox";
import { pieceMovingBox } from "./PieceMovingBox";

const STORAGE_SETTINGS = "ProgressiveLearning.json";

export default class ThePlugin extends Plugin {
    public settingCfg: SettingCfgType;
    private blockIconEventBindThis = this.blockIconEvent.bind(this);

    private blockIconEvent({ detail }: any) {
        flashBox.blockIconEvent(detail);
        pieceMovingBox.blockIconEvent(detail);
    }

    async onload() {
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

        if (!this.settingCfg) {
            this.settingCfg = {
                addCodeBlock: false,
                addQuoteBlock: true,
                showLastBlock: false,
                openCardsOnOpenPiece: false,
                cardIndent: false,
            } as any;
        }

        if (this.settingCfg.btnViewContents == undefined) this.settingCfg.btnViewContents = true;
        if (this.settingCfg.btnSplitByPunctuationsListCheck == undefined) this.settingCfg.btnSplitByPunctuationsListCheck = true;
        if (this.settingCfg.btnFullfilContent == undefined) this.settingCfg.btnFullfilContent = true;
        if (this.settingCfg.btnCleanUnchanged == undefined) this.settingCfg.btnCleanUnchanged = true;
        if (this.settingCfg.btnPrevious == undefined) this.settingCfg.btnPrevious = true;
        if (this.settingCfg.btnNext == undefined) this.settingCfg.btnNext = true;
        if (this.settingCfg.btnDeleteBack == undefined) this.settingCfg.btnDeleteBack = true;
        if (this.settingCfg.btnDeleteNext == undefined) this.settingCfg.btnDeleteNext = true;
        if (this.settingCfg.btnSaveCard == undefined) this.settingCfg.btnSaveCard = true;
        if (this.settingCfg.btnDelCard == undefined) this.settingCfg.btnDelCard = true;
        if (this.settingCfg.btnStop == undefined) this.settingCfg.btnStop = true;
        if (this.settingCfg.btnNextBook == undefined) this.settingCfg.btnNextBook = true;
        if (this.settingCfg.btnIgnoreBook == undefined) this.settingCfg.btnIgnoreBook = true;
        if (this.settingCfg.btnOpenFlashcardTab == undefined) this.settingCfg.btnOpenFlashcardTab = true;
        if (this.settingCfg.btnSplitByPunctuations == undefined) this.settingCfg.btnSplitByPunctuations = true;
        if (this.settingCfg.btnSplitByPunctuationsList == undefined) this.settingCfg.btnSplitByPunctuationsList = true;
        if (this.settingCfg.btnDeleteExit == undefined) this.settingCfg.btnDeleteExit = true;

        await prog.onload(this, this.settingCfg);
        await flashBox.onload(this, this.settingCfg);
        await pieceMovingBox.onload(this, this.settingCfg);

        this.addSettingItem("addCodeBlock", "* 制卡时加入代码块", false, "与引述块二选一");
        this.addSettingItem("addQuoteBlock", "* 制卡时加入引述块", true, "与代码块二选一");
        this.addSettingItem("showLastBlock", "* 显示上一分片最后一个块", false, "当前分片显示上一分片最后一个块内容");
        this.addSettingItem("openCardsOnOpenPiece", "* 打开分片的同时打开cards文档", false, "-cards后缀文件: 每本书用于保存闪卡的文件");
        this.addSettingItem("cardIndent", "* 制作的闪卡，从第二项开始向右缩进", false, "");

        this.addSettingItem("btnViewContents", "* 打开目录", true, "按钮");
        this.addSettingItem("btnSplitByPunctuationsListCheck", "通过标点符号拆分分片为任务列表", true, "按钮");
        this.addSettingItem("btnFullfilContent", "填充原文", true, "按钮");
        this.addSettingItem("btnCleanUnchanged", "清除未更改的内容", true, "按钮");
        this.addSettingItem("btnPrevious", "上一个分片", true, "按钮");
        this.addSettingItem("btnNext", "下一个分片", true, "按钮");
        this.addSettingItem("btnDeleteBack", "删除，去上一个分片", true, "按钮");
        this.addSettingItem("btnDeleteNext", "删除，去下一个分片", true, "按钮");
        this.addSettingItem("btnSaveCard", "制作文档闪卡", true, "按钮");
        this.addSettingItem("btnDelCard", "取消文档闪卡", true, "按钮");
        this.addSettingItem("btnStop", "停止", true, "按钮");
        this.addSettingItem("btnNextBook", "换下一本书", true, "按钮");
        this.addSettingItem("btnIgnoreBook", "忽略这本书", true, "按钮");
        this.addSettingItem("btnOpenFlashcardTab", "打开本书的闪卡", true, "按钮");
        this.addSettingItem("btnSplitByPunctuations", "通过标点符号拆分分片", true, "按钮");
        this.addSettingItem("btnSplitByPunctuationsList", "通过标点符号拆分分片为列表", true, "按钮");
        this.addSettingItem("btnDeleteExit", "删除并退出", true, "按钮");
    }

    private addSettingItem(key: string, title: string, defaultValue: boolean, description?: string) {
        this.setting.addItem({
            title: title,
            description,
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