import { Dialog, Plugin, Protyle, } from "siyuan";
import { siyuan, newID, timeUtil } from "@/libs/utils";
import "./index.scss";
import ScheduleDialog from "@/Schedule.svelte";

const STORAGE_SCHEDULE = "schedule.json";

class Schedule {
    private plugin: Plugin;

    onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.loadData(STORAGE_SCHEDULE).then(() => {
            this.loopSchedule();
        });
        this.plugin.data[STORAGE_SCHEDULE] = {};
        this.plugin.addCommand({
            langKey: "schedule",
            hotkey: "⌘3",
            globalCallback: async () => {
                await this.showScheduleDialog();
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.schedule,
                icon: "iconSchedule",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    if (blockID) {
                        this.showScheduleDialog(blockID);
                    }
                },
            });
        });
    }

    async onLayoutReady() {

    }

    private async showScheduleDialog(blockID?: string) {
        const id = newID();
        const dialog = new Dialog({
            title: "⏰ " + this.plugin.i18n.setDateTitle,
            content: `<div id="${id}"></div>`,
            width: "600px",
            height: "540px",
        });
        new ScheduleDialog({
            target: dialog.element.querySelector("#" + id),
            props: {
                plugin: this.plugin,
                blockID,
                app: this.plugin.app,
                dialog,
                schedule: this,
            }
        });
    }

    private async addTag(blockID: string, datetime: string) {
        const { kramdown } = await siyuan.getBlockKramdown(blockID);
        const parts: string[] = kramdown.split("\n");
        const lastIdx = parts.length - 2;
        if (lastIdx >= 0) {
            // check time tag
            parts[lastIdx] = parts[lastIdx].replace(/#⏰\/[\d-]+\/[\d:]+#/, "");
            parts[lastIdx] += `#⏰/${datetime.split(" ").join("/")}#`;
            await siyuan.safeUpdateBlock(blockID, parts.join("\n"));
        }
    }

    async addSchedule(blockID: string, datetime: string) {
        if (!blockID) return;
        const data = this.plugin.data[STORAGE_SCHEDULE] ?? {};
        data[blockID] = datetime;
        await this.plugin.saveData(STORAGE_SCHEDULE, data);
        await this.doSchedule(blockID, data);
        await this.addTag(blockID, datetime);
        await siyuan.pushMsg(`<h1>${this.plugin.i18n.scheduleSetSuccess}</h1>
        <br>${this.plugin.i18n.scheduledAt} ${datetime}`, 8 * 1000);
    }

    private async showTimeoutDialog(blockID: string, theTime: string) {
        if (await siyuan.checkBlockExist(blockID)) {
            const dialog = new Dialog({
                title: `${this.plugin.i18n.remind}: ${theTime}`,
                content: "<div id=\"protyle\" style=\"height: 480px;\"></div>",
                width: "560px",
                height: "540px",
            });
            new Protyle(this.plugin.app, dialog.element.querySelector("#protyle"), {
                blockId: blockID,
            });
        }
    }

    private async doSchedule(blockID: string, data: any) {
        const nowMs = new Date().getTime();
        const ms = timeUtil.dateFromYYYYMMDDHHmmss(data[blockID]).getTime();
        let delay = ms - nowMs;
        if (delay < 0) delay = 0;
        setTimeout(async (blockID: string, theTime: string) => {
            await this.showTimeoutDialog(blockID, theTime);
            delete data[blockID];
            await this.plugin.saveData(STORAGE_SCHEDULE, data);
        }, delay, blockID, data[blockID]);
    }

    private loopSchedule() {
        const data = this.plugin.data[STORAGE_SCHEDULE] ?? {};
        for (const keyBlockID in data) {
            this.doSchedule(keyBlockID, data);
        }
    }
}

export const schedule = new Schedule();
