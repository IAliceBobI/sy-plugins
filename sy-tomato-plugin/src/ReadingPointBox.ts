import { Plugin, openTab } from "siyuan";
import { siyuan, sleep } from "@/libs/utils";
import "./index.scss";
import { events } from "@/libs/Events";

const CreateDocLock = "CreateDocLock";
const AddReadingPointLock = "AddReadingPointLock";

class ReadingPointBox {
    private plugin: Plugin;

    onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "addBookmark",
            hotkey: "⌘2",
            globalCallback: async () => {
                this.addReadPointLock();
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.addBookmark,
                icon: "iconBookmark",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    if (blockID) {
                        this.addReadPointLock(blockID);
                    }
                },
            });
        });
        this.plugin.addCommand({
            langKey: "showBookmarks",
            hotkey: "⌘4",
            globalCallback: async () => {
                await this.showContentsWithLock();
            },
        });
        this.plugin.addTopBar({
            icon: "iconContents",
            title: this.plugin.i18n.topBarTitleShowContents,
            position: "right",
            callback: async () => {
                await this.showContentsWithLock();
            }
        });
    }

    private addReadPointLock(blockID?: string) {
        navigator.locks.request(AddReadingPointLock, { ifAvailable: true }, async (lock) => {
            if (lock) {
                await this.addReadPoint(blockID);
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
            const fromWhere = `from blocks where path like '${file.path.replace(/\.sy$/, "")}%' and box='${boxID}' and ial like '%bookmark=%'`;
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
                await sleep(4000);
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
            const docID = await siyuan.createDocWithMdIfNotExists(boxID, "/📚" + cfg.name, "");
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

    private async addReadPoint(blockID?: string) {
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
        await siyuan.addBookmark(blockID, title);
        await siyuan.removeBookmarks(docID, blockID);
    }
}

export const readingPointBox = new ReadingPointBox();
