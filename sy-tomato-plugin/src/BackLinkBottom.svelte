<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { siyuanCache } from "./libs/utils";
    import { IBKMaker, icon } from "./libs/bkUtils";
    import { SPACE } from "./libs/gconst";
    export let maker: IBKMaker;

    let autoRefreshChecked: boolean;
    $: if (autoRefreshChecked != null) maker.shouldFreeze = !autoRefreshChecked;

    onMount(async () => {
        autoRefreshChecked = !maker.shouldFreeze;
        await getBackLinks();
    });

    async function getBackLinks() {
        const allRefs: RefCollector = new Map();
        const backlink2 = await siyuanCache.getBacklink2(6 * 1000, maker.docID);
    }

    onDestroy(() => {});
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div>dd</div>
<hr />
<div>
    <label class="b3-label b3-label__text b3-label--noborder">
        {#if !autoRefreshChecked}
            {@html icon("Focus", 13)}停止
        {:else}
            {@html icon("Refresh", 13)}自动
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
        <input >
    </label>
</div>
<hr />
<div>bbb</div>
<div>sss</div>

<style>
    hr {
        height: 2px;
        background-color: var(b3-font-color5);
        width: 100%;
    }
</style>
