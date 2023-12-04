import { IProtyle, Plugin } from "siyuan";
import { siyuan } from "./libs/utils";
import { DATA_ID, DATA_NODE_ID, DATA_TYPE } from "./libs/gconst";
import { TOMATOBACKLINKKEY } from "./constants";
import { events } from "./libs/Events";

type RefCollector = Map<string, { lnk: string, count: number }>;
const TOMATO = "tomato_zZmqus5PtYRi"

class BKMaker {
    protyle: IProtyle
    top: number
    itemID: string
    item: HTMLElement
    docID: string
    container: HTMLDivElement;

    constructor(protyle: IProtyle, item: HTMLElement, top: number) {
        this.protyle = protyle;
        this.item = item;
        this.top = top;
        this.container = document.createElement("div");
        this.docID = protyle?.block.rootID ?? "";
        this.itemID = item.getAttribute(DATA_NODE_ID);
    }

    private hr() {
        return document.createElement("hr")
    }

    async doTheWork() {
        if (this.docID) {
            this.getBackLinks()
        }
        this.setReadonly(this.container)
        this.item.lastElementChild.insertAdjacentElement("afterend", this.container);
        this.item.querySelector(".fn__rotate")?.classList.remove("fn__rotate");
        this.item.style.height = "";
    }

    private setReadonly(e: HTMLElement) {
        e.querySelectorAll('[contenteditable="true"]')?.forEach(sub => {
            sub?.setAttribute('contenteditable', 'false')
        });
    }

    private async getBackLinks() {
        const allRefs: RefCollector = new Map();
        const backlink2 = await siyuan.getBacklink2(this.docID);
        {
            let shouldInsertSplit = false;
            for (const backlink of backlink2.backlinks.reverse()) {
                const backlinkDoc = await siyuan.getBacklinkDoc(this.docID, backlink.id);
                for (const backlinksInDoc of backlinkDoc.backlinks.reverse()) {
                    await this.fillContent(backlinksInDoc, allRefs);
                    shouldInsertSplit = backlinksInDoc.blockPaths.length > 0;
                }
            }
            if (shouldInsertSplit) {
                this.container.appendChild(this.hr())
            }
        }
        {
            for (const memtion of backlink2.backmentions.reverse()) {
                const memtionDoc = await siyuan.getBackmentionDoc(this.docID, memtion.id);
                for (const memtionsInDoc of memtionDoc.backmentions) {
                    await this.fillContent(memtionsInDoc, allRefs);
                }
            }
        }
        const div = document.createElement("div")
        div.innerHTML = [...allRefs.values()].map(i => i.lnk).join("&nbsp;&nbsp;");
        this.container.insertAdjacentElement("beforebegin", div)
        this.container.insertAdjacentElement("beforebegin", this.hr())
    }
    private async fillContent(backlinksInDoc: Backlink, allRefs: RefCollector) {
        const div = document.createElement("div") as HTMLDivElement;
        div.innerHTML = backlinksInDoc.dom;
        this.setReadonly(div)
        this.container.appendChild(this.path2div(backlinksInDoc.blockPaths))
        this.container.appendChild(div)
        this.container.appendChild(this.hr())
        this.scanAllRef(allRefs, div)
    }

    private path2div(blockPaths: BlockPath[]) {
        const div = document.createElement("div") as HTMLDivElement
        const refList = [];
        for (const refs of blockPaths) {
            if (refs.type == "NodeHeading" || refs.type == "NodeDocument") {
                refList.push(this.refTag(refs.id, refs.name));
            } else {
                refList.push(this.refTag(refs.id, refs.name, 10));
            }
        }
        div.innerHTML = refList.join(" ➡ ")
        return div
    }

    private refTag(id: string, text: string, len?: number): any {
        if (len) {
            return `<span data-type="block-ref" data-subtype="d" data-id="${id}">${text.slice(0, len)}</span>`
        } else {
            return `<span data-type="block-ref" data-subtype="d" data-id="${id}">${text}</span>`;
        }
    }

