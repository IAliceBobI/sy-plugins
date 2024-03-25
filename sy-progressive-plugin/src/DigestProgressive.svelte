<script lang="ts">
    import { Dialog, IProtyle } from "siyuan";
    import { onDestroy, onMount } from "svelte";
    import { events } from "../../sy-tomato-plugin/src/libs/Events";
    import { cleanDigest, digest, finishDigest } from "./digestUtils";
    import { cleanText, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
    import { digestProgressiveBox } from "./DigestProgressiveBox";
    import {
        PDIGEST_CTIME,
        PDIGEST_LAST_ID,
    } from "../../sy-tomato-plugin/src/libs/gconst";

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
    let ctime: string;

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
        ctime = element.getAttribute(PDIGEST_CTIME);
        const fallbackID = element.getAttribute(PDIGEST_LAST_ID);
        if (fallbackID) anchorID = fallbackID;
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
                                anchorID,
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
                        on:click={async () => {
                            if (ctime) {
                                await finishDigest(
                                    docName,
                                    anchorID,
                                    docID,
                                    ctime,
                                    digestProgressiveBox.plugin,
                                );
                            } else {
                                await siyuan.pushMsg(
                                    `《${docName}》这并不是一个摘抄`,
                                );
                            }
                            destroy();
                        }}>🔨</button
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
            <tr>
                <td>
                    <button
                        title="查看阅读轨迹树"
                        class="b3-button"
                        on:click={() => {
                            siyuan.pushMsg("开发中...");
                        }}>🌲</button
                    >
                </td>
                <td>
                    <button
                        title="清理已经完成的摘抄"
                        class="b3-button"
                        on:click={async () => {
                            await cleanDigest(docID);
                            destroy();
                        }}>🗑️</button
                    >
                </td>
            </tr>
        </tbody>
    </table>
</div>

<style>
</style>
