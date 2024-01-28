<script lang="ts">
    import { onDestroy, onMount } from "svelte";

    onMount(async () => {
        await getBackLinks(this); // start
    });

    onDestroy(() => {});

</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->

