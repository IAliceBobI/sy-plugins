<script lang="ts">
    import { Dialog, confirm, openTab, Plugin } from "siyuan";
    import { siyuan } from "./libs/utils";
    import { onDestroy } from "svelte";
    import { escOnElement } from "./libs/keyboard";

    export let dialog: Dialog;
    export let dialogDiv: HTMLElement;
    export let plugin: Plugin;
    export let msg: string;
    export let id: string;

    onDestroy(destroy);

    function destroy() {
        dialog.destroy();
    }

    async function deleteCard() {
        await siyuan.removeRiffCards([id]);
        const btnSkip = document.body.querySelector(
            'button[data-type="-3"]',
        ) as HTMLButtonElement;
        btnSkip.click();
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
        >取消制卡 ➕ 删除内容块</button
    >
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <button class="b3--button" on:click={deleteCard}>取消制卡/删卡</button>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <button class="b3--button" on:click={gotoCard}>定位闪卡</button>
</div>

<style>
</style>
