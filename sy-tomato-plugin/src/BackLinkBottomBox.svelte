<script lang="ts">
    import { onMount } from "svelte";

    export let data: RefCollector[];

    onMount(async () => {
        console.log(data)
    });
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="fn__flex-1 fn__flex-column"></div>

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
