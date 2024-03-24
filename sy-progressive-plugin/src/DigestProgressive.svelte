<script lang="ts">
    import { Dialog, IProtyle } from "siyuan";
    import { onDestroy, onMount } from "svelte";
    import { events } from "../../sy-tomato-plugin/src/libs/Events";
    import { digest, finishDigest } from "./digestUtils";
    import { cleanText, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
    import { digestProgressiveBox } from "./DigestProgressiveBox";

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
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="protyle-wysiwyg">
    <table>
        <tbody>
            <tr>
                <td>
                    <button
                        title="摘抄"
                        class="b3-button"
                        on:click={async () => {
                            await digest(
                                docID,
                                boxID,
                                allText,
                                selected,
                                digestProgressiveBox.lute,
                                digestProgressiveBox.plugin,
                            );
                            destroy();
                        }}>➕🍕</button
                    >
                </td>
                <td>
                    <button
                        title="🍕🦈完成：转移闪卡到其他摘抄"
                        class="b3-button"
                        on:click={() => {
                            siyuan.pushMsg("开发中...");
                        }}>完成</button
                    >
                </td>
                <td>
                    <button
                        title="🗑️🍕完成并删除摘要"
                        class="b3-button"
                        on:click={async () => {
                            await finishDigest(docID);
                        }}>🗑️</button
                    >
                </td>
                <td>
                    <button
                        title="删除失效的（*@&）链接、引用"
                        class="b3-button"
                        on:click={() => {
                            siyuan.pushMsg("开发中...");
                        }}>💔🔗</button
                    >
                </td>
            </tr>
        </tbody>
    </table>
</div>

<style>
</style>
