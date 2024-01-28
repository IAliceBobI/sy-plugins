<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { siyuanCache } from "./libs/utils";
    import { MENTION_COUTING_SPAN, icon } from "./libs/bkUtils";
    import { Dialog } from "siyuan";
    import { SEARCH_HELP } from "./constants";
    import { BLOCK_REF, DATA_ID, DATA_TYPE, SPACE } from "./libs/gconst";
    import { BKMaker } from "./BackLinkBottomBox";

    const QUERYABLE_ELEMENT = "QUERYABLE_ELEMENT";
    const ICONS_SIZE = 13;
    const mentionCountingSpanAttr = {};
    const queryableElementAttr = {};

    export let maker: BKMaker;
    let autoRefreshChecked: boolean;
    $: if (autoRefreshChecked != null) maker.shouldFreeze = !autoRefreshChecked;
    let backLinks: Backlink[] = [] as any;
    const allRefs: RefCollector = new Map();

    onMount(async () => {
        mentionCountingSpanAttr[MENTION_COUTING_SPAN] = "1";
        queryableElementAttr[QUERYABLE_ELEMENT] = "1";
        autoRefreshChecked = !maker.shouldFreeze;
        await getBackLinks();
    });

    async function getBackLinks() {
        const backlink2 = await siyuanCache.getBacklink2(6 * 1000, maker.docID);

        const maxCount = maker.settingCfg["back-link-max-size"] ?? 100;
        backLinks = (
            await Promise.all(
                backlink2.backlinks.slice(0, maxCount).map((backlink) => {
                    return siyuanCache.getBacklinkDoc(
                        12 * 1000,
                        maker.docID,
                        backlink.id,
                    );
                }),
            )
        )
            .map((i) => i.backlinks)
            .flat();
        for (const backLink of backLinks) {
            scanAllRef(backLink);
        }
    }

    async function path2div(docBlock: HTMLElement, blockPaths: BlockPath[]) {
        const div = document.createElement("div") as HTMLDivElement;
        const btn = div.appendChild(createEyeBtn());
        btn.addEventListener("click", () => {
            freeze(self);
            docBlock.style.display = "none";
        });
        const refPathList: HTMLSpanElement[] = [];
        for (const ret of chunks(
            await Promise.all(
                blockPaths
                    .map((refPath) => {
                        return [
                            refPath,
                            siyuanCache.getBlockKramdown(
                                MENTION_CACHE_TIME,
                                refPath.id,
                            ),
                        ];
                    })
                    .flat(),
            ),
            2,
        )) {
            const [refPath, { kramdown: _kramdown }] = ret as [
                BlockPath,
                GetBlockKramdown,
            ];
            if (refPath.type == "NodeDocument") {
                if (refPath.id == self.docID) break;
                const fileName = refPath.name.split("/").pop();
                refPathList.push(refTag(refPath.id, fileName, 0));
                addRef(fileName, refPath.id, allRefs, self.docID);
                continue;
            }

            if (refPath.type == "NodeHeading") {
                refPathList.push(refTag(refPath.id, refPath.name, 0));
                addRef(refPath.name, refPath.id, allRefs, self.docID);
            } else {
                refPathList.push(refTag(refPath.id, refPath.name, 0, 15));
            }

            let kramdown = _kramdown;
            if (refPath.type == "NodeListItem" && kramdown) {
                kramdown = kramdown.split("\n")[0];
            }
            if (kramdown) {
                const { idLnks } = extractLinks(kramdown);
                for (const idLnk of idLnks) {
                    addRef(idLnk.txt, idLnk.id, allRefs, self.docID);
                }
            }
        }
        refPathList.forEach((s, idx, arr) => {
            s = s.cloneNode(true) as HTMLScriptElement;
            if (idx < arr.length - 1) {
                s.appendChild(createSpan("  ➡  "));
            } else {
                const e = s.querySelector(`[${DATA_ID}]`);
                if (e) {
                    e.textContent = "[...]";
                }
            }
            div.appendChild(s);
        });
        return div;
    }

    onDestroy(() => {});

    function scanAllRef(backLink: Backlink) {
        const div = document.createElement("div") as HTMLDivElement;
        div.innerHTML = backLink.dom ?? "";
        for (const element of div.querySelectorAll(
            `[${DATA_TYPE}~="${BLOCK_REF}"]`,
        )) {
            const id = element.getAttribute(DATA_ID);
            const txt = element.textContent;
            addRef(txt, id);
        }
    }

    function addRef(txt: string, id: string) {
        if (txt == "*" || txt == "@" || txt == "@*") return;
        if (id == maker.docID) return;
        if (
            Array.from(
                txt.matchAll(/^c?\d{4}-\d{2}-\d{2}(@第\d+周-星期.{1})?$/g),
            ).length > 0
        )
            return;

        const key = id + txt;
        const c = (allRefs.get(key)?.count ?? 0) + 1;
        allRefs.set(key, {
            count: c,
            text: txt,
            id,
        });
    }

    async function search(event: Event) {
        const newValue: string = (event.target as any).value;
        console.log(newValue);
        // searchInDiv(self, newValue.trim());
    }

    function getHideableID(idx: number) {
        return `tomatoHideableDiv${idx}`;
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div>dd</div>
<hr />
<div>
    <label class="b3-label b3-label__text b3-label--noborder">
        {#if !autoRefreshChecked}
            {@html icon("Focus", ICONS_SIZE)}停止
        {:else}
            {@html icon("Refresh", ICONS_SIZE)}自动
        {/if}
        <input
            title="是否自动刷新"
            type="checkbox"
            class="b3-switch"
            bind:checked={autoRefreshChecked}
        />
    </label>
    <label class="b3-label b3-label__text b3-label--noborder">
        提及数上限：
        <input
            class="b3-text-field"
            type="number"
            min="0"
            bind:value={maker.mentionCount}
            on:focus={() => (autoRefreshChecked = false)}
            on:blur={() => (autoRefreshChecked = true)}
        />
    </label>
    <label class="b3-label b3-label__text b3-label--noborder">
        <button
            class="bk_label b3-label__text"
            title="点击查看：搜索语法"
            on:click={() =>
                new Dialog({ title: "搜索语法", content: SEARCH_HELP })}
            >{@html icon("Help", ICONS_SIZE)}</button
        >
        <input
            class="b3-text-field"
            title="必须包含AA、BB，DD与EE至少包含一个，但不能包含CC"
            placeholder="AA BB !CC DD|EE"
            on:focus={() => (autoRefreshChecked = false)}
            on:input={search}
        />
        <span {...mentionCountingSpanAttr}></span>
    </label>
</div>

{#each backLinks as backLink, i}
    <hr />
    <div id={getHideableID(i)} {...queryableElementAttr} class="bk_one_line">
        <div class="fn__flex-column">
            <button
                class="gap bk_label b3-button b3-button--text"
                title="隐藏"
                on:click={() => {
                    autoRefreshChecked = false;
                    document.getElementById(getHideableID(i)).style.display =
                        "none";
                }}>{@html icon("Eyeoff")}</button
            >
            <button
                class="gap bk_label b3-button b3-button--text"
                title="复制到文档">{@html icon("Copy")}</button
            >
            <button
                class="gap bk_label b3-button b3-button--text"
                title="移动到文档">{@html icon("Move")}</button
            >
        </div>
        {@html backLink.dom ?? ""}
    </div>
{/each}

<style>
    .gap {
        margin: auto;
    }
    .bk_one_line {
        display: flex;
    }
    .bk_label {
        border: transparent;
        background-color: transparent;
    }
    input[type="number"] {
        width: 6%;
    }
    hr {
        height: 2px;
        color: var(b3-font-color5);
        background-color: var(b3-font-color5);
        width: 100%;
    }
</style>
