<script lang="ts">
    import { onMount } from "svelte";

    export let data: linkItem[];

    let searchQuery = "";
    let searchResults: linkItem[] = [];

    onMount(async () => {
        searchResults = data.slice();
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
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div>
    <div class="fn__flex-1 fn__flex-column">
        <input
            type="text"
            bind:value={searchQuery}
            on:input={search}
            class="b3-text-field"
        />
    </div>
    {#each searchResults as item}
        <a href="siyuan://blocks/{item.id}">{@html item.lnk}</a>
        {@html "&nbsp;".repeat(10)}
    {/each}
</div>

<style>
    a {
        margin: auto;
        margin-bottom: 8px;
        color: var(--b3-protyle-inline-blockref-color);
        text-decoration: none;
        font-size: large;
    }

    a:hover {
        text-decoration: underline;
        color: var(--b3-protyle-inline-fileref-color);
    }
</style>
