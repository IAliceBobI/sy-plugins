<script lang="ts">
    import { Dialog, IProtyle, openTab } from "siyuan";
    import { onDestroy, onMount } from "svelte";
    import { events } from "../../sy-tomato-plugin/src/libs/Events";
    import { newDigestDoc } from "./digestUtils";
    import {
        cleanDiv,
        cleanText,
        siyuan,
    } from "../../sy-tomato-plugin/src/libs/utils";
    import { digestProgressiveBox } from "./DigestProgressiveBox";
    import {
        DATA_NODE_ID,
        DATA_NODE_INDEX,
        IN_BOOK_INDEX,
        PARAGRAPH_INDEX,
        PROG_ORIGIN_TEXT,
        RefIDKey,
    } from "../../sy-tomato-plugin/src/libs/gconst";
    import { getBookID } from "../../sy-tomato-plugin/src/libs/progressive";

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
        const md = [];
        let idx: string;
        let i = 0;
        for (const div of selected) {
            const inBookIdx = div.getAttribute(DATA_NODE_INDEX);
            if (!idx) {
                const inBookIdxOrigin = div.getAttribute(IN_BOOK_INDEX);
                if (inBookIdxOrigin) {
                    idx = inBookIdxOrigin;
                } else {
                    idx = inBookIdx;
                }
            }
            const cloned = div.cloneNode(true) as HTMLDivElement;
            await cleanDiv(cloned, true, true, false);
            cloned.setAttribute(RefIDKey, div.getAttribute(DATA_NODE_ID));
            cloned.setAttribute(IN_BOOK_INDEX, inBookIdx);
            cloned.setAttribute(PARAGRAPH_INDEX, String(i));
            cloned.setAttribute(PROG_ORIGIN_TEXT, "1");
            md.push(digestProgressiveBox.lute.BlockDOM2Md(cloned.outerHTML));
            i++;
        }
        if (!idx) {
            idx = "0";
        }
        let { bookID } = await getBookID(docID);
        if (!bookID) bookID = docID;
        const digestID = await newDigestDoc(
            bookID,
            boxID,
            idx,
            allText,
            md.join("\n"),
        );
        await openTab({
            app: digestProgressiveBox.plugin.app,
            doc: {
                id: digestID,
                zoomIn: false,
                action: ["cb-get-hl", "cb-get-context"],
            },
        });
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
                <td>
                    <button
                        title="删除失效的引用、链接: *@&"
                        class="b3-button"
                        on:click={() => {
                            siyuan.pushMsg("开发中...");
                        }}>💔删坏链</button
                    >
                </td>
            </tr>
        </tbody>
    </table>
</div>

<style>
</style>
