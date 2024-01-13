import { IProtyle, Lute, Plugin } from "siyuan";
import { EventType, events } from "./libs/Events";
import { BLOCK_REF, DATA_ID, DATA_SUBTYPE, DATA_TYPE } from "./libs/gconst";
import { NewLute, NewNodeID, getID, getSyElement, siyuan, sleep } from "./libs/utils";

class Tag2RefBox {
    public plugin: Plugin;
    public settingCfg: TomatoSettings;
    private lute: Lute;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.lute = NewLute();
        this.settingCfg = (plugin as any).settingCfg;
        events.addListener("Tomato-Tag2RefBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static) {
                navigator.locks.request("Tomato-Tag2RefBox-Lock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        const protyle = detail.protyle as IProtyle;
                        for (let i = 0; i < 5; i++) {
                            await this.findAllTag(protyle.element);
                            await sleep(2000);
                        }
                    }
                });
            }
        });
    }

    private async findAllTag(element: HTMLElement) {
        const elements = Array.from(element.querySelectorAll(`span[${DATA_TYPE}="tag"]`))
            .filter(e => e.childElementCount == 0)
            .map((e: HTMLElement) => { return { e, text: e.textContent || e.innerText }; })
            .map(({ e, text }) => { return { e, text: text.replace(/\u200B/g, "").trim() }; })
            .filter(({ text }) => !!text)
            .reduce((nodes, { e, text }) => {
                const refs = text.split("/").filter(i => !!i);
                const parent = e.parentElement;
                const block = getSyElement(e) as HTMLElement;
                const id = getID(block);
                if (refs.length > 0 && parent && id) {
                    nodes.set(id, block);
                    let i = 0;
                    const div = refs.reduce((all, ref) => {
                        if (i > 0) {
                            const span = document.createElement("span") as HTMLSpanElement;
                            span.innerText = "/";
                            all.appendChild(span);
                        }
                        const span = document.createElement("span") as HTMLSpanElement;
                        span.setAttribute(DATA_TYPE, BLOCK_REF);
                        span.setAttribute(DATA_ID, NewNodeID());
                        span.setAttribute(DATA_SUBTYPE, "d");
                        span.innerText = ref;
                        all.appendChild(span);
                        i++;
                        return all;
                    }, document.createElement("div"));
                    parent.replaceChild(div, e);
                }
                return nodes;
            }, new Map<string, HTMLElement>());
        const cursorID = events.lastBlockID;
        for (const [nodeID, element] of elements) {
            if (nodeID == cursorID) continue;
            const md = this.lute.BlockDOM2Md(element.outerHTML);
            await siyuan.safeUpdateBlock(nodeID, md);
        }
    }
}

export const tag2RefBox = new Tag2RefBox();
