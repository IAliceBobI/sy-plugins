<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { siyuanCache } from "./libs/utils";
    import {
        IBKMaker,
        icon,
        MENTION_COUTING_SPAN,
        QUERYABLE_ELEMENT,
    } from "./libs/bkUtils";
    import { Dialog } from "siyuan";
    import { SEARCH_HELP } from "./constants";

    const ICONS_SIZE = 13;
    export let maker: IBKMaker;

    let autoRefreshChecked: boolean;
    $: if (autoRefreshChecked != null) maker.shouldFreeze = !autoRefreshChecked;

    const mentionCountingSpanAttr = {};
    const queryableElementAttr = {};
    let backLinks: Backlink[] = [] as any;

    onMount(async () => {
        mentionCountingSpanAttr[MENTION_COUTING_SPAN] = "1";
        queryableElementAttr[QUERYABLE_ELEMENT] = "1";
        autoRefreshChecked = !maker.shouldFreeze;
        await getBackLinks();
    });

    async function getBackLinks() {
        const allRefs: RefCollector = new Map();
        const backlink2 = await siyuanCache.getBacklink2(6 * 1000, maker.docID);

        const maxCount = maker.settingCfg["back-link-max-size"] ?? 100;
        backLinks = (
            await Promise.all(
                backlink2.backlinks.slice(0, maxCount).map((backlink) => {
                    return siyuanCache.getBacklinkDoc(
                        12 * 1000,
                        maker.docID,
                        backlink.id,
                    );
                }),
            )
        )
            .map((i) => i.backlinks)
            .flat();
        for (const backLink of backLinks) {
            console.log(backLink);
        }
    }

    onDestroy(() => {});

    async function search(event: Event) {
        const newValue: string = (event.target as any).value;
        console.log(newValue);
        // searchInDiv(self, newValue.trim());
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div>dd</div>
<hr />
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
</div>

{#each backLinks as backLink}
    <hr />
    <div {...queryableElementAttr}>{@html backLink.dom ?? ""}</div>
{/each}

<style>
    .bk_label {
        border: transparent;
        background-color: transparent;
    }
    input[type="number"] {
        width: 6%;
    }
    hr {
        height: 2px;
        color: var(b3-font-color5);
        background-color: var(b3-font-color5);
        width: 100%;
    }
</style>
