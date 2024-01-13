import { IProtyle, Lute, Plugin } from "siyuan";
import { EventType, events } from "./libs/Events";
import { BLOCK_REF, DATA_ID, DATA_NODE_ID, DATA_SUBTYPE, DATA_TYPE } from "./libs/gconst";
import { NewLute, siyuan } from "./libs/utils";

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
                        console.log(detail)
                        await this.findAllTag(protyle.element);
                    }
                });
            }
        });
    }
    private async findAllTag(element: HTMLElement) {
        const elements = Array.from(element.querySelectorAll(`span[${DATA_TYPE}="tag"]`))
            .filter(e => e.childElementCount == 0)
            .map((e: HTMLElement) => { return { e, text: e.textContent || e.innerText } })
            .map(({ e, text }) => { return { e, text: text.replace(/\u200B/g, "").trim() } })
            .filter(({ text }) => !!text)
            .reduce((nodes, { e, text }) => {
                const refs = text.split("/").filter(i => !!i);
                const parent = e.parentElement;
                const id = parent?.getAttribute(DATA_NODE_ID);
                if (refs.length > 0 && id) {
                    parent.removeChild(e);
                    nodes.set(id, parent)
                    let i = 0;
                    refs.forEach(ref => {
                        if (i > 0) {
                            const span = parent.appendChild(document.createElement("span")) as HTMLSpanElement;
                            span.innerText = "/"
                        }
                        const span = parent.appendChild(document.createElement("span")) as HTMLSpanElement;
                        span.setAttribute(DATA_TYPE, BLOCK_REF)
                        span.setAttribute(DATA_ID, "abc");
                        span.setAttribute(DATA_SUBTYPE, "d");
                        span.innerText = ref;
                        i++;
                    });
                    // document.getSelection().collapse(parent, 1);
                }
                return nodes;
            }, new Map<string, HTMLElement>())
        const cursorID = events.lastBlockID;
        for (const [nodeID, element] of elements) {
            if (nodeID == cursorID) continue;
            await siyuan.safeUpdateBlock(nodeID, this.lute.BlockDOM2Md(element.outerHTML))
        }
    }
}

export const tag2RefBox = new Tag2RefBox();
