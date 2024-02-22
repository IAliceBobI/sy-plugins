import { IProtyle, ITab, Plugin, openTab } from "siyuan";
import { events } from "./libs/Events";
import { siyuan } from "./libs/utils";

class DailyNoteBox {
    private plugin: Plugin;
    private move2BoxID: string;
    private lastOpen: ITab;
    private settingCfg: TomatoSettings;

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        const protyle: IProtyle = detail.protyle;
        detail.menu.addItem({
            iconHTML: "🏑",
            label: this.plugin.i18n.moveBlock2today,
            click: () => {
                this.findDivs(protyle);
            }
        });
    }

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.settingCfg = (plugin as any).settingCfg;
        if (!events.isMobile) {
            this.plugin.addTopBar({
                icon: "iconLeft",
                title: "上一个日志",
                position: "left",
                callback: () => {
                    this.openDailyNote(-1000 * 60 * 60 * 24);
                }
            });
            this.plugin.addTopBar({
                icon: "iconRight",
                title: "下一个日志",
                position: "left",
                callback: () => {
                    this.openDailyNote(1000 * 60 * 60 * 24);
                }
            });
        }
        this.plugin.addCommand({
            langKey: "previousNote",
            hotkey: "⌥Q",
            callback: () => {
                this.openDailyNote(-1000 * 60 * 60 * 24);
            },
        });
        this.plugin.addCommand({
            langKey: "nextNote",
            hotkey: "⌥W",
            callback: () => {
                this.openDailyNote(1000 * 60 * 60 * 24);
            },
        });
        this.plugin.addCommand({
            langKey: "moveBlock2today",
            hotkey: "⌘6",
            editorCallback: (protyle) => {
                this.findDivs(protyle);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.moveBlock2today,
                icon: "iconMove",
                accelerator: "",
                click: () => {
                    this.findDivs();
                },
            });
        });

        this.move2BoxID = this.settingCfg["daily-note-box-id"] ?? "";
        this.move2BoxID = this.move2BoxID.trim();
        if (this.move2BoxID.length != "20231225101829-mx2rjtv".length)
            this.move2BoxID = "";
        this.plugin.setting.addItem({
            title: "** 默认的笔记本ID，留空为自动选择。获取ID：右键笔记本->设置->复制ID。",
            description: "依赖：移动内容到 daily note",
            createActionElement: () => {
                const input = document.createElement("input") as HTMLInputElement;
                input.className = "input";
                input.value = this.move2BoxID;
                input.className = "b3-text-field fn__flex-center";
                input.addEventListener("input", () => {
                    this.move2BoxID = input.value.trim();
                    this.settingCfg["daily-note-box-id"] = this.move2BoxID;
                });
                return input;
            },
        });
    }

    async findDailyNote(boxID: string, ymd: string, deltaMs: number) {
        if (ymd) {
            if (deltaMs < 0) {
                const rows = await siyuan.sql(`select B.id from (select block_id from attributes 
                    where box='${boxID}' 
                    and name < 'custom-dailynote-${ymd}' 
                    and name like 'custom-dailynote-%' 
                    order by name desc limit 1) as A inner join blocks as B 
                    on A.block_id = B.id 
                    and B.ial like "%custom-dailynote-%"`);
                for (const d of rows) {
                    return d.id;
                }
            } else {
                const rows = await siyuan.sql(`select B.id from (select block_id from attributes 
                    where box='${boxID}' 
                    and name > 'custom-dailynote-${ymd}' 
                    and name like 'custom-dailynote-%' 
                    order by name asc limit 1) as A inner join blocks as B 
                    on A.block_id = B.id 
                    and B.ial like "%custom-dailynote-%"`);
                for (const d of rows) {
                    return d.id;
                }
            }
        }
        return "";
    }

    async openDailyNote(deltaMs: number) {
        let boxID = this.move2BoxID;
        if (!boxID) boxID = events.boxID;
        if (!boxID) boxID = (await siyuan.lsNotebooks(false))[0];
        if (!boxID) {
            await siyuan.pushMsg("请先打开笔记本");
            return;
        }
        if (deltaMs == 0) return;
        const currentDocID = events.docID;
        let targetDocID: string;
        if (currentDocID) {
            const attrs = await siyuan.getBlockAttrs(currentDocID);
            let ymd: string;
            for (const key in attrs) {
                if (key.startsWith("custom-dailynote-")) {
                    ymd = attrs[key];
                }
            }
            targetDocID = await this.findDailyNote(boxID, ymd, deltaMs);
        }
        if (!targetDocID) targetDocID = (await siyuan.createDailyNote(boxID)).id;
        if (currentDocID != targetDocID) this.lastOpen?.close();
        if (targetDocID) this.lastOpen = await openTab({ app: this.plugin.app, doc: { id: targetDocID } });
    }

    async findDivs(protyle?: IProtyle) {
        let boxID = this.move2BoxID;
        if (!boxID) boxID = events.boxID;
        try {
            const { id: docID } = await siyuan.createDailyNote(boxID);
            const { ids } = events.selectedDivs(protyle);
            await siyuan.moveBlocksAsChild(ids, docID);
        } catch (_e) {
            await siyuan.pushMsg(`您配置的笔记本'${boxID}'是否打开？`);
        }
    }
}

export const dailyNoteBox = new DailyNoteBox();

// function isValidDate(str: string): boolean {
//     const regex = /^\d{4}-\d{2}-\d{2}$/;
//     return regex.test(str);
// }

