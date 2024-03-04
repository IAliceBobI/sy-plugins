<script lang="ts">
    import { confirm } from "siyuan";
    import { onMount } from "svelte";
    import { cardPriorityBox } from "./CardPriorityBox";
    import {
        CARD_PRIORITY,
        DATA_NODE_ID,
        TOMATO_CONTROL_ELEMENT,
        WEB_SPACE,
    } from "./libs/gconst";
    import {
        getContenteditableElement,
        isValidNumber,
        siyuan,
        siyuanCache,
        timeUtil,
    } from "./libs/utils";
    import { events } from "./libs/Events";

    export let cardElement: HTMLElement;
    export let enableDeleteBtn = true;
    export let enableDelayBtn = true;
    export let callback: Func = () => {};

    let priText: HTMLElement;
    let controlAttr: AttrType;
    let cardID: string;
    let priority: number;
    let whiteSpace = WEB_SPACE;
    let textContent: string;

    onMount(async () => {
        {
            const e = getContenteditableElement(cardElement) as HTMLElement;
            textContent =
                e?.textContent?.slice(0, 50) ??
                cardElement.textContent?.slice(0, 50);
        }
        cardID = cardElement.getAttribute(DATA_NODE_ID);
        if (cardElement.classList.contains("protyle-title")) {
            const attrs = await siyuan.getBlockAttrs(cardID);
            priority = Number(attrs["custom-card-priority"] ?? "50");
        } else {
            priority = Number(cardElement.getAttribute(CARD_PRIORITY) ?? "50");
        }

        if (!isValidNumber(priority)) priority = 50;
        controlAttr = {} as AttrType;
        controlAttr[TOMATO_CONTROL_ELEMENT] = "1";

        {
            const CacheMinutes = 10;
            siyuanCache
                .getRiffCardsAll(CacheMinutes * 60 * 1000)
                .then((all) => {
                    const cards = all.get(cardID) ?? [];
                    for (const card of cards) {
                        if (card.riffCard) {
                            priText.title = `
复习时间：${timeUtil.dateFormat(new Date(card.riffCard.due))}
复习次数：${card.riffCard.reps}
【点击修改优先级】
【数值高的优先复习】
【${CacheMinutes}分钟缓存】
`.trim();
                            priText.style.fontWeight = "bold";
                            break;
                        }
                    }
                });
        }

        if (events.isMobile) whiteSpace = "";
    });

    async function subOne(event: MouseEvent) {
        event.stopPropagation();
        await cardPriorityBox.updatePrioritySelected(
            [cardElement],
            priority - 1,
            false,
            (p) => {
                priority = p;
                cardElement.setAttribute(CARD_PRIORITY, p);
                callback();
            },
        );
    }
    async function addOne(event: MouseEvent) {
        event.stopPropagation();
        await cardPriorityBox.updatePrioritySelected(
            [cardElement],
            priority + 1,
            false,
            (p) => {
                priority = p;
                cardElement.setAttribute(CARD_PRIORITY, p);
                callback();
            },
        );
    }
    async function stopCard(event: MouseEvent) {
        cardPriorityBox.stopCard(event, cardElement);
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
        await cardPriorityBox.updatePrioritySelected(
            [cardElement],
            priority,
            false,
            (p) => {
                priority = p;
                cardElement.setAttribute(CARD_PRIORITY, p);
                callback();
            },
        );
    }
    async function updateCardByInput(event: MouseEvent) {
        event.stopPropagation();
        await cardPriorityBox.updatePrioritySelected(
            [cardElement],
            priority,
            true,
            (p) => {
                priority = p;
                cardElement.setAttribute(CARD_PRIORITY, p);
                callback();
            },
        );
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div {...controlAttr} class="container">
    <div>
        {#if enableDeleteBtn}
            <button title="取消制卡" on:click={removeCard}>🚫</button>
            {@html whiteSpace}
        {/if}
        <button title="闪卡优先级-1" on:click={subOne}>➖</button>
        <button
            title="点击修改优先级"
            bind:this={priText}
            on:click={updateCardByInput}>{priority}</button
        >
        <button title="闪卡优先级+1" on:click={addOne}>➕</button>
        {@html whiteSpace}
        {#if enableDelayBtn}
            <button title="推迟/取消推迟" on:click={stopCard}>🛑</button>
            {@html whiteSpace}
        {/if}
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
