<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import {
        NewLute,
        cleanDiv,
        dom2div,
        newID,
        siyuan,
        siyuanCache,
    } from "./libs/utils";
    import {
        MENTION_CACHE_TIME,
        MENTION_COUTING_SPAN,
        icon,
        path2div,
        scanAllRef,
        sortDiv,
    } from "./libs/bkUtils";
    import { Dialog, Protyle, openTab } from "siyuan";
    import { SEARCH_HELP } from "./constants";
    import {
        BACKLINK_CACHE_TIME,
        BlockNodeEnum,
        DATA_NODE_ID,
        TOMATO_BK_IGNORE,
    } from "./libs/gconst";
    import { BKMaker } from "./BackLinkBottomBox";
    import { SearchEngine } from "./libs/search";

    const QUERYABLE_ELEMENT = "QUERYABLE_ELEMENT";
    const ICONS_SIZE = 13;
    const mentionCountingSpanAttr = {};
    const queryableElementAttr = {};
    const lute = NewLute();

    export let maker: BKMaker;
    let autoRefreshChecked: boolean;
    $: if (autoRefreshChecked != null) maker.shouldFreeze = !autoRefreshChecked;
    let backLinks: BacklinkSv[] = [];
    let linkItems: LinkItem[] = [];
    const allRefs: RefCollector = new Map();
    let searchText = "";
    let searchField: HTMLInputElement;

    onMount(async () => {
        mentionCountingSpanAttr[MENTION_COUTING_SPAN] = "1";
        queryableElementAttr[QUERYABLE_ELEMENT] = "1";
        autoRefreshChecked = !maker.shouldFreeze;
        await getBackLinks();
        maker.refreshBK = getBackLinks;
    });

    onDestroy(() => {});

    async function getBackLinks() {
        const backlink2 = await siyuanCache.getBacklink2(
            BACKLINK_CACHE_TIME,
            maker.docID,
        );

        const maxCount = maker.settingCfg["back-link-max-size"] ?? 100;
        backLinks = (
            await Promise.all(
                backlink2.backlinks.slice(0, maxCount).map((backlink) => {
                    return siyuanCache.getBacklinkDoc(
                        2 * BACKLINK_CACHE_TIME,
                        maker.docID,
                        backlink.id,
                    );
                }),
            )
        )
            .map((i) => i.backlinks)
            .flat()
            .filter((bk) => !!bk)
            .map((bk) => {
                const bkDiv = dom2div(bk.dom);
                return { bk, id: newID(), attrs: {}, bkDiv } as BacklinkSv;
            });

        await Promise.all(
            backLinks.map((backLink) =>
                path2div(backLink, maker.docID, allRefs),
            ),
        );
        backLinks.forEach((backLink) =>
            scanAllRef(backLink.bkDiv, maker.docID, allRefs),
        );
        backLinks.sort(sortDiv);
        backLinks = [...backLinks];
        linkItems = [...allRefs.values()];

        if (maker.mentionCount > 0) {
            const mentions: BacklinkSv[] = [];
            let count = 0;
            outer: for (const mention of backlink2.backmentions) {
                const mentionDoc = await siyuanCache.getBackmentionDoc(
                    MENTION_CACHE_TIME,
                    maker.docID,
                    mention.id,
                );
                for (const mentionItem of mentionDoc.backmentions) {
                    mentions.push({
                        bk: mentionItem,
                        id: newID(),
                        attrs: {},
                        isMention: true,
                    } as BacklinkSv);
                    ++count;
                    maker.mentionCounting.innerText = `提及读取中：${count}`;
                    if (count >= maker.mentionCount) break outer;
                }
            }
            maker.mentionCounting.innerText = "";

            await Promise.all(
                mentions.map((m) => path2div(m, maker.docID, allRefs)),
            );
            mentions.forEach((m) =>
                scanAllRef(dom2div(m.bk.dom), maker.docID, allRefs),
            );
            backLinks = [...backLinks, ...mentions];
            linkItems = [...allRefs.values()];
        }
    }

    function refreshBKProtyle(backLink: BacklinkSv) {
        const len = backLink.bk.blockPaths.length;
        if (len > 0) {
            const blockId = backLink.bk.blockPaths[len - 1].id;
            maker.blBox.bkProtyleCache.delete(blockId);
            document.getElementById(backLink.id).style.display = "none";
            autoRefreshChecked = true;
        }
    }

    /** @type {import('svelte/action').Action}  */
    function mountProtyle(node: HTMLElement, backLink: BacklinkSv) {
        node.style.minHeight = "auto";
        const len = backLink.bk.blockPaths.length;
        if (len > 0) {
            const blockId = backLink.bk.blockPaths[len - 1].id;
            const p = maker.blBox.bkProtyleCache.getOrElse(blockId, () => {
                const div = document.createElement("div") as HTMLElement;
                div.setAttribute(TOMATO_BK_IGNORE, "1");
                div.style.minHeight = "auto";
                const p = new Protyle(maker.plugin.app, div, {
                    blockId,
                    render: {
                        background: false,
                        title: false,
                        gutter: true,
                        scroll: false,
                        breadcrumb: false,
                        breadcrumbDocName: false,
                    },
                });
                p.protyle.element.addEventListener("mouseleave", () => {
                    hideGutter(p.protyle.element);
                });
                return p;
            });
            node.appendChild(p.protyle.element);
            node.addEventListener("click", () => {
                autoRefreshChecked = false;
            });
        }
    }

    function hideGutter(e: HTMLElement) {
        e?.querySelectorAll(".protyle-gutters")?.forEach((e) => {
            e.innerHTML = "";
        });
    }

    async function search() {
        if (searchField) {
            searchField.style.width =
                (Math.max(searchText.length, 10) + 10) * 8 + "px";
        }

        if (!searchText.trim()) {
            autoRefreshChecked = true;
            maker.container
                .querySelectorAll(`[${QUERYABLE_ELEMENT}]`)
                .forEach((e: HTMLElement) => {
                    e.style.display = "";
                });
        } else {
            autoRefreshChecked = false;
            const se = new SearchEngine(true);
            se.setQuery(searchText);
            maker.container
                .querySelectorAll(`[${QUERYABLE_ELEMENT}]`)
                .forEach((e: HTMLElement) => {
                    const m = se.match(e.textContent);
                    if (!m) {
                        e.style.display = "none";
                    } else {
                        e.style.display = "";
                    }
                });
        }
    }

    function refClick(id: string) {
        openTab({
            app: maker.plugin.app,
            doc: { id, action: ["cb-get-hl", "cb-get-context"], zoomIn: false },
        });
    }

    function refConceptClick(event: Event, txt: string, id: string) {
        if (event instanceof PointerEvent) {
            if (event.ctrlKey || event.altKey || event.shiftKey) {
                //
            } else {
                searchText = "";
            }
            if (event.shiftKey) {
                if (searchText) {
                    searchText += "  !" + txt;
                } else {
                    searchText = "!" + txt;
                }
            } else if (event.altKey) {
                // if (searchText) {
                //     searchText += "|" + txt;
                // } else {
                //     searchText = txt;
                // }
                openTab({
                    app: maker.plugin.app,
                    doc: {
                        id,
                        zoomIn: false,
                        action: ["cb-get-hl", "cb-get-context"],
                    },
                });
                return;
            } else if (event.ctrlKey) {
                if (searchText) {
                    searchText += "  " + txt;
                } else {
                    searchText = txt;
                }
            } else {
                searchText = txt;
            }
            search();
        }
    }

    function hideThis() {
        if (autoRefreshChecked) {
            autoRefreshChecked = false;
            maker.container
                .querySelectorAll('[isThisDoc="true"]')
                .forEach((e: HTMLElement) => {
                    e.style.display = "none";
                });
        } else {
            autoRefreshChecked = true;
            maker.container
                .querySelectorAll('[isThisDoc="true"]')
                .forEach((e: HTMLElement) => {
                    e.style.display = "";
                });
        }
    }

    async function copy2doc(domStr: string) {
        if (!domStr) return;
        let div = document.createElement("div") as HTMLDivElement;
        div.innerHTML = domStr ?? "";
        const [id] = await cleanDiv(div.firstElementChild as any, false, false);
        const md = lute.BlockDOM2Md(div.innerHTML);
        await siyuan.appendBlock(md, maker.docID);
        await siyuan.pushMsg("复制成功", 2000);
        return id;
    }

    async function move2doc(domStr: string) {
        const div = dom2div(domStr);
        const id = div.getAttribute(DATA_NODE_ID);
        if (id) {
            const lastID = (
                await siyuan.getTailChildBlocks(maker.docID, 1)
            )?.pop()?.id;
            if (lastID) {
                await siyuan.moveBlockAfter(id, lastID);
                await siyuan.pushMsg("移动成功", 2000);
            }
        }
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div>
    {#each linkItems as { text, id, count, attrs } (id)}
        <label {...attrs} class="b3-label b3-label__text b3-label--noborder">
            <button
                title="点击(单选), ctrl点击(并且), shift点击(排除), alt点击(打开链接)"
                {...attrs}
                class="bk_label b3-label__text"
                on:click={(event) => refConceptClick(event, text, id)}
                >{text}</button
            >
            <span class="bk_ref_count">{count}</span>
        </label>
    {/each}
    <hr />
</div>
<div>
    <label class="b3-label b3-label__text b3-label--noborder">
        <button
            title="隐藏本文档链接"
            class="bk_label b3-label__text"
            on:click={hideThis}>{@html icon("Eyeoff", ICONS_SIZE)}</button
        >
    </label>
    <label
        class="b3-label b3-label__text b3-label--noborder"
        title="是否自动刷新"
    >
        {#if !autoRefreshChecked}
            {@html icon("Focus", ICONS_SIZE)}不刷新
        {:else}
            {@html icon("Refresh", ICONS_SIZE)}刷新中
        {/if}
        <input
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
            title="清空"
            on:click={() => {
                searchText = "";
                search();
            }}>{@html icon("Trashcan", ICONS_SIZE)}</button
        >
        <input
            bind:this={searchField}
            class="b3-text-field searchField"
            title="必须包含AA、BB，DD与EE至少包含一个，但不能包含CC"
            placeholder="AA BB !CC DD|EE"
            on:focus={() => (autoRefreshChecked = false)}
            bind:value={searchText}
            on:input={() => search()}
        />
        <button
            class="bk_label b3-label__text"
            title="点击查看：搜索语法"
            on:click={() =>
                new Dialog({ title: "搜索语法", content: SEARCH_HELP })}
            >{@html icon("Help", ICONS_SIZE)}</button
        >
        <span {...mentionCountingSpanAttr}></span>
    </label>
    <hr />
</div>
<div class="bk_protyle">
    {#each backLinks as backLink (backLink.id)}
        <div id={backLink.id} {...queryableElementAttr} {...backLink.attrs}>
            <div class="bk_one_line">
                <div class="fn__flex-column">
                    <button
                        class="gap bk_label b3-button b3-button--text"
                        title="隐藏"
                        on:click={() => {
                            autoRefreshChecked = false;
                            document.getElementById(backLink.id).style.display =
                                "none";
                        }}>{@html icon("Eyeoff")}</button
                    >
                    <button
                        class="gap bk_label b3-button b3-button--text"
                        title="移动到文档"
                        on:click={async () => {
                            autoRefreshChecked = false;
                            document.getElementById(backLink.id).style.display =
                                "none";
                            await move2doc(backLink.bk.dom);
                        }}>{@html icon("Move")}</button
                    >
                    <button
                        class="gap bk_label b3-button b3-button--text"
                        title="复制到文档"
                        on:click={async () => {
                            await copy2doc(backLink.bk.dom);
                        }}>{@html icon("Copy")}</button
                    >
                </div>
                <div>
                    {#each backLink.bk.blockPaths as blockPath, i (blockPath.id)}
                        <span
                            {...backLink.attrs}
                            title={blockPath.name}
                            class="bk_label b3-label__text"
                        >
                            {#if i == backLink.bk.blockPaths.length - 1}
                                <button
                                    {...backLink.attrs}
                                    class="bk_label b3-label__text"
                                    on:click={() => refClick(blockPath.id)}
                                    >[{backLink.isMention ? "🇲" : "🇷"}]</button
                                >
                            {:else}
                                {#if blockPath.type == BlockNodeEnum.NODE_DOCUMENT}
                                    <button
                                        {...backLink.attrs}
                                        class="bk_label b3-label__text"
                                        on:click={() => refClick(blockPath.id)}
                                        >{blockPath.name
                                            .split("/")
                                            .pop()}</button
                                    >
                                {:else}
                                    <button
                                        {...backLink.attrs}
                                        class="bk_label b3-label__text"
                                        on:click={() => refClick(blockPath.id)}
                                        >{blockPath.name}</button
                                    >
                                {/if}
                                <svg class="protyle-breadcrumb__arrow"
                                    ><use xlink:href="#iconRight"></use></svg
                                >
                            {/if}
                        </span>
                    {/each}
                    <button
                        title="单独刷新"
                        {...backLink.attrs}
                        class="bk_label b3-label__text"
                        on:click={() => refreshBKProtyle(backLink)}
                    >
                        {@html icon("Refresh", ICONS_SIZE)}</button
                    >
                    <div use:mountProtyle={backLink}></div>
                </div>
            </div>
            <hr />
        </div>
    {/each}
</div>

<style>
    .searchField {
        width: auto;
    }
    .bk_protyle {
        /* transform: scale(0.999); */
        transform-origin: top left;
        padding-bottom: 100%;
    }
    [isThisDoc="true"] {
        color: var(--b3-font-color7);
    }
    .bk_ref_count {
        color: var(--b3-font-color8);
    }
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
        width: 10%;
    }
</style>
