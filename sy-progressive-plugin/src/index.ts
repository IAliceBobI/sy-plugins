import { Plugin } from "siyuan";
import { ICONS } from "./icons";
import { prog } from "./Progressive";
import { events } from "../../sy-tomato-plugin/src/libs/Events";
import { flashBox } from "./FlashBox";

export default class ThePlugin extends Plugin {
    async onload() {
        this.addIcons(ICONS);
        events.onload(this);
        await prog.onload(this);
        await flashBox.onload(this);
    }

    onunload() {
        console.log("unload progressive learning plugin");
    }
}