import { IProtyle, Lute, Plugin } from "siyuan";
import { NewLute, chunks, siyuan } from "./libs/utils";
import { DATA_ID, DATA_NODE_ID, DATA_TYPE } from "./libs/gconst";
import { TOMATOBACKLINKKEY } from "./constants";
import { events } from "./libs/Events";

type RefCollector = Map<string, { lnk: string, count: number }>;
const TOMATO = "tomato_zZmqus5PtYRi"

interface IBackLinkBottomBox {

}

class BKMaker {
    protyle: IProtyle
    item: HTMLElement
    top: number
    lastID: string
    docID: string
    itemID: string
    bottomBox: IBackLinkBottomBox
    lute: Lute;
    container: HTMLDivElement;

    constructor(protyle: IProtyle, item: HTMLElement, top: number, lastID: string) {
        this.protyle = protyle;
        this.item = item;
        this.top = top;
        this.bottomBox = globalThis.tomato_zZmqus5PtYRi.tomato;
        this.lute = NewLute();
        this.container = document.createElement("div");
        this.lastID = lastID;
        this.docID = protyle?.block.rootID ?? "";
        this.itemID = item.getAttribute(DATA_NODE_ID);
    }

    async doTheWork() {
        this.item.querySelector(".fn__rotate")?.classList.remove("fn__rotate");
        this.getBackLinks()
        this.item.lastElementChild.insertAdjacentElement("afterend", this.container);
        this.item.style.height = "";
    }

    private async getBackLinks() {
        const docID = this.item.getAttribute(DATA_NODE_ID);
        const allRefs: RefCollector = new Map();
        const backlink2 = await siyuan.getBacklink2(docID);
        const hr = document.createElement("hr")
        const test = document.createElement("p")
        test.innerHTML = "asddfasdfasdfdasasdf"
        {
            let shouldInsertSplit = false;
            for (const backlink of backlink2.backlinks.reverse()) {
                const backlinkDoc = await siyuan.getBacklinkDoc(docID, backlink.id);
                for (const backlinksInDoc of backlinkDoc.backlinks.reverse()) {
                    shouldInsertSplit = await this.embedDom(backlinksInDoc, allRefs);
                }
            }
            if (shouldInsertSplit) {
                this.container.appendChild(hr)
                this.container.appendChild(hr)
            }
            this.container.appendChild(test)
        }
        {
            // let shouldInsertSplit = false;
            // for (const memtion of backlink2.backmentions.slice(0, 2).reverse()) {
            //     const memtionDoc = await siyuan.getBackmentionDoc(docID, memtion.id);
            //     for (const memtionsInDoc of memtionDoc.backmentions) {
            //         shouldInsertSplit = await this.embedDom(docID, memtionsInDoc, lastID, allRefs);
            //     }
            // }
            // if (shouldInsertSplit) await this.insertMd("---", lastID);
        }
    }
    private async embedDom(backlinksInDoc: Backlink, allRefs: RefCollector) {

        return true;
    }
}

