import { IProtyle, Lute, Plugin } from "siyuan";
import { EventType, events } from "./libs/Events";
import { BLOCK_REF, DATA_ID, DATA_SUBTYPE, DATA_TYPE } from "./libs/gconst";
import { NewLute, NewNodeID, getID, getSyElement, siyuan } from "./libs/utils";

class Tag2RefBox {
    public plugin: Plugin;
    public settingCfg: TomatoSettings;
    private lute: Lute;
    private docID: string;
    private observer: MutationObserver;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.lute = NewLute();
        this.settingCfg = (plugin as any).settingCfg;
        events.addListener("Tomato-Tag2RefBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static) {
                navigator.locks.request("Tomato-Tag2RefBox-onload", { ifAvailable: true }, async (lock) => {
                    const protyle: IProtyle = detail.protyle;
                    const nextDocID = protyle?.block?.rootID;
                    const element = protyle?.wysiwyg?.element;
                    if (lock && element && nextDocID) {
                        if (this.docID != nextDocID) {
                            this.docID = nextDocID;
                            this.observer?.disconnect();
                            this.observer = new MutationObserver((_mutationsList) => {
                                this.findAllTagLock(element);
                            });
                            this.observer.observe(element, { childList: true });
                        }
                    }
                });
            }
        });
    }

    private async findAllTagLock(element: HTMLElement) {
        return navigator.locks.request("Tomato-Tag2RefBox-findAllTagLock", { ifAvailable: true }, async (lock) => {
            if (lock && element) {
                await this.findAllTag(element);
            }
        });
    }

    private async findAllTag(element: HTMLElement) {
        const cursorID = events.lastBlockID;
        const elements = Array.from(element.querySelectorAll(`span[${DATA_TYPE}="tag"]`))
            .filter(e => e.childElementCount == 0)
            .map((e: HTMLElement) => { return { e, text: e.textContent || e.innerText }; })
            .map(({ e, text }) => { return { e, text: text?.replace(/\u200B/g, "")?.trim() }; })
            .filter(({ text }) => !!text)
            .reduce((nodes, { e, text }) => {
                const refs = text.split("/").filter(i => !!i);
                const parent = e.parentElement;
                const block = getSyElement(e) as HTMLElement;
                const id = getID(block);
                if (refs.length > 0 && parent && id && id != cursorID) {
                    nodes.set(id, block);
                    let i = 0;
                    const spans: HTMLSpanElement[] = refs.reduce((all, ref) => {
                        if (i > 0) {
                            const span = document.createElement("span") as HTMLSpanElement;
                            span.innerText = "/";
                            all.push(span);
                        }
                        const span = document.createElement("span") as HTMLSpanElement;
                        span.setAttribute(DATA_TYPE, BLOCK_REF);
                        span.setAttribute(DATA_ID, NewNodeID());
                        span.setAttribute(DATA_SUBTYPE, "d");
                        span.innerText = ref;
                        all.push(span);
                        i++;
                        return all;
                    }, []);
                    if (spans.length > 0) {
                        parent.replaceChild(spans[0], e);
                        for (const rest of spans.slice(1).reverse()) {
                            spans[0].insertAdjacentElement("afterend", rest)
                        }
                    }
                }
                return nodes;
            }, new Map<string, HTMLElement>());
        for (const [nodeID, element] of elements) {
            const md = this.lute.BlockDOM2Md(element.outerHTML);
            await siyuan.safeUpdateBlock(nodeID, md);
        }
    }
}

export const tag2RefBox = new Tag2RefBox();
