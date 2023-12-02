<script lang="ts">
    import { adaptHotkey, openTab, Plugin, Protyle } from "siyuan";
    import { onMount } from "svelte";
    import { siyuanCache } from "@/libs/utils";
    import { events, EventType } from "@/libs/Events";

    export let plugin: Plugin;

    type LinkType = { id: string; content: string; docName: string };

    const BackLinkBoxSvelteLock = "BackLinkBoxSvelteLock";
    let backlinks: LinkType[] = [];
    let mentionlinks: LinkType[] = [];
    let title: string = "";
    let lastEventID = 0;

    onMount(async () => {
        events.addListener("BackLinkBox", onPortyleChange);
    });

    async function onPortyleChange(eventType: string, detail: Protyle) {
        lastEventID++;
        navigator.locks.request(BackLinkBoxSvelteLock, async (lock) => {
            if (lock) {
                if (
                    eventType == EventType.switch_protyle ||
                    eventType == EventType.loaded_protyle_dynamic ||
                    eventType == EventType.loaded_protyle_static
                ) {
                    title =
                        detail?.protyle?.title?.editElement?.textContent?.trim() ??
                        "";
                    const docID = detail?.protyle?.block.rootID ?? "";
                    if (docID && title) {
                        await getBackLinks(docID, lastEventID);
                    }
                } else if (eventType == EventType.destroy_protyle) {
                    backlinks = mentionlinks = [];
                    title = "";
                }
            }
        });
    }

    function shouldMove(dedup: Set<string>, content: string, docName: string) {
        const key = `${content.trim()}#${docName.trim()}`;
        if (dedup.has(key)) return false;
        dedup.add(key);
        return true;
    }

    async function getBackLinks(docID: string, thisEventID: number) {
        backlinks = [];
        mentionlinks = [];
        const dedup: Set<string> = new Set();

        const bls = await siyuanCache.getBacklink2(30 * 1000, docID);
        for (const d of bls.backlinks) {
            const bdocs = await siyuanCache.getBacklinkDoc(
                60 * 1000,
                docID,
                d.id,
            );
            for (const doc of bdocs.backlinks) {
                for (const p of doc?.blockPaths ?? []) {
                    if (thisEventID != lastEventID) return;
                    if (p.type == "NodeDocument") {
                        continue;
                    }
                    const docName = await siyuanCache.getDocNameByBlockID(
                        5 * 60 * 1000,
                        p.id,
                    );
                    const { content } =
                        await siyuanCache.getBlockMarkdownAndContent(
                            5 * 60 * 1000,
                            p.id,
                        );

                    if (shouldMove(dedup, p.name, docName)) {
                        backlinks = [
                            ...backlinks,
                            {
                                id: p.id,
                                content,
                                docName,
                            },
                        ];
                    }
                }
            }
        }
        for (const d of bls.backmentions) {
            const bmdocs = await siyuanCache.getBackmentionDoc(
                60 * 1000,
                docID,
                d.id,
            );
            for (const doc of bmdocs.backmentions) {
                const marks: string[] = findMarks(doc.dom);
                for (const p of doc?.blockPaths ?? []) {
                    if (thisEventID != lastEventID) return;
                    if (p.type == "NodeParagraph") {
                        const docName = await siyuanCache.getDocNameByBlockID(
                            5 * 60 * 1000,
                            p.id,
                        );
                        if (shouldMove(dedup, p.name, docName)) {
                            let content: string = p.name;
                            marks.forEach((mark) => {
                                content = content.replace(
                                    new RegExp(escape(mark), "g"),
                                    `<span style="background-color:var(--b3-protyle-inline-mark-background)">${mark}</span>`,
                                );
                            });
                            mentionlinks = [
                                ...mentionlinks,
                                { id: p.id, content, docName },
                            ];
                        }
                    }
                }
            }
        }
    }
    function escape(s: string) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    function openAtab(id: string) {
        openTab({
            app: plugin.app,
            doc: {
                id,
                action: ["cb-get-all"],
            },
        });
    }
    function findMarks(dom: string) {
        const all = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(dom, "text/html");
        const spans = doc.querySelectorAll('span[data-type="search-mark"]');
        spans.forEach((span) => {
            all.push(span.innerHTML.trim());
        });
        return all;
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="fn__flex-1 fn__flex-column">
    <div class="block__icons">
        <div class="block__logo">
            <svg><use xlink:href="#iconEmoji"></use></svg>
            《{title}》
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
        {backlinks.length}反链
        <div class="fn__hr"></div>
        {#each backlinks as link}
            <button
                class="b3-button b3-button--text"
                on:click={() => openAtab(link.id)}>🔗</button
            >
            <a href="siyuan://blocks/{link.id}"
                ><span class="reftext">{link.content} 《{link.docName}》</span>
            </a>
            <div class="fn__hr"></div>
        {/each}
        <div class="fn__hr"></div>
        {mentionlinks.length}提及：《{title}》中内容
        <div class="fn__hr"></div>
        {#each mentionlinks as link}
            <button
                class="b3-button b3-button--text"
                on:click={() => openAtab(link.id)}>🔗</button
            >
            <a href="siyuan://blocks/{link.id}">
                <span class="reftext">
                    {@html link.content}
                </span>
                <span class="reftext-small">
                    《{link.docName}》
                </span>
            </a>
            <div class="fn__hr"></div>
        {/each}
    </div>
</div>

<style>
    .reftext-small {
        background: var(--b3-theme-surface);
        color: var(--b3-theme-on-surface);
        border-radius: 4px;
        padding: 2px 8px;
        font-size: small;
    }
    .reftext {
        background: var(--b3-theme-surface);
        color: var(--b3-theme-on-surface);
        border-radius: 4px;
        padding: 2px 8px;
        font-size: large;
    }
</style>