    private scanAllRef(allRefs: RefCollector, div: HTMLDivElement) {
        for (const element of div.querySelectorAll(`[${DATA_TYPE}="block-ref"]`)) {
            const id = element.getAttribute(DATA_ID);
            const txt = element.textContent;
            if (txt != "*" && id != this.docID) {
                const key = id + txt;
                const c = (allRefs.get(key)?.count ?? 0) + 1;
                const spanStr = this.refTag(id, `${txt}(${c})`);
                allRefs.set(key, {
                    count: c,
                    lnk: spanStr, // `<p>${spanStr}</p>`,
                });
            }
        }
    }
}

class BackLinkBottomBox {
    private plugin: Plugin;
    private static readonly GLOBAL_THIS: Record<string, any> = globalThis;

    onload(plugin: Plugin) {
        BackLinkBottomBox.GLOBAL_THIS[TOMATO] = { BKMaker, "tomato": this };
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "bottombacklink",
            hotkey: "",
            callback: async () => {
                await this.doTheWork(events.docID);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.bottombacklink.split("#")[0],
                icon: "iconLink",
                click: async () => {
                    const docID = detail?.protyle?.block.rootID ?? "";
                    await this.doTheWork(docID);
                },
            });
        });
    }

    async doTheWork(docID: string) {
        if (docID) {
            await siyuan.pushMsg("正在刷新底部反链区");
            const lastID = await this.getLastBlockID(docID);
            const jsCode = `{{//!js_esc_newline_
            async function execEmbeddedJs() {
                (new ${TOMATO}.BKMaker(protyle, item, top)).doTheWork()
            }
            return execEmbeddedJs()}}`;
            await this.insertMd(jsCode.replace(new RegExp("\\n\\s+", "g"), " "), lastID);
        }
    }

    private async insertMd(md: string, lastID: string) {
        md += "\n";
        md += `{: ${TOMATOBACKLINKKEY}="1"}`;
        if (lastID) {
            await siyuan.insertBlockAfter(md, lastID);
        } else {
            await siyuan.insertBlockAsChildOf(md, lastID);
        }
    }

    async getLastBlockID(docID: string) {
        const idtypes = await siyuan.getChildBlocks(docID);
        idtypes.reverse();
        for (const idtype of idtypes) {
            const row = await siyuan.sqlOne(`select ial from blocks where id="${idtype.id}"`);
            const ial: string = row?.ial ?? "";
            if (!ial.includes(TOMATOBACKLINKKEY)) {
                return idtype.id;
            }
        }
        return "";
    }

}

export const backLinkBottomBox = new BackLinkBottomBox();

// async rmbacklink(docID: string) {
//     const rows = await siyuan.sql(`select id from blocks where ial like '%${TOMATOBACKLINKKEY}%' and root_id="${docID}"`);
//     for (const row of rows) {
//         await siyuan.safeDeleteBlock(row["id"]);
//     }
// }
// btnRefresh(docID: string,) {
//     const btnID = newID().slice(0, IDLen);
//     return `<div>
//         ${styleColor("var(--b3-card-success-background)", "var(--b3-card-success-color)")}
//         <div>
//             <button title="😋是的，就是刷新底部反链区！" onclick="${btnID}()" id="btn${btnID}">🔄</button>
//         </div>
//         <script>
//             function ${btnID}() {
//                 globalThis.${TOMATO}.doTheWork("${docID}" )
//             }
//         </script>
//     </div>`;
// }
// private keepPath2Root(div: HTMLDivElement) {
//     if (!div) return;
//     for (const child of div.parentElement?.childNodes ?? []) {
//         if (child.nodeType === 1) {
//             const subDiv = child as HTMLElement;
//             const id = subDiv.getAttribute(DATA_NODE_ID);
//             if (id == div.getAttribute(DATA_NODE_ID)) continue;
//             for (const cls of subDiv.classList) {
//                 if (cls.startsWith("protyle-")) continue;
//             }
//             div.parentElement?.removeChild(subDiv);
//         }
//     }
//     this.keepPath2Root(div.parentElement as HTMLDivElement);
// }

// private removeDataNodeIdRecursively(element: HTMLElement) {
//     element.removeAttribute("data-node-id");
//     const childElements = element.children;
//     for (let i = 0; i < childElements.length; i++) {
//         const childElement = childElements[i] as HTMLElement;
//         this.removeDataNodeIdRecursively(childElement);
//     }
// }



