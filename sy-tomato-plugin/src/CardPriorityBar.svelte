<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { CardPriorityBox } from "./CardPriorityBox";
    import { SPACE, TOMATO_CONTROL_ELEMENT, WEB_SPACE } from "./libs/gconst";

    export let cardPriorityBox: CardPriorityBox;
    export let controlElement: HTMLElement;

    let controlAttr = {} as AttrType;

    onMount(async () => {
        controlAttr[TOMATO_CONTROL_ELEMENT] = "1";

        // const subDiv = div.appendChild(document.createElement("div"));
        // const subOne = subDiv.appendChild(document.createElement("a"));
        // const priText = subDiv.appendChild(document.createElement("span"));
        // const addOne = subDiv.appendChild(document.createElement("a"));
        // const spanSpace = subDiv.appendChild(document.createElement("span"));
        // const rmCard = subDiv.appendChild(document.createElement("a"));

        // priText.textContent = `${SPACE + priority + SPACE}`;
        // if (this.cards?.has(cardID)) {
        //     priText.title = `${JSON.stringify(this.cards.get(cardID))}【${CacheMinutes}分钟缓存】`;
        //     priText.innerHTML = `<strong>${priText.textContent}</strong>`;
        // }
        // spanSpace.textContent = SPACE;

        // addOne.title = "闪卡优先级+1";
        // addOne.textContent = "➕";

        // subOne.title = "闪卡优先级-1";
        // subOne.textContent = "➖";

        // rmCard.title = "取消制卡";
        // rmCard.textContent = "🚫";

        // addOne.addEventListener("click", async () => {
        //     await this.updatePrioritySelected([e], priority + 1);
        //     await this.addBtns(element);
        // });
        // subOne.addEventListener("click", async () => {
        //     await this.updatePrioritySelected([e], priority - 1);
        //     await this.addBtns(element);
        // });
        // rmCard.addEventListener("click", () => {
        //     confirm("删除闪卡", text, async () => {
        //         await siyuan.removeRiffCards([cardID]);
        //         e.querySelectorAll(`[${TOMATO_CONTROL_ELEMENT}]`).forEach(
        //             (e) => {
        //                 e.parentElement.removeChild(e);
        //             },
        //         );
        //     });
        // });
    });

    onDestroy(() => {});

    async function subOne() {
        // await this.updatePrioritySelected([e], priority - 1);
        // await this.addBtns(element);
    }

    // const subOne = subDiv.appendChild(document.createElement("a"));
    // const priText = subDiv.appendChild(document.createElement("span"));
    // const addOne = subDiv.appendChild(document.createElement("a"));
    // const spanSpace = subDiv.appendChild(document.createElement("span"));
    // const rmCard = subDiv.appendChild(document.createElement("a"));

    // priText.textContent = `${SPACE + priority + SPACE}`;
    // if (this.cards?.has(cardID)) {
    //     priText.title = `${JSON.stringify(this.cards.get(cardID))}【${CacheMinutes}分钟缓存】`;
    //     priText.innerHTML = `<strong>${priText.textContent}</strong>`;
    // }
    // spanSpace.textContent = SPACE;

    // addOne.title = "闪卡优先级+1";
    // addOne.textContent = "➕";

    // subOne.title = "闪卡优先级-1";
    // subOne.textContent = "➖";

    // rmCard.title = "取消制卡";
    // rmCard.textContent = "🚫";

    // addOne.addEventListener("click", async () => {
    //     await this.updatePrioritySelected([e], priority + 1);
    //     await this.addBtns(element);
    // });
    // subOne.addEventListener("click", async () => {
    //     await this.updatePrioritySelected([e], priority - 1);
    //     await this.addBtns(element);
    // });
    // rmCard.addEventListener("click", () => {
    //     confirm("删除闪卡", text, async () => {
    //         await siyuan.removeRiffCards([cardID]);
    //         e.querySelectorAll(`[${TOMATO_CONTROL_ELEMENT}]`).forEach(e => {
    //             e.parentElement.removeChild(e);
    //         });
    //     });
    // });
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div {...controlAttr} style="display: flex;">
    <button title="闪卡优先级-1" on:click={subOne}>➖</button>
    {SPACE}
    <a></a>
    {SPACE}
    <a></a>
</div>

<style>
    button {
        border: none;
    }
</style>
