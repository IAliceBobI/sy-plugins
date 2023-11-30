<script lang="ts">
    import { adaptHotkey } from "siyuan";
    import { onMount } from "svelte";
    import { siyuan } from "./utils";
    import { events, EventType } from "./Events";

    let backlinks: { id: string; content: string }[] = [];

    onMount(async () => {
        events.addListener("BackLinkBox", onPortyleChange);
    });

    async function onPortyleChange(eventType: string, detail: any) {
        if (eventType == EventType.switch_protyle) {
            const docID = detail?.protyle?.block.rootID ?? "";
            if (docID) await getBackLinks(docID);
        }
    }

    async function getBackLinks(docID: string) {
        backlinks = [];
        const bls = await siyuan.getBacklink2(docID);
        for (const d of bls.backlinks) {
            const bdocs = await siyuan.getBacklinkDoc(docID, d.id);
            for (const doc of bdocs.backlinks) {
                for (const p of doc.blockPaths) {
                    if (p.type == "NodeParagraph") {
                        const { content } =
                            await siyuan.getBlockMarkdownAndContent(p.id);
                        backlinks = [...backlinks, { id: p.id, content }];
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
        反链
        <div class="fn__hr"></div>
        {#each backlinks as link}
            <a href="siyuan://blocks/{link.id}"
                ><span class="id">{link.content}</span></a
            >
            <div class="fn__hr"></div>
        {/each}
        <div class="fn__hr"></div>
        提及
    </div>
</div>

<style>
    .id {
        background: #e3d8d8;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: x-large;
    }
</style>
