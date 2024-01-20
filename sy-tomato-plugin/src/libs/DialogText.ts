import { newID } from "./utils";
import DialogTextSv from "./DialogTextSv.svelte";
import { Dialog } from "siyuan";

export class DialogText {
    private title: string;
    private defaultValue: string;

    constructor(title: string, defaultValue: string, callback: Func) {
        this.title = title;
        this.defaultValue = defaultValue;
        this.open(callback);
    }

    private open(callback: Func) {
        const id = newID();
        let d: DialogTextSv = null;
        const dialog = new Dialog({
            title: this.title,
            content: `<div id="${id}"></div>`,
            destroyCallback() {
                if (d) d.$destroy();
            },
        });
        d = new DialogTextSv({
            target: dialog.element.querySelector("#" + id),
            props: {
                dialog,
                callback,
                defaultValue: this.defaultValue,
            }
        });
    }
}
