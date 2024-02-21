import { Plugin, openTab } from "siyuan";
import { siyuan, sleep } from "@/libs/utils";
import "./index.scss";

const LongContentOpsLock = "LongContentOpsLock";

class CpBox {
    private plugin: Plugin;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "deleteBlocks",
            hotkey: "",
            callback: async () => {
                navigator.locks.request(LongContentOpsLock, { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        await this.deleteBlocks();
                        siyuan.pushMsg("批量操作完成，如页面不正确，请F5刷新。");
                    } else {
                        siyuan.pushMsg(this.plugin.i18n.wait4finish);
                    }
                });
            },
        });
        this.plugin.addCommand({
            langKey: "moveBlocks",
            hotkey: "",
            callback: async () => {
                navigator.locks.request(LongContentOpsLock, { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        await this.moveBlocks(false);
                        siyuan.pushMsg("批量操作完成，如页面不正确，请F5刷新。");
                    } else {
                        siyuan.pushMsg(this.plugin.i18n.wait4finish);
                    }
                });
            },
        });
        this.plugin.addCommand({
            langKey: "copyBlocks",
            hotkey: "",
            callback: async () => {
                navigator.locks.request(LongContentOpsLock, { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        await this.moveBlocks(true);
                        siyuan.pushMsg("批量操作完成，如页面不正确，请F5刷新。");
                    } else {
                        siyuan.pushMsg(this.plugin.i18n.wait4finish);
                    }
                });
            },
        });
    }

    private async deleteBlocks() {
        await siyuan.pushMsg("批量删除：正在检查数据……");
        const docID = await siyuan.deleteBlocksUtil();
        if (docID) {
            openTab({
                app: this.plugin.app,
                doc: { id: docID },
            });
            await sleep(4000);
        } else {
            siyuan.pushMsg(this.plugin.i18n.deleteBlocksHelp, 0);
        }
    }

    private async moveBlocks(ops: boolean) {
        await siyuan.pushMsg("批量复制/移动：正在检查数据……");
        const [doc1, doc2] = await siyuan.moveBlocksUtil(ops);
        if (doc1) {
            openTab({
                app: this.plugin.app,
                doc: { id: doc1 },
            });
            if (doc1 !== doc2) {
                openTab({
                    app: this.plugin.app,
                    doc: { id: doc2 },
                });
            }
            await sleep(4000);
        }
        else
            siyuan.pushMsg(this.plugin.i18n.moveBlocksHelp, 0);
    }
}

export const cpBox = new CpBox();
