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
            };
        }
        await prog.onload(this, this.settingCfg);
        await flashBox.onload(this, this.settingCfg);
        await pieceMovingBox.onload(this, this.settingCfg);

        this.addSettingItem("addCodeBlock", "* 制卡时加入代码块", false, "与引述块二选一");
        this.addSettingItem("addQuoteBlock", "* 制卡时加入引述块", true, "与代码块二选一");
        this.addSettingItem("showLastBlock", "* 显示上一分片最后一个块", false, "当前分片显示上一分片最后一个块内容");
        this.addSettingItem("openCardsOnOpenPiece", "* 打开分片的同时打开cards文档", false, "-cards后缀文件: 每本书用于保存闪卡的文件");
        this.addSettingItem("cardIndent", "* 制作的闪卡，从第二项开始向右缩进", false, "");
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