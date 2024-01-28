<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { siyuanCache } from "./libs/utils";
    import { IBKMaker, icon } from "./libs/bkUtils";
    import { SPACE } from "./libs/gconst";
    export let maker: IBKMaker;

    let autoRefreshChecked = true;
    $: maker.shouldFreeze = !autoRefreshChecked;

    onMount(async () => {
        await getBackLinks();
    });

    async function getBackLinks() {
        const allRefs: RefCollector = new Map();
        const backlink2 = await siyuanCache.getBacklink2(6 * 1000, maker.docID);
    }

    onDestroy(() => {});
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div>
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label class="b3-label b3-label__text b3-label--noborder">
        {#if !autoRefreshChecked}
            <span>{@html icon("Focus", 15)}停止</span>
        {:else}
            <span>{@html icon("Refresh", 15)}自动</span>
        {/if}
    </label>
    <input
        title="是否自动刷新"
        type="checkbox"
        class="b3-switch"
        bind:checked={autoRefreshChecked}
        on:change={() => {}}
    />
</div>
<hr />
<div>bbb</div>
<div>sss</div>
