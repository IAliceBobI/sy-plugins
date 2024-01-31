<script lang="ts">
    import { confirm } from "siyuan";
    import { onMount } from "svelte";
    import { CacheMinutes, cardPriorityBox } from "./CardPriorityBox";
    import {
        CARD_PRIORITY,
        CARD_PRIORITY_STOP,
        CUSTOM_RIFF_DECKS,
        DATA_NODE_ID,
        SPACE,
        TOMATO_CONTROL_ELEMENT,
    } from "./libs/gconst";
    import { getID, isValidNumber, siyuan, timeUtil } from "./libs/utils";
    import { DialogText } from "./libs/DialogText";

    export let wysiwygElement: HTMLElement;
    export let cardElement: HTMLElement;
    export let textContent: string;

    let priText: HTMLElement;
    let controlAttr: AttrType;
    let cardID: string;
    let priority: number;

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
        event.stopPropagation();
        const id = getID(cardElement, [CUSTOM_RIFF_DECKS]);
        if (!id) return;
        const newAttrs = {} as AttrType;
        const attrs = await siyuan.getBlockAttrs(id);
        if (attrs[CARD_PRIORITY_STOP]) {
            newAttrs["custom-card-priority-stop"] = "";
            await siyuan.setBlockAttrs(id, newAttrs);
            await siyuan.pushMsg("继续闪卡");
            await cardPriorityBox.addBtns(wysiwygElement);
        } else {
            new DialogText(
                "准备暂停，请先设置闪卡恢复日期",
                await siyuan.currentTime(60 * 60 * 24 * 2),
                async (datetimeStr: string) => {
                    const tidiedStr =
                        timeUtil.makesureDateTimeFormat(datetimeStr);
                    if (tidiedStr) {
                        const attrs = {} as AttrType;
                        attrs["custom-card-priority-stop"] = datetimeStr;
                        await siyuan.setBlockAttrs(id, attrs);
                        await siyuan.pushMsg("暂停闪卡到：" + datetimeStr);
                    } else {
                        await siyuan.pushMsg("输入格式错误");
                    }
                    await cardPriorityBox.addBtns(wysiwygElement);
                },
            );
        }
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
        {SPACE}
        <button title="暂停/继续" on:click={stopCard}>🛑</button>
        {SPACE}
        <button title="闪卡优先级-1" on:click={subOne}>➖</button>
        <button
            title="点击修改优先级"
            bind:this={priText}
            on:click={updateCardByInput}>{priority}</button
        >
        <button title="闪卡优先级+1" on:click={addOne}>➕</button>
        {SPACE}
        <input
            title="拖动闪卡优先级"
            type="range"
            on:click={updateCard}
            bind:value={priority}
            min="0"
            max="100"
        />
        {SPACE.repeat(6)}
    </div>
</div>

<style>
    .container {
        border: none;
    }
    button {
        background-color: transparent;
        border: none;
    }
</style>
