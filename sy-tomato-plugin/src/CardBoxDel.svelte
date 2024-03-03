<script lang="ts">
    import { Dialog, confirm, openTab, Plugin } from "siyuan";
    import { siyuan } from "./libs/utils";
    import { onDestroy, onMount } from "svelte";
    import { escOnElement } from "./libs/keyboard";
    import { doStopCards } from "./libs/cardUtils";
    import { cardPriorityBox } from "./CardPriorityBox";

    export let dialog: Dialog;
    export let dialogDiv: HTMLElement;
    export let plugin: Plugin;
    export let msg: string;
    export let id: string;

    let delayDays: number;
    $: hours = delayDays * 24;

    onMount(() => {
        delayDays = 0.1;
    });

    onDestroy(destroy);

    function destroy() {
        dialog.destroy();
    }

    function skip() {
        const btnSkip = document.body.querySelector(
            'button[data-type="-3"]',
        ) as HTMLButtonElement;
        if (btnSkip) btnSkip.click();
    }

    async function deleteCard() {
        await siyuan.removeRiffCards([id]);
        skip();
        destroy();
    }

    async function delayRestCards() {
        const blocks = await cardPriorityBox.getRestCards();
        await doStopCards(String(delayDays), blocks);
        destroy();
        escOnElement(dialogDiv);
    }

    async function delayCard() {
        await doStopCards(String(delayDays), [
            { ial: { id } },
        ] as GetCardRetBlock[]);
        skip();
        destroy();
    }

    async function gotoCard() {
        destroy();
        escOnElement(dialogDiv);
        openTab({
            app: plugin.app,
            doc: {
                id,
                action: ["cb-get-hl", "cb-get-context", "cb-get-focus"],
                zoomIn: false,
            },
        });
    }

    async function deleteCardDeleteContent() {
        confirm("⚠️", "🗑️删除内容块", async () => {
            await siyuan.deleteBlocks([id]);
            await deleteCard();
        });
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="protyle-wysiwyg">
    {@html msg}
    <div class="fn__hr"></div>
    <div>
        <button
            class="b3-button b3-button--outline"
            on:click={deleteCardDeleteContent}>🗑️删除内容块</button
        >
        <button class="b3-button b3-button--outline" on:click={deleteCard}
            >🔕取消制卡</button
        >
        <button class="b3-button b3-button--outline" on:click={gotoCard}
            >🔍定位闪卡</button
        >
    </div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div>
        <label title="推迟当前闪卡{hours.toFixed(1)}小时">
            <input
                min="0"
                step="0.2"
                bind:value={delayDays}
                type="number"
                class="b3-text-field"
            />
            天({hours.toFixed(1)}小时)
            <button class="b3-button b3-button--outline" on:click={delayCard}
                >📅推迟</button
            >
        </label>
        <label title="推迟没处理过的全部闪卡{hours.toFixed(1)}小时">
            <button
                class="b3-button b3-button--outline"
                on:click={delayRestCards}>🌊📅推迟余下闪卡</button
            >
        </label>
    </div>
</div>

<style>
    input {
        width: 90px;
    }
</style>
