<script lang="ts">
    import { confirm } from "siyuan";
    import { onMount } from "svelte";
    import { CacheMinutes, cardPriorityBox } from "./CardPriorityBox";
    import {
        CARD_PRIORITY,
        DATA_NODE_ID,
        TOMATO_CONTROL_ELEMENT,
        WEB_SPACE,
    } from "./libs/gconst";
    import { isValidNumber, siyuan } from "./libs/utils";
    import { events } from "./libs/Events";

    export let wysiwygElement: HTMLElement;
    export let cardElement: HTMLElement;
    export let textContent: string;

    let priText: HTMLElement;
    let controlAttr: AttrType;
    let cardID: string;
    let priority: number;
    let whiteSpace = WEB_SPACE;

    onMount(async () => {
        cardID = cardElement.getAttribute(DATA_NODE_ID);
        priority = Number(cardElement.getAttribute(CARD_PRIORITY) ?? "50");
        if (!isValidNumber(priority)) priority = 50;
        controlAttr = {} as AttrType;
        controlAttr[TOMATO_CONTROL_ELEMENT] = "1";

        if (cardPriorityBox.cards?.has(cardID)) {
            priText.title = `${JSON.stringify(cardPriorityBox.cards.get(cardID))}【${CacheMinutes}分钟缓存】【点击修改】`;
            priText.style.fontWeight = "bold";
        }

        if (events.isMobile) whiteSpace = "";
    });

    async function subOne(event: MouseEvent) {
        event.stopPropagation();
        await cardPriorityBox.updatePrioritySelected(
            [cardElement],
            priority - 1,
        );
        await cardPriorityBox.addBtns(wysiwygElement);
    }
    async function addOne(event: MouseEvent) {
        event.stopPropagation();
        await cardPriorityBox.updatePrioritySelected(
            [cardElement],
            priority + 1,
        );
        await cardPriorityBox.addBtns(wysiwygElement);
    }
    async function stopCard(event: MouseEvent) {
        cardPriorityBox.stopCard(event, cardElement, wysiwygElement);
    }
    async function removeCard(event: MouseEvent) {
        event.stopPropagation();
        confirm("删除闪卡", textContent, async () => {
            await siyuan.removeRiffCards([cardID]);
            cardElement
                .querySelectorAll(`[${TOMATO_CONTROL_ELEMENT}]`)
                .forEach((e) => {
                    e.parentElement.removeChild(e);
                });
        });
    }
    async function updateCard(event: MouseEvent) {
        event.stopPropagation();
        await cardPriorityBox.updatePrioritySelected([cardElement], priority);
        await cardPriorityBox.addBtns(wysiwygElement);
    }
    async function updateCardByInput(event: MouseEvent) {
        event.stopPropagation();
        await cardPriorityBox.updatePrioritySelected(
            [cardElement],
            priority,
            async () => {
                await cardPriorityBox.addBtns(wysiwygElement);
            },
        );
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div {...controlAttr} class="container">
    <div>
        <button title="取消制卡" on:click={removeCard}>🚫</button>
        {@html whiteSpace}
        <button title="闪卡优先级-1" on:click={subOne}>➖</button>
        <button
            title="点击修改优先级"
            bind:this={priText}
            on:click={updateCardByInput}>{priority}</button
        >
        <button title="闪卡优先级+1" on:click={addOne}>➕</button>
        {@html whiteSpace}
        <button title="暂停/继续" on:click={stopCard}>🛑</button>
        {@html whiteSpace}
        <input
            title="拖动闪卡优先级"
            type="range"
            on:click={updateCard}
            bind:value={priority}
            min="0"
            max="100"
        />
    </div>
</div>

<style>
    input {
        height: 1px;
    }
    .container {
        border: none;
    }
    button {
        background-color: transparent;
        border: none;
    }
</style>
