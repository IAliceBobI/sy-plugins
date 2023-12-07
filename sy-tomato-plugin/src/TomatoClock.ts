import {
    Dialog,
    Plugin,
    showMessage,
} from "siyuan";
import "./index.scss";
import { STORAGE_TOMATO_CLOCKS } from "./constants";


class TomatoClock {
    private plugin: Plugin;
    private timeoutID: number;
    private lastDelayMin: number;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.lastDelayMin = 0;
        this.timeoutID = 0;

        let clocks: string = (this.plugin as any).settingCfg[STORAGE_TOMATO_CLOCKS] ?? "5,10,15,25";
        const washed = [0];
        for (const clock of clocks.split(/[,，]/g)) {
            const n = Number(clock.trim());
            if (Number.isInteger(n)) {
                if (n == 0) continue;
                washed.push(n);
            }
        }
        clocks = washed.sort((a, b) => a - b).map(i => {
            this.addTomatoClock(i);
            return String(i);
        }).join(",");
        (this.plugin as any).settingCfg[STORAGE_TOMATO_CLOCKS] = clocks;

        this.plugin.setting.addItem({
            title: "** 番茄钟时长(中英文逗号隔开，半角数字)",
            description: "先开启：状态栏番茄钟",
            createActionElement: () => {
                const input = document.createElement("input") as HTMLInputElement;
                input.className = "input";
                input.value = clocks;
                input.className = "b3-text-field fn__flex-center";
                input.addEventListener("input", () => {
                    (this.plugin as any).settingCfg[STORAGE_TOMATO_CLOCKS] = input.value;
                });
                return input;
            },
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
        statusIconTemp.innerHTML = `<div class="toolbar__item ariaLabel" aria-label="${label}">
    <svg> <use xlink:href="#${icon}"></use> </svg></div>`;
        statusIconTemp.content.firstElementChild.addEventListener("click", () => {
            clearTimeout(this.timeoutID);
            if (this.lastDelayMin > 0) {
                showMessage(`${name}🍅${this.plugin.i18n.cancelLastCountdown}: ${this.lastDelayMin}m`, 5000);
            }
            this.lastDelayMin = minute;
            if (minute > 0) {
                showMessage(`${name}🍅${this.plugin.i18n.startCountdown}: ${minute}m`, 5000);
                this.timeoutID = setTimeout(() => {
                    this.showTimeoutDialog(minute);
                    this.lastDelayMin = 0;
                }, minute * 60 * 1000) as unknown as number;
            }
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
