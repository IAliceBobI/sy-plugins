<script lang="ts">
    import { onMount } from "svelte";

    export let data: RefCollector[];

    let searchQuery = "";
    let searchResults = [];

    onMount(async () => {});

    const search = () => {
        // Perform search logic based on the searchQuery
        // Update the searchResults array with the filtered results
        // You can use JavaScript array methods like filter() or find() to filter the data based on the searchQuery
    };
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="fn__flex-1 fn__flex-column">
    <input type="text" bind:value={searchQuery} placeholder="Search..." />
    <button on:click={search}>Search</button>

    {#if searchResults.length > 0}
        <ul>
            {#each searchResults as result}
                <li>{result.text}</li>
            {/each}
        </ul>
    {:else}
        <p>No results found.</p>
    {/if}
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
