<script lang="ts">
    import { Dialog, IProtyle } from "siyuan";
    import { onDestroy, onMount } from "svelte";
    import { events } from "../../sy-tomato-plugin/src/libs/Events";
    import { newDigestDoc } from "./digestUtils";
    import { cleanText } from "../../sy-tomato-plugin/src/libs/utils";

    export let dialog: Dialog = null;
    export let protyle: IProtyle;

    let element: HTMLElement;
    let selected: HTMLElement[] = [];
    let docID: string;
    let docName: string;
    let anchorID: string;
    let selectedText: string;
    let selectedIds: string[] = [];
    let boxID: string;
    let allText: string;

    onMount(async () => {
        const s = await events.selectedDivs(protyle);
        selectedIds = s.ids;
        element = s.element;
        docID = s.docID;
        docName = s.docName;
        selectedText = s.rangeText;
        anchorID = s.ids[s.ids.length - 1];
        selected = s.selected;
        boxID = s.boxID;
        allText = getAllText();
    });

    onDestroy(destroy);

    function destroy() {
        dialog?.destroy();
    }

    function getAllText() {
        return selected
            .map((e) => {
                const txt = e.textContent || e.innerText;
                return cleanText(txt);
            })
            .filter((t) => !!t)
            .reduce((list, t) => {
                list.push(t);
                return list;
            }, [])
            .join("\n");
    }

    async function digest() {
        const digestID = await newDigestDoc(docID, boxID, allText);
        destroy();
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="protyle-wysiwyg">
    <table>
        <tbody>
            <tr>
                <td>
                    <button title="摘抄" class="b3-button" on:click={digest}
                        >🍕摘抄</button
                    >
                </td>
            </tr>
        </tbody>
    </table>
</div>

<style>
</style>
