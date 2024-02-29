<script lang="ts">
    import { Dialog, confirm } from "siyuan";
    import { siyuan } from "./libs/utils";
    import { onDestroy } from "svelte";

    export let dialog: Dialog;
    export let msg: string;
    export let id: string;

    async function deleteCard() {
        await siyuan.removeRiffCards([id]);
        const btnSkip = document.body.querySelector(
            'button[data-type="-3"]',
        ) as HTMLButtonElement;
        btnSkip.click();
        destroy();
    }

    onDestroy(destroy);

    function destroy() {
        dialog.destroy();
    }

    async function deleteCardDeleteContent() {
        confirm("⚠️", "删除内容块", async () => {
            await siyuan.deleteBlocks([id]);
            await deleteCard();
        });
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="protyle-wysiwyg">
    {@html msg}
    <div class="fn__hr"></div>
    <button class="b3--button" on:click={deleteCardDeleteContent}
        >取消闪卡 ➕ 删除内容</button
    >
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <button class="b3--button" on:click={deleteCard}>取消闪卡</button>
</div>

<style>
</style>
