<script lang="ts">
    import { Dialog } from "siyuan";
    import { afterUpdate, onDestroy, onMount } from "svelte";

    export let dialog: Dialog;
    export let defaultValue: string;
    export let callback: Func;

    let inputText: string = "";
    let input: HTMLInputElement;

    onMount(async () => {});

    afterUpdate(() => {
        input.focus();
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
        bind:this={input}
        on:focus={() => input.select()}
        placeholder={defaultValue}
        type="text"
        class="schedule-style__input-field"
        bind:value={inputText}
        on:keypress={(event) => {
            if (event instanceof KeyboardEvent) {
                if (event.key === "Enter") {
                    btnClick();
                }
            }
        }}
    />
    <button
        title="快捷键：回车/Enter"
        class="schedule-style__button"
        on:click={btnClick}>回车/Enter</button
    >
</div>
