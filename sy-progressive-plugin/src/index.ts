import { Plugin, Setting } from "siyuan";
import { ICONS } from "./icons";
import { prog } from "./Progressive";
import { EventType, events } from "../../sy-tomato-plugin/src/libs/Events";
import { flashBox } from "./FlashBox";
import { pieceMovingBox } from "./PieceMovingBox";
import { pieceSummaryBox } from "./PieceSummaryBox";
import { writingCompareBox } from "./WritingCompareBox";
import { digestProgressiveBox } from "./DigestProgressiveBox";

const STORAGE_SETTINGS = "ProgressiveLearning.json";

export default class ThePlugin extends Plugin {
    public settingCfg: SettingCfgType;
    private blockIconEventBindThis = this.blockIconEvent.bind(this);

    private blockIconEvent({ detail }: any) {
        flashBox.blockIconEvent(detail);
        pieceMovingBox.blockIconEvent(detail);
        pieceSummaryBox.blockIconEvent(detail);
        digestProgressiveBox.blockIconEvent(detail);
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

        if (!this.settingCfg) this.settingCfg = {} as SettingCfgType;

        if (this.settingCfg.hideBtnsInFlashCard == undefined) this.settingCfg.hideBtnsInFlashCard = false;
        if (this.settingCfg.openCardsOnOpenPiece == undefined) this.settingCfg.openCardsOnOpenPiece = false;
        if (this.settingCfg.cardUnderPiece == undefined) this.settingCfg.cardUnderPiece = false;

        if (this.settingCfg.btnViewContents == undefined) this.settingCfg.btnViewContents = true;
        if (this.settingCfg.btnPrevious == undefined) this.settingCfg.btnPrevious = true;
        if (this.settingCfg.btnNext == undefined) this.settingCfg.btnNext = true;
        if (this.settingCfg.btnCleanOriginText == undefined) this.settingCfg.btnCleanOriginText = true;
        if (this.settingCfg.btnFullfilContent == undefined) this.settingCfg.btnFullfilContent = true;
        if (this.settingCfg.btnStop == undefined) this.settingCfg.btnStop = true;
        if (this.settingCfg.btnNextBook == undefined) this.settingCfg.btnNextBook = true;
        if (this.settingCfg.btnOpenFlashcardTab == undefined) this.settingCfg.btnOpenFlashcardTab = true;
        if (this.settingCfg.btnDeleteBack == undefined) this.settingCfg.btnDeleteBack = true;
        if (this.settingCfg.btnDeleteNext == undefined) this.settingCfg.btnDeleteNext = true;
        if (this.settingCfg.btnSaveCard == undefined) this.settingCfg.btnSaveCard = true;
        if (this.settingCfg.btnDelCard == undefined) this.settingCfg.btnDelCard = true;
        if (this.settingCfg.btnDeleteExit == undefined) this.settingCfg.btnDeleteExit = true;
        if (this.settingCfg.btnIgnoreBook == undefined) this.settingCfg.btnIgnoreBook = true;
        if (this.settingCfg.btnSplitByPunctuations == undefined) this.settingCfg.btnSplitByPunctuations = true;
        if (this.settingCfg.btnSplitByPunctuationsListCheck == undefined) this.settingCfg.btnSplitByPunctuationsListCheck = true;
        if (this.settingCfg.btnSplitByPunctuationsList == undefined) this.settingCfg.btnSplitByPunctuationsList = true;

        await prog.onload(this, this.settingCfg);
        await flashBox.onload(this, this.settingCfg);
        await pieceMovingBox.onload(this, this.settingCfg);
        await pieceSummaryBox.onload(this, this.settingCfg);
        await writingCompareBox.onload(this, this.settingCfg);
        await digestProgressiveBox.onload(this, this.settingCfg);

        this.addSettingItem("hideBtnsInFlashCard", "* 在闪卡内复习整个分片时，隐藏分片下方按钮", false, "");
        this.addSettingItem("openCardsOnOpenPiece", "* 打开分片的同时打开cards文档", false, "'cards-'前缀文件: 每本书用于保存闪卡的文件");
        this.addSettingItem("cardUnderPiece", "* 分片内制卡，放于分片的子文档内", false, "");

        this.addSettingItem("btnViewContents", "* 打开目录", true, "🗂");
        this.addSettingItem("btnPrevious", "* 上一个分片", true, "⬅");
        this.addSettingItem("btnNext", "* 下一个分片", true, "➡");
        this.addSettingItem("btnCleanOriginText", "* 删除原文", true, "🧹🧹");
        this.addSettingItem("btnFullfilContent", "* 重新插入分片内容", true, "⬇");
        this.addSettingItem("btnStop", "* 关闭分片", true, "🏃");
        this.addSettingItem("btnNextBook", "* 换一本书看", true, "📚📖");
        this.addSettingItem("btnOpenFlashcardTab", "* 打开本书的闪卡", true, "⚡");
        this.addSettingItem("btnDeleteBack", "* 删除分片，看上一个分片", true, "⬅ 🗑");
        this.addSettingItem("btnDeleteNext", "* 删除分片，看下一个分片", true, "🗑 ➡");
        this.addSettingItem("btnSaveCard", "* 文档制卡", true, "➕🗃");
        this.addSettingItem("btnDelCard", "* 取消文档制卡", true, "➖🗃");
        this.addSettingItem("btnDeleteExit", "* 删除分片并退出", true, "🏃 🗑");
        this.addSettingItem("btnIgnoreBook", "* 不再推送本书", true, "🚫");
        this.addSettingItem("btnSplitByPunctuations", "* 按标点断句", true, "✂📜");
        this.addSettingItem("btnSplitByPunctuationsListCheck", "* 按标点断句，形成任务列表(可以ctrl+enter勾选任务)", true, "✂📜✅");
        this.addSettingItem("btnSplitByPunctuationsList", "* 按标点断句，形成列表", true, "✂📜📌");
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