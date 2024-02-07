import {
    Dialog,
    Plugin,
    Protyle,
} from "siyuan";
import "./index.scss";
import { siyuan } from "./libs/utils";
import { STORAGE_TOMATO_TIME } from "./constants";
import { EventType, events } from "./libs/Events";


function formatDuration(milliseconds: number): { minutes: number, seconds: number } {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return { minutes, seconds };
}

type TomatoTime = {
    minute: number;
    startTime: number;
}

class TomatoClock {
    private plugin: Plugin;
    private timeoutID: any;
    private lastDelayMinute: number;
    private lastStartTime: number;
    private settingCfg: TomatoSettings;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.lastDelayMinute = 0;
        this.settingCfg = (plugin as any).settingCfg;
        this.plugin.loadData(STORAGE_TOMATO_TIME).then(() => {
            const data = (this.plugin.data[STORAGE_TOMATO_TIME] ?? {}) as TomatoTime;
            if (data.minute > 0 && data.startTime > 0) {
                const due = data.minute * 60 * 1000 + data.startTime;
                const now = Date.now();
                if (now < due) {
                    this.lastDelayMinute = data.minute;
                    this.lastStartTime = data.startTime;
                    this.timeoutID = setTimeout(() => {
                        this.showTimeoutDialog(data.minute);
                        this.lastDelayMinute = 0;
                        this.maintainBgImg();
                    }, due - now);
                }
                this.maintainBgImg();
            }
        });
        const clocks = this.addStatusIcons();
        this.plugin.setting.addItem({
            title: "** 番茄钟时长(中英文逗号隔开，半角数字)",
            description: "依赖：状态栏番茄钟",
            createActionElement: () => {
                const input = document.createElement("input") as HTMLInputElement;
                input.className = "input";
                input.value = clocks;
                input.className = "b3-text-field fn__flex-center";
                input.addEventListener("input", () => {
                    this.settingCfg["tomato-clocks"] = input.value;
                });
                return input;
            },
        });

        this.plugin.setting.addItem({
            title: "** 计时后修改背景-明亮模式",
            description: "依赖：状态栏番茄钟。比如填入：assets/dd-20240206160021-tz7aefu.jpeg",
            createActionElement: () => {
                const input = document.createElement("input") as HTMLInputElement;
                input.className = "input";
                input.value = this.settingCfg["tomato-clocks-change-bg"] ?? "";
                input.className = "b3-text-field fn__flex-center";
                input.addEventListener("input", () => {
                    this.settingCfg["tomato-clocks-change-bg"] = input.value;
                });
                return input;
            },
        });

        this.plugin.setting.addItem({
            title: "** 计时后修改背景-黑暗模式",
            description: "依赖：状态栏番茄钟。比如填入：assets/dd-20240206160021-tz7aefu.jpeg",
            createActionElement: () => {
                const input = document.createElement("input") as HTMLInputElement;
                input.className = "input";
                input.value = this.settingCfg["tomato-clocks-change-bg-dark"] ?? "";
                input.className = "b3-text-field fn__flex-center";
                input.addEventListener("input", () => {
                    this.settingCfg["tomato-clocks-change-bg-dark"] = input.value;
                });
                return input;
            },
        });

