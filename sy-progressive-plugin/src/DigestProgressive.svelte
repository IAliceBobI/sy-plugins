<script lang="ts">
    import { Dialog, IProtyle } from "siyuan";
    import { onDestroy, onMount } from "svelte";

    export let dialog: Dialog = null;
    export let protyle: IProtyle;
    export let callName: string = "";

    onMount(async () => {});
    onDestroy(destroy);

    function destroy() {
        dialog?.destroy();
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="protyle-wysiwyg">
    <table>
        <tbody>
            <tr>
                <td> ssss </td>
            </tr>
        </tbody>
    </table>
</div>

<style>
</style>
