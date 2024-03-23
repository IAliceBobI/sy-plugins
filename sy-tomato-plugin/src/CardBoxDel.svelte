<script lang="ts">
    import { Dialog, confirm, openTab, Plugin, IProtyle } from "siyuan";
    import { siyuan } from "./libs/utils";
    import { onDestroy, onMount } from "svelte";
    import { escOnElement } from "./libs/keyboard";
    import { doStopCards, pressSkip } from "./libs/cardUtils";
    import { cardPriorityBox } from "./CardPriorityBox";
    import CardPriorityBar from "./CardPriorityBar.svelte";
    import { CUSTOM_RIFF_DECKS, DATA_NODE_ID } from "./libs/gconst";
    import { events } from "./libs/Events";

    export let protyle: IProtyle;
    export let dialog: Dialog;
    export let dialogDiv: HTMLElement;
    export let plugin: Plugin;
    export let msg: string;
    export let id: string;

    let delayDays: number;
    $: hours = delayDays * 24;
    let cardElement: HTMLElement;

    onMount(() => {
        delayDays = 0.1;
        cardElement = protyle.element.querySelector(
            `[${DATA_NODE_ID}="${id}"][${CUSTOM_RIFF_DECKS}]`,
        );
    });

    onDestroy(destroy);

    function destroy() {
        dialog.destroy();
    }

    async function deleteCard() {
        await siyuan.removeRiffCards([id]);
        destroy();
        pressSkip();
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
        destroy();
        pressSkip();
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
        <button
            title="ctrl+9"
            class="b3-button b3-button--outline"
            on:click={deleteCard}>🔕取消制卡</button
        >
        <button class="b3-button b3-button--outline" on:click={gotoCard}
            >🔍定位闪卡</button
        >
    </div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    {#if cardElement}
        <div title="数值大的优先复习">
            <CardPriorityBar
                {cardElement}
                {plugin}
                enableDelayBtn={false}
                enableDeleteBtn={false}
                callback={() => {
                    events.protyleReload();
                }}
            ></CardPriorityBar>
        </div>
    {/if}
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div>
        <label>
            <input
                title="使用鼠标滚轮来调整"
                min="0"
                step="0.1"
                bind:value={delayDays}
                type="number"
                class="b3-text-field"
            />
            天
            <button class="b3-button b3-button--outline" on:click={delayCard}
                >📅推迟{hours.toFixed(1)}小时</button
            >
            <button
                title="没处理过的闪卡都被推迟"
                class="b3-button b3-button--outline"
                on:click={delayRestCards}
                >🌊📅推迟余下闪卡{hours.toFixed(1)}小时</button
            >
        </label>
    </div>
</div>

<style>
    input {
        width: 90px;
    }
</style>
