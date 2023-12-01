<script lang="ts">
    import { adaptHotkey, openTab, Plugin, Protyle } from "siyuan";
    import { onMount } from "svelte";
    import { siyuanCache } from "./utils";
    import { events, EventType } from "./Events";

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

        const bls = await siyuanCache.getBacklink2(docID);
        for (const d of bls.backlinks) {
            const bdocs = await siyuanCache.getBacklinkDoc(docID, d.id);
            for (const doc of bdocs.backlinks) {
                for (const p of doc?.blockPaths ?? []) {
                    if (thisEventID != lastEventID) return;
                    if (p.type == "NodeDocument") {
                        continue;
                    }
                    const docName = await siyuanCache.getDocNameByBlockID(p.id);
                    const { content } =
                        await siyuanCache.getBlockMarkdownAndContent(p.id);

                    if (shouldMove(dedup, p.name, docName)) {
                        backlinks = [
                            ...backlinks,
                            {
                                id: p.id,
                                content: content.slice(0, 16),
                                docName,
                            },
                        ];
                    }
                }
            }
        }
        for (const d of bls.backmentions) {
            const bmdocs = await siyuanCache.getBackmentionDoc(docID, d.id);
            for (const doc of bmdocs.backmentions) {
                const marks: string[] = findMarks(doc.dom);
                for (const p of doc?.blockPaths ?? []) {
                    if (thisEventID != lastEventID) return;
                    if (p.type == "NodeParagraph") {
                        // const content = keepContext(p.name, title, 10);
                        const docName = await siyuanCache.getDocNameByBlockID(
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
    // function splitByMiddle(str: string): [string, string] {
    //     const middleIndex = Math.floor(str.length / 2);
    //     const part1 = str.substring(0, middleIndex);
    //     const part2 = str.substring(middleIndex);
    //     return [part1, part2];
    // }
    // function keepContext(text: string, keyword: string, count: number): string {
    //     let parts = text.split(keyword);
    //     if (parts.length == 1) return text;
    //     {
    //         const newParts = [];
    //         newParts.push(parts[0]);
    //         for (let i = 1; i < parts.length - 1; i++) {
    //             newParts.push(...splitByMiddle(parts[i]));
    //         }
    //         newParts.push(parts[parts.length - 1]);
    //         parts = newParts;
    //     }

    //     for (let i = 0; i < parts.length; i++) {
    //         const len = parts[i].length;
    //         if (i % 2 == 0) {
    //             const start = Math.max(len - count, 0);
    //             if (start > 0) {
    //                 parts[i] = ".." + parts[i].slice(start, len) + keyword;
    //             } else {
    //                 parts[i] = parts[i].slice(start, len) + keyword;
    //             }
    //         } else {
    //             if (count < len) {
    //                 parts[i] = parts[i].slice(0, count) + "..";
    //             } else {
    //                 parts[i] = parts[i].slice(0, count);
    //             }
    //         }
    //     }
    //     return parts.join("");
    // }
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
        border-radius: 4px;
        padding: 2px 8px;
        font-size: small;
    }
    .reftext {
        background: var(--b3-theme-surface);
        border-radius: 4px;
        padding: 2px 8px;
        font-size: large;
    }
</style>
