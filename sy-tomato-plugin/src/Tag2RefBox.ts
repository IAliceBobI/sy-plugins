import { IProtyle, Lute, Plugin } from "siyuan";
import { EventType, events } from "./libs/Events";
import { BLOCK_REF, DATA_ID, DATA_NODE_ID, DATA_SUBTYPE, DATA_TYPE, REF_HIERARCHY, TOMATO_LINE_THROUGH } from "./libs/gconst";
import { NewLute, getContenteditableElement, getID, getSyElement, siyuan, siyuanCache } from "./libs/utils";

type IDName = {
    id: string;
    name: string;
};

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
        this.plugin.setting.addItem({
            title: "** 添加引用时自动制卡",
            description: "依赖：自动将标签转为引用",
            createActionElement: () => {
                const checkbox = document.createElement("input") as HTMLInputElement;
                checkbox.type = "checkbox";
                checkbox.checked = this.settingCfg["tag-to-ref-add-card"] ?? false;
                checkbox.addEventListener("change", () => {
                    this.settingCfg["tag-to-ref-add-card"] = checkbox.checked;
                });
                checkbox.className = "b3-switch fn__flex-center";
                return checkbox;
            },
        });

        events.addListener("Tomato-Tag2RefBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static) {
                navigator.locks.request("Tomato-Tag2RefBox-onload", { ifAvailable: true }, async (lock) => {
                    const protyle: IProtyle = detail.protyle;
                    if (!protyle) return;
                    const notebookId = protyle.notebookId;
                    const nextDocID = protyle?.block?.rootID;
                    const element = protyle?.wysiwyg?.element;
                    if (lock && element && nextDocID && notebookId) {
                        await this.findAllTagLock(notebookId, element);
                        if (this.docID != nextDocID) {
                            this.docID = nextDocID;
                            this.observer?.disconnect();
                            this.observer = new MutationObserver((mutationsList) => {
                                mutationsList
                                    .map(i => i.previousSibling)
                                    .forEach((e: HTMLElement) => this.findAllTagLock(notebookId, e));
                            });
                            this.observer.observe(element, { childList: true });
                        }
                    }
                });
            }
        });
    }

    private async findAllTagLock(notebookId: string, element: HTMLElement) {
        return navigator.locks.request("Tomato-Tag2RefBox-findAllTagLock", { ifAvailable: true }, async (lock) => {
            if (lock && element) {
                await this.findAllTag(notebookId, element);
                await this.findAllComment(element);
            }
        });
    }

    private async findAllComment(element: HTMLElement) {
        const id = element.getAttribute(DATA_NODE_ID);
        if (!id) return;
        const txt = getContenteditableElement(element)?.textContent ?? "";
        if (txt.startsWith(";;") || txt.startsWith("；；")) {
            element.setAttribute(TOMATO_LINE_THROUGH, "1");
            setTimeout(() => {
                const attr = {} as AttrType;
                attr["custom-tomato-line-through"] = "1";
                siyuan.setBlockAttrs(id, attr);
            }, 3000);
        }
    }

    private async findAllTag(notebookId: string, element: HTMLElement) {
        const elements = Array.from(element.querySelectorAll(`span[${DATA_TYPE}="tag"]`))
            .filter(e => e.childElementCount == 0)
            .map((e: HTMLElement) => { return { e, text: e.textContent || e.innerText }; })
            .map(({ e, text }) => { return { e, text: text?.replace(/\u200B/g, "")?.trim() }; })
            .filter(({ text }) => !!text)
            .filter(({ text }) => {
                return !text.endsWith(".xhtml")
                    && !text.endsWith(".html")
                    && !text.startsWith("@")
                    && !text.startsWith("tag");
            });

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
                    const id = await this.createRefDoc(notebookId, ref);
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

    private async createRefDoc(notebookId: string, name: string) {
        const row = await siyuan.sqlOne(`select id from blocks where type='d' and content='${name}' limit 1`);
        if (row?.id) return row.id;
        const { path } = await siyuan.getRefCreateSavePath(notebookId);
        const id = await siyuanCache.createDocWithMdIfNotExists(5000, notebookId, path + name, "");
        if (this.settingCfg["tag-to-ref-add-card"]) {
            await siyuan.addRiffCards([id]);
        }
        return id;
    }
}

async function insertMd(idName: IDName[]) {
    if (idName.length > 1) {
        const attrValue = `${idName.map(i => i.id).join(",")}`;
        const row = await siyuan.sqlOne(`select block_id as id from attributes
            where name="${REF_HIERARCHY}" and value like "%${attrValue}%" limit 1`);
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

export const tag2RefBox = new Tag2RefBox();
