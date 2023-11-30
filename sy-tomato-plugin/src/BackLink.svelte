<script lang="ts">
    import { App, Plugin, Protyle, Dialog, adaptHotkey } from "siyuan";
    import { onDestroy, onMount } from "svelte";
    import { siyuan, timeUtil } from "./utils";
    import { events } from "./Events";

    export let plugin: Plugin;

    let datetimeStr: string = "init...";
    let docID: string = "init...";

    onMount(async () => {
        datetimeStr = await siyuan.currentTime();
        events.addListener("BackLinkBox", onPortyleChange);
    });

    onDestroy(() => {
        // protyle.destroy();
    });

    async function onPortyleChange(eventType: string, protyle: Protyle) {
        
        // console.log(`protyle?.protyle?.block?.rootID: ${protyle?.protyle?.block?.rootID}`)
        // console.log(`protyle?.protyle?.id: ${protyle?.protyle?.id}`)
        // console.log(`protyle?.protyle?.block: ${protyle?.protyle?.block}`)
        console.log(eventType, protyle);
    }

    async function getBackLinks() {
        const blockID = events.lastBlockID;
        // const lute = NewLute();
        const row = await siyuan.sqlOne(
            `select root_id from blocks where id="${blockID}"`,
        );
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
                        const { content } =
                            await siyuan.getBlockMarkdownAndContent(p.id);
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
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="fn__flex-1 fn__flex-column">
    <div class="block__icons">
        <div class="block__logo">
            <svg><use xlink:href="#iconEmoji"></use></svg>
            极简反链
        </div>
        <span class="fn__flex-1 fn__space"></span>
        <span
            data-type="min"
            class="block__icon b3-tooltips b3-tooltips__sw"
            aria-label="Min {adaptHotkey('⌘W')}"
            ><svg><use xlink:href="#iconMin"></use></svg></span
        >
    </div>
    <div class="fn__flex-1 plugin-sample__custom-dock">
        {datetimeStr}<br />
        {docID}
    </div>
</div>