class BackLinkBottomBox implements IBackLinkBottomBox {
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
            await this.rmbacklink(docID);
            const jsCode = `{{//!js_esc_newline_
            async function execEmbeddedJs() {
                const mk = new ${TOMATO}.BKMaker(protyle, item, top, "${lastID}");
                mk.doTheWork();
            }
            return execEmbeddedJs();}}`;
            await this.insertMd(jsCode.replace(new RegExp("\\n", "g"), ""), lastID);
        }
    }

    async rmbacklink(docID: string) {
        const rows = await siyuan.sql(`select id from blocks where ial like '%${TOMATOBACKLINKKEY}%' and root_id="${docID}"`);
        for (const row of rows) {
            await siyuan.safeDeleteBlock(row["id"]);
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

    async getBackLinks(docID: string, lastID: string) {
        const allRefs: RefCollector = new Map();
        const backlink2 = await siyuan.getBacklink2(docID);
        {
            // let shouldInsertSplit = false;
            // for (const memtion of backlink2.backmentions.slice(0, 2).reverse()) {
            //     const memtionDoc = await siyuan.getBackmentionDoc(docID, memtion.id);
            //     for (const memtionsInDoc of memtionDoc.backmentions) {
            //         shouldInsertSplit = await this.embedDom(docID, memtionsInDoc, lastID, allRefs);
            //     }
            // }
            // if (shouldInsertSplit) await this.insertMd("---", lastID);
        }
        {
            let shouldInsertSplit = false;
            for (const backlink of backlink2.backlinks.reverse()) {
                const backlinkDoc = await siyuan.getBacklinkDoc(docID, backlink.id);
                for (const backlinksInDoc of backlinkDoc.backlinks.reverse()) {
                    shouldInsertSplit = await this.embedDom(docID, backlinksInDoc, lastID, allRefs);
                }
            }
            if (shouldInsertSplit) await this.insertMd("---", lastID);
        }
        if (allRefs.size > 0) {
            const lnks = [...allRefs.values()].map(i => i.lnk);
            lnks.splice(0, 0, this.btnRefresh(docID));
            for (const piece of chunks(lnks, 4).reverse()) {
                let md = "{{{col\n\n";
                md += piece.join("\n\n");
                md += "\n\n}}}";
                await this.insertMd(md, lastID);
            }
            await this.insertMd("---", lastID);
        }
    }

    private scanAllRef(docID: string, allRefs: RefCollector, div: HTMLDivElement) {
        for (const element of div.querySelectorAll(`[${DATA_TYPE}="block-ref"]`)) {
            const id = element.getAttribute(DATA_ID);
            const txt = element.textContent;
            if (txt != "*" && id != docID) {
                const key = id + txt;
                const c = (allRefs.get(key)?.count ?? 0) + 1;
                allRefs.set(key, {
                    count: c,
                    lnk: `((${id} "[[${txt}]]${c}"))`,
                });
            }
        }
    }

    private async embedDom(docID: string, linksInDoc: Backlink, lastID: string, allRefs: RefCollector) {
        if (!linksInDoc) return;
        const div = document.createElement("div") as HTMLDivElement;
        div.innerHTML = linksInDoc.dom;
        if (div.firstElementChild.getAttribute(TOMATOBACKLINKKEY)) {
            return;
        }
        await this.insertMd("---", lastID);
        const blockID = div.firstElementChild.getAttribute(DATA_NODE_ID);
        const data_type: BlockNodeType = div.firstElementChild.getAttribute(DATA_TYPE) as BlockNodeType;
        if (data_type == "NodeListItem") {
            const [listID] = await siyuan.findListType(blockID);
            if (listID && listID != blockID) {
                const { dom } = await siyuan.getBlockDOM(listID);
                div.innerHTML = dom;
                this.scanAllRef(docID, allRefs, div);
                const startDiv = div.querySelector(`[data-node-id="${blockID}"]`) as HTMLDivElement;
                this.keepPath2Root(startDiv);
                this.removeDataNodeIdRecursively(div);
                div.firstElementChild.setAttribute(TOMATOBACKLINKKEY, "1");
                div.setAttribute("contenteditable", "false");
                this.div = div;
                // args: fetchSyncPost,item,protyle,top
                const jsCode = `{{//!js_esc_newline_
                    async function execEmbeddedJs() {
                        const div = document.createElement("div");
                        globalThis.${TOMATO}.setInnerHTML(div);
                        item.lastElementChild.insertAdjacentElement("afterend", div.firstElementChild);
                        item.style.height = "";
                        item.querySelector(".fn__rotate")?.classList.remove("fn__rotate");
                    }
                    return execEmbeddedJs();}}`;
                await this.insertMd(jsCode.replace(new RegExp("\\n", "g"), ""), lastID);
                return true;
            }
        }
        this.scanAllRef(docID, allRefs, div);
        await this.insertMd(`{{select * from blocks where id="${blockID}"}}`, lastID);
        return true;
    }

    private keepPath2Root(div: HTMLDivElement) {
        if (!div) return;
        for (const child of div.parentElement?.childNodes ?? []) {
            if (child.nodeType === 1) {
                const subDiv = child as HTMLElement;
                const id = subDiv.getAttribute(DATA_NODE_ID);
                if (id == div.getAttribute(DATA_NODE_ID)) continue;
                for (const cls of subDiv.classList) {
                    if (cls.startsWith("protyle-")) continue;
                }
                div.parentElement?.removeChild(subDiv);
            }
        }
        this.keepPath2Root(div.parentElement as HTMLDivElement);
    }

    private removeDataNodeIdRecursively(element: HTMLElement) {
        element.removeAttribute("data-node-id");
        const childElements = element.children;
        for (let i = 0; i < childElements.length; i++) {
            const childElement = childElements[i] as HTMLElement;
            this.removeDataNodeIdRecursively(childElement);
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
}

export const backLinkBottomBox = new BackLinkBottomBox();

// private async insertPath(bkPath: Backlink, lastID: string) {
//     const refList = [];
//     for (const refs of bkPath.blockPaths) {
//         if (refs.type == "NodeHeading" || refs.type == "NodeDocument") {
//             refList.push(`((${refs.id} "[${refs.name}]"))`);
//         } else {
//             refList.push(`((${refs.id} "[${refs.name.slice(0, 10)}...]"))`);
//         }
//     }
//     await this.insertMd(refList.join(" -> "), lastID);
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