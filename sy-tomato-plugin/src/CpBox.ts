import { Plugin, openTab } from "siyuan";
import { siyuan, sleep } from "./utils";
import "./index.scss";

const LongContentOpsLock = "LongContentOpsLock";

class CpBox {
    private plugin: Plugin;

    onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "deleteBlocks",
            hotkey: "",
            globalCallback: async () => {
                navigator.locks.request(LongContentOpsLock, { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        await this.deleteBlocks();
                    } else {
                        siyuan.pushMsg(this.plugin.i18n.wait4finish);
                    }
                });
            },
        });
        this.plugin.addCommand({
            langKey: "moveBlocks",
            hotkey: "",
            globalCallback: async () => {
                navigator.locks.request(LongContentOpsLock, { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        await this.moveBlocks(false);
                    } else {
                        siyuan.pushMsg(this.plugin.i18n.wait4finish);
                    }
                });
            },
        });
        this.plugin.addCommand({
            langKey: "copyBlocks",
            hotkey: "",
            globalCallback: async () => {
                navigator.locks.request(LongContentOpsLock, { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        await this.moveBlocks(true);
                    } else {
                        siyuan.pushMsg(this.plugin.i18n.wait4finish);
                    }
                });
            },
        });
    }

    private async deleteBlocks() {
        const docID = await siyuan.deleteBlocks();
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
        const [doc1, doc2] = await siyuan.moveBlocks(ops);
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
