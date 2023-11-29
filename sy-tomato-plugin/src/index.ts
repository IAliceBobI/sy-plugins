import { Plugin } from "siyuan";
import { ICONS } from "./icons";
import { tomatoClock } from "./TomatoClock";
import { linkBox } from "./LinkBox";
import { schedule } from "./Schedule";
import { toolBox } from "./ToolBox";
import { cpBox } from "./CpBox";
import { events } from "./Events";
import { STORAGE_SETTINGS } from "./constants";


export default class ThePlugin extends Plugin {
    onload() {
        this.addIcons(ICONS);
        events.onload(this);
        tomatoClock.onload(this);
        schedule.onload(this);
        toolBox.onload(this);
        linkBox.onload(this);
        cpBox.onload(this);
    }

    onLayoutReady() {
        this.loadData(STORAGE_SETTINGS);
        schedule.onLayoutReady();
    }

    onunload() {
        console.log("unload tomato plugin");
    }
}