<script lang="ts">
    import { App, Plugin, Protyle, Dialog } from "siyuan";
    import { onDestroy, onMount } from "svelte";
    import { siyuan, timeUtil } from "./utils";
    import { events } from "./Events";

    export let app: App;
    export let plugin: Plugin;
    export let blockID: BlockID;
    export let dialog: Dialog;
    export let schedule: any;

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
        protyle = new Protyle(app, protyleTarget, {
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
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="b3-dialog__content">
    <div class="schedule-style__id">{idMsg}</div>
    <div class="fn__hr"></div>
    <input
        type="text"
        class="schedule-style__input-field"
        bind:value={datetimeStr}
    />
    {#if blockID}
        <button class="schedule-style__button" on:click={btnAddADay}
            >{plugin.i18n.btnAddADay}</button
        >
        <button class="schedule-style__button" on:click={btnSchedule}
            >{plugin.i18n.setDate}</button
        ><br />
    {/if}
    <div class="fn__hr"></div>
    <div id="protyle" style="height: 380px;" bind:this={protyleTarget}></div>
</div>
