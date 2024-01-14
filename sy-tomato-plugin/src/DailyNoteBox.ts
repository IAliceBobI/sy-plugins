import { IProtyle, ITab, Lute, Plugin, openTab } from "siyuan";
import { events } from "./libs/Events";
import { NewLute, cleanDiv, siyuan } from "./libs/utils";
import { DATA_NODE_ID, PROTYLE_WYSIWYG_SELECT } from "./libs/gconst";

class DailyNoteBox {
    private plugin: Plugin;
    private lute: Lute;
    private move2BoxID: string;
    private lastOpen: ITab;
    private settingCfg: TomatoSettings;

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        const protyle: IProtyle = detail.protyle;
        detail.menu.addItem({
            iconHTML: "",
            label: this.plugin.i18n.moveBlock2today,
            click: () => {
                this.findDivs(protyle);
            }
        });
    }

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.settingCfg = (plugin as any).settingCfg;
        this.lute = NewLute();
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
                    this.moveBlock2today(events.lastBlockID);
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

    async findDailyNote(boxID: string, currentDocName: string, deltaMs: number) {
        currentDocName = currentDocName.trim();
        if (isValidDate(currentDocName)) {
            if (deltaMs < 0) {
                const rows = await siyuan.sql(`select id from blocks where type = "d" 
                and content < "${currentDocName}" and ial like "%custom-dailynote-%" 
                order by content desc limit 1`);
                for (const d of rows) {
                    return d.id;
                }
            } else {
                const rows = await siyuan.sql(`select id from blocks where type = "d" 
                and content > "${currentDocName}" and ial like "%custom-dailynote-%" 
                order by content asc limit 1`);
                for (const d of rows) {
                    return d.id;
                }
            }
        }
        return (await siyuan.createDailyNote(boxID)).id;
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
        if (!currentDocID && boxID) {
            targetDocID = (await siyuan.createDailyNote(boxID)).id;
        } else {
            const currentDocName = await siyuan.getDocNameByBlockID(currentDocID);
            targetDocID = await this.findDailyNote(boxID, currentDocName, deltaMs);
            if (!targetDocID) {
                await siyuan.pushMsg("没了！");
                return;
            }
        }
        if (currentDocID != targetDocID) this.lastOpen?.close();
        if (targetDocID) this.lastOpen = await openTab({ app: this.plugin.app, doc: { id: targetDocID } });
    }

    async moveBlock2today(blockID: string) {
        if (!blockID) return;
        let boxID = this.move2BoxID;
        if (!boxID) boxID = events.boxID;
        try {
            const { id: docID } = await siyuan.createDailyNote(boxID);
            const { dom } = await siyuan.getBlockDOM(blockID);
            const div = document.createElement("div");
            div.innerHTML = dom;
            await cleanDiv(div.firstElementChild as HTMLDivElement, false, false);
            const md = this.lute.BlockDOM2Md(div.innerHTML);
            await siyuan.appendBlock(md, docID);
            await siyuan.safeUpdateBlock(blockID, "");
        } catch (_e) {
            await siyuan.pushMsg(`您配置的笔记本'${boxID}'是否打开？`);
        }
    }

    async findDivs(protyle: IProtyle) {
        const multiLine = protyle.element.querySelectorAll(`.${PROTYLE_WYSIWYG_SELECT}`);
        let flag = false;
        for (const div of multiLine) {
            div.classList.remove(PROTYLE_WYSIWYG_SELECT);
            const id = div.getAttribute(DATA_NODE_ID);
            await this.moveBlock2today(id);
            flag = true;
        }
        if (!flag) {
            await this.moveBlock2today(events.lastBlockID);
        }
    }
}

export const dailyNoteBox = new DailyNoteBox();

function isValidDate(str: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(str);
}

