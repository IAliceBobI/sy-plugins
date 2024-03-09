import { IProtyle, Lute, Plugin, openTab } from "siyuan";
import { NewLute, NewNodeID, dom2div, getBlockDiv, getID, get_siyuan_lnk_md, siyuan, siyuanCache, sleep, timeUtil } from "@/libs/utils";
import "./index.scss";
import { events } from "@/libs/Events";
import { DATA_NODE_ID, READINGPOINT } from "./libs/gconst";
import { zip2ways } from "./libs/functional";
import { AttrBuilder } from "./libs/listUtils";
import { getBookID } from "./libs/progressive";

const CreateDocLock = "CreateDocLock";
const AddReadingPointLock = "AddReadingPointLock";

class ReadingPointBox {
    private plugin: Plugin;
    private lute: Lute = NewLute();

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "addBookmark",
            hotkey: "⌘2",
            editorCallback: async (protyle: IProtyle) => {
                const { selected, ids } = await events.selectedDivs(protyle);
                for (const [div, id] of zip2ways(selected, ids)) {
                    this.addReadPointLock(id, div);
                    break;
                }
            },
        });
        this.plugin.addCommand({
            langKey: "addBookmarkWithoutENV",
            hotkey: "⌘7",
            editorCallback: async (protyle: IProtyle) => {
                const { selected, ids } = await events.selectedDivs(protyle);
                for (const [div, id] of zip2ways(selected, ids)) {
                    this.addReadPointLock(id, div, true);
                    break;
                }
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.addBookmark,
                icon: "iconBookmark",
                accelerator: "⌘2",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    if (blockID) {
                        this.addReadPointLock(blockID, detail?.element);
                    }
                },
            });
            menu.addItem({
                label: this.plugin.i18n.addBookmarkWithoutENV,
                icon: "iconBookmark",
                accelerator: "⌘7",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    if (blockID) {
                        this.addReadPointLock(blockID, detail?.element, true);
                    }
                },
            });
            menu.addItem({
                label: this.plugin.i18n.showBookmarks,
                icon: "iconBookmark",
                click: async () => {
                    await this.showContentsWithLock();
                    if (events.isMobile) {
                        await siyuan.pushMsg("请打开文档树查看。");
                    }
                },
            });
        });
        this.plugin.addCommand({
            langKey: "showBookmarks",
            hotkey: "⌘4",
            callback: async () => {
                await this.showContentsWithLock();
            },
        });
        if (!events.isMobile) {
            this.plugin.addTopBar({
                icon: "iconBookmark",
                title: this.plugin.i18n.topBarTitleShowContents,
                position: "right",
                callback: async () => {
                    await this.showContentsWithLock();
                }
            });
        }
    }

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "🔖",
            label: this.plugin.i18n.addBookmark,
            accelerator: "⌘2",
            click: () => {
                for (const element of detail.blockElements) {
                    const blockID = getID(element);
                    if (blockID) {
                        this.addReadPointLock(blockID, element);
                        break;
                    }
                }
            }
        });
        detail.menu.addItem({
            iconHTML: "🔖",
            label: this.plugin.i18n.addBookmarkWithoutENV,
            accelerator: "⌘7",
            click: () => {
                for (const element of detail.blockElements) {
                    const blockID = getID(element);
                    if (blockID) {
                        this.addReadPointLock(blockID, element, true);
                        break;
                    }
                }
            }
        });
    }

    private addReadPointLock(blockID: string, div: HTMLElement, withoutENV = false) {
        navigator.locks.request(AddReadingPointLock, { ifAvailable: true }, async (lock) => {
            if (lock) {
                await this.addReadPoint(blockID, div, withoutENV);
                await sleep(2000);
            } else {
                siyuan.pushMsg(this.plugin.i18n.wait4finish);
            }
        });
    }

    private async insertContents(boxID: string, docID: string) {
        const resp = await siyuan.listDocsByPath(boxID, "/", 256);
        resp.files.reverse();
        for (const file of resp.files) {
            const fromWhere = `from blocks 
                where path like '${file.path.replace(/\.sy$/, "")}%' 
                and box='${boxID}' 
                and ial like '%bookmark=%'
                and ial not like '%bookmark="🛑 Suspended Cards"%'
            `.replace(/\n/g, " ");
            const rows = await siyuan.sql(`select id ${fromWhere} limit 1`);
            if (rows.length > 0) {
                const sqlStr = `select * ${fromWhere} order by updated desc`;
                await siyuan.insertBlockAsChildOf(`{{${sqlStr}}}`, docID);
                await siyuan.insertBlockAsChildOf(`###### ${file.name.replace(/\.sy$/, "")}`, docID);
            }
        }
    }

    private async showContentsWithLock() {
        navigator.locks.request(CreateDocLock, { ifAvailable: true }, async (lock) => {
            if (lock) {
                await this.showContents();
            }
        });
    }

    private async showContents() {
        let boxID = events.boxID;
        if (!boxID) {
            const localCfg = await siyuan.getFile("/data/storage/local.json");
            boxID = localCfg["local-dailynoteid"] ?? "";
        }
        if (!boxID) {
            await siyuan.pushMsg("请先打开笔记本");
            return;
        }
        const cfg = await siyuan.getNotebookConf(boxID);
        if (cfg.conf.closed) {
            await siyuan.pushMsg("请先打开笔记本");
            return;
        }
        const sqlStr = `select id from blocks where box='${boxID}' and ial like '%bookmark=%' limit 1`;
        const rows = await siyuan.sql(sqlStr);
        if (rows.length > 0) {
            const docID = await siyuanCache.createDocWithMdIfNotExists(5000, boxID, "/📚" + cfg.name, "");
            await siyuan.clearAll(docID);
            await this.insertContents(boxID, docID);
            openTab({
                app: this.plugin.app,
                doc: { id: docID },
            });
        } else {
            try {
                siyuan.pushMsg(cfg.name + this.plugin.i18n.thereIsNoBookmark);
            } catch (e) {
                console.log(e);
            }
        }
    }

    private async addReadPoint(blockID: string, div: HTMLElement, withoutENV = false) {
        if (!blockID) blockID = events.lastBlockID;
        if (!blockID) {
            siyuan.pushMsg(this.plugin.i18n.clickOneBlockFirst);
            return;
        }
        const docID = await siyuan.getDocIDByBlockID(blockID);

        const docInfo = await siyuan.getRowByID(docID);
        if (!docInfo["hpath"]) return;
        const path: Array<string> = docInfo["hpath"].split("/");
        path.pop();
        let title = path[path.length - 1];
        if (title === "") {
            const boxConf = await siyuan.getNotebookConf(docInfo["box"]);
            title = boxConf["name"];
        }

        let { bookID } = await getBookID(docID);
        if (!bookID) bookID = docID;
        const oldIDs = await findAllReadingPoints(bookID) ?? [];
        await addCardReadingPoint(this.lute, blockID, div, docInfo, title, bookID, oldIDs, withoutENV);
    }
}

