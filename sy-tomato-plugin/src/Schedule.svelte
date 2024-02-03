<script lang="ts">
    import { Plugin, Protyle, Dialog } from "siyuan";
    import { onDestroy, onMount } from "svelte";
    import { siyuan, timeUtil } from "@/libs/utils";
    import { events } from "@/libs/Events";
    import { schedule } from "./Schedule";

    export let plugin: Plugin;
    export let blockID: BlockID;
    export let dialog: Dialog;

    let protyleTarget: HTMLDivElement;
    let protyle: Protyle;
    let idMsg: string = "init...";
    let datetimeStr: string = "init...";

    onMount(async () => {
        idMsg = plugin.i18n.clickOneBlockFirst;
        if (!blockID) blockID = events.lastBlockID;
        if (blockID) {
            idMsg = blockID;
        }
        protyle = new Protyle(plugin.app, protyleTarget, {
            blockId: blockID,
        });
        datetimeStr = await siyuan.currentTime(10);
    });

    onDestroy(() => {
        protyle.destroy();
    });

    async function btnSchedule() {
        if (timeUtil.checkTimeFormat(datetimeStr)) {
            const tidiedStr = timeUtil.makesureDateTimeFormat(datetimeStr);
            if (tidiedStr) {
                schedule.addSchedule(blockID, tidiedStr);
                dialog.destroy();
                return;
            }
        }
        datetimeStr = await siyuan.currentTime(10);
    }

    async function btnAddADay() {
        if (timeUtil.checkTimeFormat(datetimeStr)) {
            const tidiedStr = timeUtil.makesureDateTimeFormat(datetimeStr);
            if (tidiedStr) {
                const newTime = new Date(
                    new Date(tidiedStr).getTime() + 1000 * 60 * 60 * 24,
                );
                datetimeStr = timeUtil.dateFormat(newTime);
                return;
            }
        }
        datetimeStr = await siyuan.currentTime(10);
    }

    async function copyID() {
        await navigator.clipboard.writeText(idMsg);
        await siyuan.pushMsg(`复制ID(${idMsg})成功`);
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="b3-dialog__content">
    <label>
        🗞️
        <span class="schedule-style__id">{idMsg}</span>
        <button
            class="b3-button b3-button--outline"
            title="复制ID"
            on:click={copyID}
            ><svg><use xlink:href="#iconCopy"></use></svg></button
        >
    </label>
    <div class="fn__hr"></div>
    <label>
        🗓️
        <input
            type="text"
            class="schedule-style__input-field"
            bind:value={datetimeStr}
        />
        {#if blockID}
            <button class="schedule-style__button" on:click={btnAddADay}
                >+24h</button
            >
            <button class="schedule-style__button" on:click={btnSchedule}
                >✅</button
            ><br />
        {/if}
    </label>
    <div class="fn__hr"></div>
    <div id="protyle" style="height: 380px;" bind:this={protyleTarget}></div>
</div>
