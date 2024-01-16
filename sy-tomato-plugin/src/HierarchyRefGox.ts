import { IProtyle, Lute, Plugin } from "siyuan";
import { EventType, events } from "./libs/Events";
import { BLOCK_REF, DATA_ID, DATA_SUBTYPE, DATA_TYPE, REF_HIERARCHY } from "./libs/gconst";
import { NewLute, getID, getSyElement, siyuan, siyuanCache } from "./libs/utils";

type IDName = {
    id: string;
    name: string;
};

class HierarchyRefGox {
    public plugin: Plugin;
    public settingCfg: TomatoSettings;
    private lute: Lute;
    private docID: string;
    private observer: MutationObserver;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.lute = NewLute();
        this.settingCfg = (plugin as any).settingCfg;
        events.addListener("Tomato-HierarchyRefGox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static) {
                navigator.locks.request("Tomato-HierarchyRefGox-onload", { ifAvailable: true }, async (lock) => {
                    const protyle: IProtyle = detail.protyle;
                    if (!protyle) return;
                    const notebookId = protyle.notebookId;
                    const nextDocID = protyle?.block?.rootID;
                    const element = protyle?.wysiwyg?.element;
                    if (lock && element && nextDocID && notebookId) {
                        if (this.docID != nextDocID) {
                            this.docID = nextDocID;
                            this.observer?.disconnect();
                            this.observer = new MutationObserver((_mutationsList) => {
                                this.findAllRefLock(notebookId, element);
                            });
                            this.observer.observe(element, { childList: true });
                        }
                    }
                });
            }
        });
    }

    private async findAllRefLock(notebookId: string, element: HTMLElement) {
        return navigator.locks.request("Tomato-HierarchyRefGox-findAllRefLock", { ifAvailable: true }, async (lock) => {
            if (lock && element) {
                await this.findAllRef(notebookId, element);
            }
        });
    }

    private async findAllRef(notebookId: string, element: HTMLElement) {
        const elements = Array.from(element.querySelectorAll(`span[${DATA_TYPE}="tag"]`))
            .filter(e => e.childElementCount == 0)
            .map((e: HTMLElement) => { return { e, text: e.textContent || e.innerText }; })
            .map(({ e, text }) => { return { e, text: text?.replace(/\u200B/g, "")?.trim() }; })
            .filter(({ text }) => !!text);

        const cursorID = events.lastBlockID;
        const nodes = new Map<string, HTMLElement>();
        for (const { e, text } of elements) {
            const refs = text.split("/").filter(i => !!i);
            const parent = e.parentElement;
            const block = getSyElement(e) as HTMLElement;
            const id = getID(block);
            if (refs.length > 0 && parent && id && id != cursorID) {
                nodes.set(id, block);
                let i = 0;
                const spans: HTMLSpanElement[] = [];
                const idName: IDName[] = [];
                for (const ref of refs) {
                    if (i++ > 0) {
                        const span = document.createElement("span") as HTMLSpanElement;
                        span.innerText = "/";
                        spans.push(span);
                    }
                    const span = document.createElement("span") as HTMLSpanElement;
                    span.setAttribute(DATA_TYPE, BLOCK_REF);
                    const id = await createRefDoc(notebookId, ref);
                    span.setAttribute(DATA_ID, id);
                    span.setAttribute(DATA_SUBTYPE, "d");
                    span.innerText = ref;
                    spans.push(span);
                    idName.push({ id, name: ref });
                }
                if (spans.length > 0) {
                    parent.replaceChild(spans[0], e);
                    for (const rest of spans.slice(1).reverse()) {
                        spans[0].insertAdjacentElement("afterend", rest);
                    }
                }
                await insertMd(idName);
            }
        }

        for (const [nodeID, element] of nodes) {
            const md = this.lute.BlockDOM2Md(element.outerHTML);
            await siyuan.safeUpdateBlock(nodeID, md);
        }
    }
}

async function insertMd(idName: IDName[]) {
    if (idName.length > 1) {
        const attrValue = `${idName.map(i => i.id).join(",")}`;
        const row = await siyuan.sqlOne(`select id from blocks 
where type='l' 
and root_id="${idName[0].id}"
and ial like '%${REF_HIERARCHY}="${attrValue}"%' limit 1`);
        if (!row?.id) {
            let i = 0;
            const mdList = [];
            for (const ref of idName.map(({ id, name }) => `((${id} '${name}'))`)) {
                mdList.push(`${"  ".repeat(i++)}* ${ref}`);
            }
            mdList.push(`{: ${REF_HIERARCHY}="${attrValue}"}`);
            await siyuan.insertBlockAsChildOf(mdList.join("\n"), idName[0].id);
        }
    }
}

async function createRefDoc(notebookId: string, name: string) {
    const row = await siyuan.sqlOne(`select id from blocks where type='d' and content='${name}' limit 1`);
    if (row?.id) return row.id;
    const { path } = await siyuan.getRefCreateSavePath(notebookId);
    return await siyuanCache.createDocWithMdIfNotExists(5000, notebookId, path + name, "");
}

export const hierarchyRefGox = new HierarchyRefGox();
