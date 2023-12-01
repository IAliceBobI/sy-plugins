<script lang="ts">
    import { adaptHotkey, openTab, Plugin, Protyle } from "siyuan";
    import { onMount } from "svelte";
    import { siyuan } from "./utils";
    import { events, EventType } from "./Events";

    export let plugin: Plugin;

    type LinkType = { id: string; content: string; docName: string };

    const BackLinkBoxSvelteLock = "BackLinkBoxSvelteLock";
    let backlinks: LinkType[] = [];
    let mentionlinks: LinkType[] = [];
    let title: string = "";
    let eventID = 0;

    onMount(async () => {
        events.addListener("BackLinkBox", onPortyleChange);
    });

    async function onPortyleChange(eventType: string, detail: Protyle) {
        eventID++;
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
                        await getBackLinks(docID, eventID);
                    }
                } else if (eventType == EventType.destroy_protyle) {
                    backlinks = mentionlinks = [];
                    title = "";
                }
            }
        });
    }
    async function getDocNameByBlockID(blockID: string) {
        let row = await siyuan.sqlOne(
            `select root_id from blocks where id="${blockID}"`,
        );
        if (row["root_id"]) {
            row = await siyuan.sqlOne(
                `select content from blocks where id="${row["root_id"]}"`,
            );
        }
        const docName = row["content"] ?? "";
        return docName;
    }

    async function getBackLinks(docID: string, thisEventID: number) {
        backlinks = [];
        mentionlinks = [];
        const bls = await siyuan.getBacklink2(docID);
        for (const d of bls.backlinks) {
            const bdocs = await siyuan.getBacklinkDoc(docID, d.id);
            for (const doc of bdocs.backlinks) {
                for (const p of doc?.blockPaths ?? []) {
                    if (thisEventID != eventID) return;
                    if (p.type == "NodeDocument") {
                        continue;
                    }
                    const docName = await getDocNameByBlockID(p.id);
                    const { content } = await siyuan.getBlockMarkdownAndContent(
                        p.id,
                    );
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
        const dedup: Set<string> = new Set();
        for (const d of bls.backmentions) {
            const bmdocs = await siyuan.getBackmentionDoc(docID, d.id);
            for (const doc of bmdocs.backmentions) {
                for (const p of doc?.blockPaths ?? []) {
                    if (thisEventID != eventID) return;
                    if (p.type == "NodeParagraph") {
                        const content = keepContext(p.name, title, 10);
                        const docName = await getDocNameByBlockID(p.id);
                        const key = `${p.name}#${docName}`;
                        if (dedup.has(key)) continue;
                        dedup.add(key);
                        mentionlinks = [
                            ...mentionlinks,
                            { id: p.id, content, docName },
                        ];
                    }
                }
            }
        }
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
    function splitByMiddle(str: string): [string, string] {
        const middleIndex = Math.floor(str.length / 2);
        const part1 = str.substring(0, middleIndex);
        const part2 = str.substring(middleIndex);
        return [part1, part2];
    }
    function keepContext(text: string, keyword: string, count: number): string {
        let parts = text.split(keyword);
        if (parts.length == 1) return text;
        {
            const newParts = [];
            newParts.push(parts[0]);
            for (let i = 1; i < parts.length - 1; i++) {
                newParts.push(...splitByMiddle(parts[i]));
            }
            newParts.push(parts[parts.length - 1]);
            parts = newParts;
        }

        for (let i = 0; i < parts.length; i++) {
            const len = parts[i].length;
            if (i % 2 == 0) {
                const start = Math.max(len - count, 0);
                if (start > 0) {
                    parts[i] = ".." + parts[i].slice(start, len) + keyword;
                } else {
                    parts[i] = parts[i].slice(start, len) + keyword;
                }
            } else {
                if (count < len) {
                    parts[i] = parts[i].slice(0, count) + "..";
                } else {
                    parts[i] = parts[i].slice(0, count);
                }
            }
        }
        return parts.join("");
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
            <button on:click={() => openAtab(link.id)}>🔗</button>
            <a href="siyuan://blocks/{link.id}"
                ><span class="reftext"
                    >{link.content} 《{link.docName}》{link.id.split(
                        "-",
                    )[1]}</span
                ></a
            >
            <div class="fn__hr"></div>
        {/each}
        <div class="fn__hr"></div>
        {mentionlinks.length}提及：《{title}》中内容
        <div class="fn__hr"></div>
        {#each mentionlinks as link}
            <button on:click={() => openAtab(link.id)}>🔗</button>
            <a href="siyuan://blocks/{link.id}">
                <span class="reftext">
                    {#if title}
                        {@html link.content.replace(
                            new RegExp(title, "g"),
                            `<strong>${title}</strong>`,
                        )}
                    {:else}
                        {link.content}
                    {/if}
                    《{link.docName}》
                </span>
            </a>
            <div class="fn__hr"></div>
        {/each}
    </div>
</div>

<style>
    .reftext {
        background: #e3d8d8;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: large;
    }
</style>
