import { Plugin, adaptHotkey } from "siyuan";
import { newID, siyuan } from "./utils";
import "./index.scss";
import { events } from "./Events";
import BackLinkView from "./BackLink.svelte";

const BackLinkBoxLock = "BackLinkBoxLock";
const DOCK_TYPE = "dock_tab";

class BackLinkBox {
    private plugin: Plugin;

    onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "backlink",
            hotkey: "",
            globalCallback: async () => {
                navigator.locks.request(BackLinkBoxLock, { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        await this.getBackLinks();
                    } else {
                        siyuan.pushMsg(this.plugin.i18n.wait4finish);
                    }
                });
            },
        });
        this.plugin.addDock({
            config: {
                position: "RightBottom",
                size: { width: 320, height: 0 },
                icon: "iconLink2",
                title: "极简反链",
            },
            data: {},
            type: DOCK_TYPE,
            init() {
                new BackLinkView({
                    target:  this.element,
                    props: {
                        backlinkBox: this,
                    }
                });
            }
        });
    }

    private async getBackLinks() {
        const blockID = events.lastBlockID;
        // const lute = NewLute();
        const row = await siyuan.sqlOne(`select root_id from blocks where id="${blockID}"`);
        const docID = row?.root_id ?? "";
        if (!docID) {
            console.log("blockID, docID", blockID, docID);
            return;
        }
        const bls = await siyuan.getBacklink2(docID);
        for (const d of bls.backlinks) {
            const bdocs = await siyuan.getBacklinkDoc(docID, d.id);
            for (const doc of bdocs.backlinks) {
                for (const p of doc.blockPaths) {
                    if (p.type == "NodeParagraph") {
                        const { content } = await siyuan.getBlockMarkdownAndContent(p.id);
                        console.log(p.id, content);
                    }
                }
            }
        }
        // for (const d of bls.backmentions) {
        //     const bmdocs = await siyuan.getBackmentionDoc(docID, d.id);
        //     for (const doc of bmdocs.backmentions) {
        //         for (const p of doc.blockPaths) {
        //             if (p.type == "NodeParagraph") {
        //                 console.log(p.name)
        //             }
        //         }
        //     }
        // }
    }

}

export const backLinkBox = new BackLinkBox();
