<script lang="ts">
    import { Dialog } from "siyuan";
    import { onDestroy, onMount } from "svelte";

    export let dialog: Dialog;
    export let defaultValue: string;
    export let callback: Func;

    let inputText: string;

    onMount(async () => {
        inputText = defaultValue;
    });

    onDestroy(() => {});

    async function btnClick() {
        await callback(inputText);
        dialog.destroy();
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="b3-dialog__content">
    <input
        type="text"
        class="schedule-style__input-field"
        bind:value={inputText}
    />
    <button class="schedule-style__button" on:click={btnClick}>Ok</button>
</div>
