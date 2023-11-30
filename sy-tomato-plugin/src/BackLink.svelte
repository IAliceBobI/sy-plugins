<script lang="ts">
    import { App, Plugin, Protyle, Dialog } from "siyuan";
    import { onDestroy, onMount } from "svelte";
    import { siyuan, timeUtil } from "./utils";
    import { events } from "./Events";

    // export let app: App;
    // export let plugin: Plugin;
    // export let blockID: BlockID;
    // export let dialog: Dialog;
    export let backlinkBox: any;

    // let protyleTarget: HTMLDivElement;
    // let protyle: Protyle;
    // let idMsg: string = "init...";
    // let datetimeStr: string = "init...";

    onMount(async () => {});

    onDestroy(() => {
        // protyle.destroy();
    });
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="b3-dialog__content">hehe</div>
