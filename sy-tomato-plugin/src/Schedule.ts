import { Dialog, Plugin, Protyle, } from "siyuan";
import { siyuan, newID, timeUtil, getID } from "@/libs/utils";
import "./index.scss";
import ScheduleDialog from "@/Schedule.svelte";
import { STORAGE_SCHEDULE } from "./constants";
import { events } from "./libs/Events";

class Schedule {
    private plugin: Plugin;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.loadData(STORAGE_SCHEDULE).then(() => {
            this.loopSchedule();
        });
        this.plugin.addCommand({
            langKey: "schedule",
            hotkey: "⌘3",
            callback: async () => {
                await this.showScheduleDialog(events.lastBlockID);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.schedule,
                accelerator: "⌘3",
                iconHTML: "⏰",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    this.showScheduleDialog(blockID);
                },
            });
        });
    }

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "⏰",
            label: this.plugin.i18n.schedule,
            click: () => {
                for (const element of detail.blockElements) {
                    this.showScheduleDialog(getID(element));
                    break;
                }
            }
        });
    }

    private async showScheduleDialog(blockID: string) {
        if (!blockID) return;
        const id = newID();
        let d: ScheduleDialog = null;
        const dialog = new Dialog({
            title: "⏰ " + this.plugin.i18n.setDateTitle,
            content: `<div id="${id}"></div>`,
            width: events.isMobile ? "92vw" : "580px",
            height: "540px",
            destroyCallback() {
                if (d) d.$destroy();
            },
        });
        d = new ScheduleDialog({
            target: dialog.element.querySelector("#" + id),
            props: {
                plugin: this.plugin,
                blockID,
                dialog,
            }
        });
    }

    async addSchedule(blockID: string, datetime: string) {
        if (!blockID) return;
        let data = this.plugin.data[STORAGE_SCHEDULE] ?? {};
        if (typeof data == "string") data = {};
        data[blockID] = datetime;
        await this.plugin.saveData(STORAGE_SCHEDULE, data);
        await this.doSchedule(blockID, data);
        await siyuan.addBookmark(blockID, datetime.split(" ")[0]);
        await siyuan.pushMsg(`<h1>${this.plugin.i18n.scheduleSetSuccess}</h1>
        <br>${this.plugin.i18n.scheduledAt} ${datetime}`, 8 * 1000);
    }

    private async showTimeoutDialog(blockID: string, theTime: string) {
        if (await siyuan.checkBlockExist(blockID)) {
            const dialog = new Dialog({
                title: `${this.plugin.i18n.remind}: ${theTime}`,
                content: "<div id=\"protyle\" style=\"height: 480px;\"></div>",
                width: events.isMobile ? "92vw" : "560px",
                height: "540px",
            });
            new Protyle(this.plugin.app, dialog.element.querySelector("#protyle"), {
                blockId: blockID,
                action: ["cb-get-hl"],
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
            await siyuan.addBookmark(blockID, "");
            await this.plugin.saveData(STORAGE_SCHEDULE, data);
        }, delay, blockID, data[blockID]);
    }

    private loopSchedule() {
        let data = this.plugin.data[STORAGE_SCHEDULE] ?? {};
        if (typeof data == "string") data = {};
        for (const keyBlockID in data) {
            this.doSchedule(keyBlockID, data);
        }
    }
}

export const schedule = new Schedule();
