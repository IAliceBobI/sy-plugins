import { Lute, Plugin } from "siyuan";
import { NewLute, chunks, newID, siyuan, styleColor } from "./libs/utils";
import { DATA_ID, DATA_NODE_ID, DATA_TYPE, IDLen } from "./libs/gconst";
import { TOMATOBACKLINKKEY } from "./constants";
import { events } from "./libs/Events";

type RefCollector = Map<string, { lnk: string, count: number }>;

class BackLinkBottomBox {
    private plugin: Plugin;
    private static readonly GLOBAL_THIS: Record<string, any> = globalThis;

    onload(plugin: Plugin) {
        BackLinkBottomBox.GLOBAL_THIS["tomato_zZmqus5PtYRi"] = this;
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "bottombacklink",
            hotkey: "",
            callback: async () => {
                await this.doTheWork(events.docID);
            },
        });
        this.plugin.addCommand({
            langKey: "bottombacklinkEmb",
            hotkey: "",
            callback: async () => {
                await this.doTheWork(events.docID, true);
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
            menu.addItem({
                label: this.plugin.i18n.bottombacklinkEmb.split("#")[0],
                icon: "iconLink",
                click: async () => {
                    const docID = detail?.protyle?.block.rootID ?? "";
                    await this.doTheWork(docID, true);
                },
            });
        });
    }

    async doTheWork(docID: string, isEmb = false) {
        if (docID) {
            await siyuan.pushMsg("正在刷新底部反链区");
            const lastID = await this.getLastBlockID(docID);
            await this.rmbacklink(docID);
            await this.getBackLinks(docID, lastID, isEmb);
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

    async getBackLinks(docID: string, lastID: string, isEmb = false) {
        const lute = NewLute();
        const allRefs: RefCollector = new Map();
        const backlink2 = await siyuan.getBacklink2(docID);
        {
            let shouldInsertSplit = false;
            for (const memtion of backlink2.backmentions.reverse()) {
                const memtionDoc = await siyuan.getBackmentionDoc(docID, memtion.id);
                for (const bkPath of memtionDoc.backmentions) {
                    shouldInsertSplit = await this.embedDom(docID, bkPath, lastID, lute, isEmb, allRefs);
                }
            }
            if (shouldInsertSplit) await this.insertMd("---", lastID);
        }
        {
            let shouldInsertSplit = false;
            for (const backlink of backlink2.backlinks.reverse()) {
                const backlinkDoc = await siyuan.getBacklinkDoc(docID, backlink.id);
                for (const bkPath of backlinkDoc.backlinks.reverse()) {
                    shouldInsertSplit = await this.embedDom(docID, bkPath, lastID, lute, isEmb, allRefs);
                }
            }
            if (shouldInsertSplit) await this.insertMd("---", lastID);
        }
        if (allRefs.size > 0) {
            const lnks = [...allRefs.values()].map(i => i.lnk);
            lnks.splice(0, 0, this.btnRefresh(docID, isEmb));
            for (const piece of chunks(lnks, 4)) {
                let md = "{{{col\n\n";
                md += piece.join("\n\n");
                md += "\n\n}}}";
                await this.insertMd(md, lastID);
            }
            await this.insertMd("---", lastID);
        }
    }

    btnRefresh(docID: string, isEmb: boolean) {
        const btnID = newID().slice(0, IDLen);
        return `<div>
            ${styleColor("var(--b3-card-success-background)", "var(--b3-card-success-color)")}
            <div>
                <button title="😋是的，就是刷新底部反链区！" onclick="${btnID}()" id="btn${btnID}">🔄</button>
            </div>
            <script>
                function ${btnID}() {
                    globalThis.tomato_zZmqus5PtYRi.doTheWork("${docID}",${isEmb})
                }
            </script>
        </div>`;
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

    private async embedDom(docID: string, bkPath: Backlink, lastID: string, lute: Lute, isEmb: boolean, allRefs: RefCollector) {
        if (!bkPath) return;
        const div = document.createElement("div") as HTMLDivElement;
        div.innerHTML = bkPath.dom;
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
                const md = lute.BlockDOM2Md(div.innerHTML);
                await this.insertMd(md, lastID);
                if (isEmb) {
                    await this.insertMd(`{{select * from blocks where id="${blockID}"}}`, lastID);
                } else {
                    await this.insertPath(bkPath, lastID);
                }
                return true;
            }
        }
        this.scanAllRef(docID, allRefs, div);
        if (isEmb) {
            await this.insertMd(`{{select * from blocks where id="${blockID}"}}`, lastID);
        } else {
            this.removeDataNodeIdRecursively(div);
            div.firstElementChild.setAttribute(TOMATOBACKLINKKEY, "1");
            const md = lute.BlockDOM2Md(div.innerHTML);
            await this.insertMd(md, lastID);
            await this.insertPath(bkPath, lastID);
        }
        return true;
    }

    private async insertPath(bkPath: Backlink, lastID: string) {
        const refList = [];
        for (const refs of bkPath.blockPaths) {
            if (refs.type == "NodeHeading" || refs.type == "NodeDocument") {
                refList.push(`((${refs.id} "[${refs.name}]"))`);
            } else {
                refList.push(`((${refs.id} "[${refs.name.slice(0, 10)}...]"))`);
            }
        }
        await this.insertMd(refList.join(" -> "), lastID);
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

