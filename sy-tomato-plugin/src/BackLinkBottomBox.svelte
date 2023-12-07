<script lang="ts">
    import { openTab, Plugin } from "siyuan";
    import { onDestroy, onMount } from "svelte";

    export let plugin: Plugin;
    export let data: linkItem[];

    let searchQuery = "";
    let searchResults: linkItem[] = [];

    onMount(async () => {
        searchResults = data.slice();
    });

    onDestroy(() => {
        // console.log("ssss");
    });

    const search = () => {
        searchResults = data.slice();
        const find = [];
        for (const i of searchResults) {
            if (i.text.includes(searchQuery)) {
                find.push(i);
            }
        }
        searchResults = find;
    };

    function linkClick(id: string) {
        openTab({
            app: plugin.app,
            doc: {
                id,
            },
        });
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="b3-dialog__content">
    <div class="fn__flex-1 fn__flex-column">
        <input
            type="text"
            bind:value={searchQuery}
            on:input={search}
            class="b3-text-field"
        />
    </div>
    {#each searchResults as item}
        <button
            on:click={() => {
                linkClick(item.id);
            }}>{@html item.lnk}</button
        >
        {@html "&nbsp;".repeat(10)}
    {/each}
</div>

<style>
    button {
        border: transparent;
        margin: auto;
        margin-bottom: 8px;
        color: var(--b3-protyle-inline-blockref-color);
        text-decoration: none;
        font-size: large;
    }

    button:hover {
        text-decoration: underline;
        color: var(--b3-protyle-inline-fileref-color);
    }
</style>
