<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { getID, newID, siyuanCache } from "./libs/utils";
    import {
        MENTION_CACHE_TIME,
        MENTION_COUTING_SPAN,
        icon,
    } from "./libs/bkUtils";
    import { Dialog, openTab } from "siyuan";
    import { SEARCH_HELP } from "./constants";
    import {
        BLOCK_REF,
        BlockNodeEnum,
        DATA_ID,
        DATA_TYPE,
    } from "./libs/gconst";
    import { BKMaker } from "./BackLinkBottomBox";

    const QUERYABLE_ELEMENT = "QUERYABLE_ELEMENT";
    const ICONS_SIZE = 13;
    const BACKLINK_CACHE_TIME = 6 * 1000;
    const mentionCountingSpanAttr = {};
    const queryableElementAttr = {};

    type BacklinkSv = {
        bk: Backlink;
        id: string;
    };

    export let maker: BKMaker;
    let autoRefreshChecked: boolean;
    $: if (autoRefreshChecked != null) maker.shouldFreeze = !autoRefreshChecked;
    let backLinks: BacklinkSv[] = [] as any;
    let allRefs: RefCollector = new Map();

    onMount(async () => {
        mentionCountingSpanAttr[MENTION_COUTING_SPAN] = "1";
        queryableElementAttr[QUERYABLE_ELEMENT] = "1";
        autoRefreshChecked = !maker.shouldFreeze;
        await getBackLinks();
    });

    onDestroy(() => {});

    async function getBackLinks() {
        const backlink2 = await siyuanCache.getBacklink2(
            BACKLINK_CACHE_TIME,
            maker.docID,
        );

        const maxCount = maker.settingCfg["back-link-max-size"] ?? 100;
        backLinks = (
            await Promise.all(
                backlink2.backlinks.slice(0, maxCount).map((backlink) => {
                    return siyuanCache.getBacklinkDoc(
                        2 * BACKLINK_CACHE_TIME,
                        maker.docID,
                        backlink.id,
                    );
                }),
            )
        )
            .map((i) => i.backlinks)
            .flat()
            .map((bk) => {
                return { bk, id: newID() } as BacklinkSv;
            });

        await Promise.all(backLinks.map((backLink) => path2div(backLink)));
        backLinks.forEach((backLink) => scanAllRef(backLink.bk.dom));
        backLinks = backLinks;
        allRefs = allRefs;
    }

    async function path2div(backlinkSv: BacklinkSv) {
        for (const blockPath of backlinkSv.bk.blockPaths.slice(0, -1)) {
            if (blockPath.type == BlockNodeEnum.NODE_DOCUMENT) {
                const fileName = blockPath.name.split("/").pop();
                await addRef(fileName, blockPath.id);
            } else if (blockPath.type == BlockNodeEnum.NODE_HEADING) {
                await addRef(blockPath.name, blockPath.id);
            } else {
                const { dom } = await siyuanCache.getBlockDOM(
                    2 * BACKLINK_CACHE_TIME,
                    blockPath.id,
                );
                await scanAllRef(dom);
            }
        }
    }

    async function scanAllRef(domStr: string) {
        const div = document.createElement("div") as HTMLDivElement;
        div.innerHTML = domStr ?? "";
        for (const element of div.querySelectorAll(
            `[${DATA_TYPE}~="${BLOCK_REF}"]`,
        )) {
            const id = element.getAttribute(DATA_ID);
            const txt = element.textContent;
            await addRef(txt, id, getID(element));
        }
    }

    async function addRef(txt: string, id: string, dataNodeID?: string) {
        if (txt == "*" || txt == "@" || txt == "@*") return;
        if (
            Array.from(
                txt.matchAll(/^c?\d{4}-\d{2}-\d{2}(@第\d+周-星期.{1})?$/g),
            ).length > 0
        )
            return;
        if (!dataNodeID) dataNodeID = id;
        const row = await siyuanCache.sqlOne(
            MENTION_CACHE_TIME,
            `select root_id from blocks where id="${dataNodeID}"`,
        );
        const key = id + txt;
        const value: linkItem =
            allRefs.get(key) ?? ({ count: 0, dataNodeIDSet: new Set() } as any);
        if (!value.dataNodeIDSet.has(dataNodeID)) {
            value.count += 1;
            value.dataNodeIDSet.add(dataNodeID);
            value.id = id;
            value.text = txt;
            value.isThisDoc = (row?.root_id ?? "") == maker.docID;
            allRefs.set(key, value);
        }
    }

    async function search(event: Event) {
        const newValue: string = (event.target as any).value;
        console.log(newValue);
        // searchInDiv(self, newValue.trim());
    }

    function refClick(id: string) {
        openTab({
            app: maker.plugin.app,
            doc: { id, action: ["cb-get-hl", "cb-get-context"], zoomIn: false },
        });
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div>
    {#each [...allRefs.values()] as { text, id, count }}
        <label class="b3-label b3-label__text b3-label--noborder">
            <button
                class="bk_label b3-label__text"
                on:click={() => refClick(id)}>{text}</button
            >
            <span class="bk_ref_count">{count}</span>
        </label>
    {/each}
    <hr />
</div>
<div>
    <label class="b3-label b3-label__text b3-label--noborder">
        {#if !autoRefreshChecked}
            {@html icon("Focus", ICONS_SIZE)}停止
        {:else}
            {@html icon("Refresh", ICONS_SIZE)}自动
        {/if}
        <input
            title="是否自动刷新"
            type="checkbox"
            class="b3-switch"
            bind:checked={autoRefreshChecked}
        />
    </label>
    <label class="b3-label b3-label__text b3-label--noborder">
        提及数上限：
        <input
            class="b3-text-field"
            type="number"
            min="0"
            bind:value={maker.mentionCount}
            on:focus={() => (autoRefreshChecked = false)}
            on:blur={() => (autoRefreshChecked = true)}
        />
    </label>
    <label class="b3-label b3-label__text b3-label--noborder">
        <button
            class="bk_label b3-label__text"
            title="点击查看：搜索语法"
            on:click={() =>
                new Dialog({ title: "搜索语法", content: SEARCH_HELP })}
            >{@html icon("Help", ICONS_SIZE)}</button
        >
        <input
            class="b3-text-field"
            title="必须包含AA、BB，DD与EE至少包含一个，但不能包含CC"
            placeholder="AA BB !CC DD|EE"
            on:focus={() => (autoRefreshChecked = false)}
            on:input={search}
        />
        <span {...mentionCountingSpanAttr}></span>
    </label>
    <hr />
</div>
{#each backLinks as backLink}
    <div id={backLink.id} {...queryableElementAttr}>
        <div class="bk_one_line">
            <div class="fn__flex-column">
                <button
                    class="gap bk_label b3-button b3-button--text"
                    title="隐藏"
                    on:click={() => {
                        autoRefreshChecked = false;
                        document.getElementById(backLink.id).style.display =
                            "none";
                    }}>{@html icon("Eyeoff")}</button
                >
                <button
                    class="gap bk_label b3-button b3-button--text"
                    title="复制到文档">{@html icon("Copy")}</button
                >
                <button
                    class="gap bk_label b3-button b3-button--text"
                    title="移动到文档">{@html icon("Move")}</button
                >
            </div>
            <div>
                {#each backLink.bk.blockPaths as blockPath, i}
                    <span
                        title={blockPath.name}
                        class="bk_label b3-label__text"
                    >
                        {#if i == backLink.bk.blockPaths.length - 1}
                            <button
                                class="bk_label b3-label__text"
                                on:click={() => refClick(blockPath.id)}
                                >[...]</button
                            >
                        {:else}
                            {#if blockPath.type == BlockNodeEnum.NODE_DOCUMENT}
                                <button
                                    class="bk_label b3-label__text"
                                    on:click={() => refClick(blockPath.id)}
                                    >{blockPath.name.split("/").pop()}</button
                                >
                            {:else}
                                <button
                                    class="bk_label b3-label__text"
                                    on:click={() => refClick(blockPath.id)}
                                    >{blockPath.name}</button
                                >
                            {/if}
                            ➡️
                        {/if}
                    </span>
                {/each}
                {@html backLink.bk.dom ?? ""}
            </div>
        </div>
        <hr />
    </div>
{/each}

<style>
    .bk_ref_count {
        color: var(--b3-font-color8);
    }
    .gap {
        margin: auto;
    }
    .bk_one_line {
        display: flex;
    }
    .bk_label {
        border: transparent;
        background-color: transparent;
    }
    input[type="number"] {
        width: 6%;
    }
</style>