export const readingPointBox = new ReadingPointBox();

async function findAllReadingPoints(bookID: string) {
    const rows = await siyuan.sqlAttr(`select block_id from attributes where name="${READINGPOINT}" and value="${bookID}"`);
    const ids = rows.map(r => r.block_id);
    return ids;
}

async function addCardReadingPoint(lute: Lute, blockID: string, div: HTMLElement, docInfo: Block, title: string, bookID: string, oldIDs: string[], withoutENV = false) {
    const md = [];
    md.push(`* 阅读点：${get_siyuan_lnk_md(blockID, docInfo.content)}`);
    md.push(`* ${div.textContent}`);
    if (!withoutENV) {
        const docIDs = [...document.body.querySelectorAll("div.protyle-title.protyle-wysiwyg--attr")].map(e => e.getAttribute(DATA_NODE_ID));
        [...document.body.querySelectorAll("li[data-initdata]")].forEach(e => {
            const d = e.getAttribute("data-initdata");
            const title = e.querySelector(".item__text")?.textContent;
            const j: DocTabInitData = JSON.parse(d);
            if (d && j) {
                docIDs.push(j.rootId);
                events.readingPointMap.set(j.rootId, {
                    docID: j.rootId, blockID: j.blockId, title, time: new Date(),
                });
            }
        });
        for (const docIDInPage of docIDs) {
            if (docInfo.id == docIDInPage) continue;
            const doc = events.readingPointMap.get(docIDInPage);
            let bID = doc.blockID;
            if (bID) {
                const docIDQuery = await siyuan.getDocIDByBlockID(bID);
                if (docIDQuery != docIDInPage) bID = "";
            }
            if (doc) {
                let cursor = "";
                if (bID) {
                    cursor = `::${get_siyuan_lnk_md(bID, "[[光标]]")}`;
                }
                md.push(`* ${get_siyuan_lnk_md(doc.docID, doc.title ?? "[[文档]]")}${cursor}`);
            }
        }
    }

    if (oldIDs && oldIDs.length > 0) {
        const id = oldIDs.pop();
        const domStr = await getDomStr(id, lute, md);
        const ops = siyuan.transDeleteBlocks(oldIDs);
        ops.push(...siyuan.transMoveBlocksAfter([id], blockID));
        ops.push(...siyuan.transUpdateBlocks([{ id, domStr }]));
        await siyuan.transactions(ops);
        await siyuan.removeRiffCards(oldIDs);
        await siyuan.addRiffCards([id]);
        // Rating 描述了闪卡复习的评分。
        // type Rating int8
        // const (
        //     Again Rating = iota + 1 // 完全不会，必须再复习一遍
        //     Hard                    // 有点难
        //     Good                    // 一般
        //     Easy                    // 很容易
        // )
        await siyuan.reviewRiffCardByBlockID(id, 2);
        events.protyleReload();
        const due = timeUtil.getYYYYMMDDHHmmssPlus0(timeUtil.nowts());
        await siyuan.batchSetRiffCardsDueTimeByBlockID([{ id, due }]);
    } else {
        const id = NewNodeID();
        md.push(new AttrBuilder(id)
            .add("bookmark", title)
            .add(READINGPOINT, bookID)
            .build());
        await siyuan.insertBlockAfter(md.join("\n"), blockID);
        setTimeout(() => {
            siyuan.addRiffCards([id]);
        }, 800);
    }
}

async function getDomStr(id: string, lute: Lute, md: string[]) {
    const { div: oldDiv } = await getBlockDiv(id);
    const domStr = lute.Md2BlockDOM(md.join("\n"));
    const div = dom2div(domStr);
    oldDiv.getAttributeNames().forEach(name => {
        div.setAttribute(name, oldDiv.getAttribute(name));
    });
    return div.outerHTML;
}