        events.addListener("TomatoClockBox", (eventType: string, _detail: Protyle) => {
            if (eventType == EventType.loaded_protyle_static) {
                this.maintainBgImg();
            }
        });
    }

    private maintainBgImg() {
        const mode = document.querySelector("[data-theme-mode]")?.getAttribute("data-theme-mode");
        if (!mode) return;
        let url = this.settingCfg["tomato-clocks-change-bg"];
        if (mode == "dark") {
            url = this.settingCfg["tomato-clocks-change-bg-dark"];
        }
        if (!url) return;
        const e = events?.protyle?.protyle?.element as HTMLElement;
        if (!e) return;
        if (!this.lastDelayMinute) {
            if (e.style.backgroundImage) e.style.backgroundImage = "";
        } else {
            e.style.backgroundImage = `url('${url}')`;
        }
    }

    private addStatusIcons() {
        let clocks: string = this.settingCfg["tomato-clocks"] ?? "5,10,15,25";
        const washed = [0];
        for (const clock of clocks.split(/[,，]/g)) {
            const n = Number(clock.trim());
            if (Number.isInteger(n)) {
                if (n == 0) continue;
                washed.push(n);
            }
        }
        this.addTomatoPeeker();
        clocks = washed.sort((a, b) => a - b).map(i => {
            this.addTomatoClock(i);
            return String(i);
        }).join(",");
        this.settingCfg["tomato-clocks"] = clocks;
        return clocks;
    }

    private getRemainingTime() {
        if (this.lastDelayMinute == 0) return 0;
        const elapsedTime = Date.now() - this.lastStartTime;
        let remainingTime = this.lastDelayMinute * 60 * 1000 - elapsedTime;
        if (remainingTime < 0) remainingTime = 0;
        return remainingTime;
    }

    private async showRemainingTime() {
        const name = this.plugin.i18n.name;
        const { minutes, seconds } = formatDuration(this.getRemainingTime());
        if (minutes == 0 && seconds == 0) await siyuan.pushMsg(`${name}🍅未开始计时`);
        else await siyuan.pushMsg(`${name}🍅剩余： ${minutes}分 ${seconds}秒`);
    }

    private addTomatoPeeker() {
        const name = this.plugin.i18n.name;
        const statusIconTemp = document.createElement("template");
        statusIconTemp.innerHTML = `<div class="toolbar__item ariaLabel" aria-label="${name}🍅查看剩余时间"><svg><use xlink:href="#iconEye"></use></svg></div>`;
        statusIconTemp.content.firstElementChild.addEventListener("click", this.showRemainingTime.bind(this));
        this.plugin.addStatusBar({
            element: statusIconTemp.content.firstElementChild as HTMLElement,
        });
    }

    private addTomatoClock(minute: number) {
        const icon = `iconTomato${minute}`;
        this.plugin.addIcons(`<symbol id="iconTomato${minute}" viewBox="0 0 32 32"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="20" font-weight="bold">${minute}</text>
        </svg></symbol>`);

        const name = this.plugin.i18n.name;
        let label = `${name}🍅${minute}${this.plugin.i18n.takeARestAfterMinutes}`;
        if (minute === 0) {
            label = `${name}🍅${this.plugin.i18n.cancelCountdown}`;
        }
        const statusIconTemp = document.createElement("template");
        statusIconTemp.innerHTML = `<div class="toolbar__item ariaLabel" aria-label="${label}"><svg><use xlink:href="#${icon}"></use></svg></div>`;
        statusIconTemp.content.firstElementChild.addEventListener("click", async () => {
            clearTimeout(this.timeoutID);
            if (this.lastDelayMinute > 0) {
                await this.showRemainingTime();
                await siyuan.pushMsg(`${name}🍅${this.plugin.i18n.cancelLastCountdown}: ${this.lastDelayMinute}m`, 5000);
            }
            this.lastDelayMinute = minute;
            this.lastStartTime = Date.now();
            if (minute > 0) {
                await siyuan.pushMsg(`${name}🍅${this.plugin.i18n.startCountdown}: ${minute}m`, 5000);
                this.plugin.saveData(STORAGE_TOMATO_TIME, { minute, startTime: this.lastStartTime });
                this.timeoutID = setTimeout(() => {
                    this.showTimeoutDialog(minute);
                    this.lastDelayMinute = 0;
                    this.maintainBgImg();
                }, minute * 60 * 1000);
            } else {
                this.plugin.saveData(STORAGE_TOMATO_TIME, { minute: 0, startTime: 0 });
            }
            this.maintainBgImg();
        });
        this.plugin.addStatusBar({
            element: statusIconTemp.content.firstElementChild as HTMLElement,
        });
    }

    private showTimeoutDialog(minute: number) {
        const name = this.plugin.i18n.name;
        new Dialog({
            title: `${name}🍅${minute} ${this.plugin.i18n.hasWorkedMinutes}`,
            content: `
                <div class="tomato-style__container">
                    <p class="tomato-style__centered-text">${this.plugin.i18n.takeARestPlease}</p>
                </div>
            `,
            width: "800px",
            height: "600px",
        });
    }
}

export const tomatoClock = new TomatoClock();
