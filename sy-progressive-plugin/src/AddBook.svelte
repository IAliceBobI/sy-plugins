<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { prog } from "./Progressive";
    import {
        isValidNumber,
        siyuan,
    } from "../../sy-tomato-plugin/src/libs/utils";
    import { splitByBlockCount } from "./helper";
    import { Dialog } from "siyuan";
    import { ContentLenGroup, HeadingGroup } from "./Split2Pieces";

    export let bookID: string;
    export let bookName: string;
    export let boxID: string;
    export let dialog: Dialog;

    let wordCount = 0;
    let headCount = 0;
    let contentBlocks: WordCountType[] = [];
    let headingsText = "1,2,3,4,5,6,b";
    let autoCard = false;
    let addIndex = false;
    let blockNum = 0;
    let splitWordNum = 0;
    let splitType: AsList = "no" as any;

    onMount(async () => {
        boxID = boxID;

        contentBlocks = (await siyuan.getChildBlocks(
            bookID,
        )) as unknown as WordCountType[];

        {
            const { wordCount: wc } = await siyuan.getBlocksWordCount([bookID]);
            wordCount = wc;
            for (const block of contentBlocks) {
                if (block.type == "h") headCount++;
            }
        }
    });

    onDestroy(async () => {});

    async function process() {
        const headings = headingsText
            .trim()
            .replace(/，/g, ",")
            .split(",")
            .map((i) => i.trim())
            .filter((i) => !!i);
        if (
            !headings.reduce((ret, i) => {
                if (i == "b") return ret;
                const j = Number(i);
                return ret && isValidNumber(j) && j >= 1 && j <= 6;
            }, true)
        ) {
            headingsText = "1,2,3,4,5,6,b";
            return;
        }
        headings.sort();

        if (!isValidNumber(splitWordNum)) {
            splitWordNum = 0;
            return;
        }

        if (!isValidNumber(blockNum)) {
            blockNum = 0;
            return;
        }

        dialog.destroy();

        await siyuan.setBlockAttrs(bookID, {
            "custom-sy-readonly": "true",
        });

        if (splitWordNum > 0) {
            contentBlocks = await prog.helper.getDocWordCount(contentBlocks);
        }

        await siyuan.pushMsg(prog.plugin.i18n.splitByHeadings);

        let groups = (
            await new HeadingGroup(contentBlocks, headings, bookID).init()
        ).split(); // heading

        groups = splitByBlockCount(groups, blockNum); // block count

        // word num
        if (splitWordNum > 0) {
            await siyuan.pushMsg(
                prog.plugin.i18n.splitByWordCount + ":" + splitWordNum,
            );
            groups = new ContentLenGroup(groups, splitWordNum).split();
        }

        await prog.storage.saveIndex(bookID, groups);
        await prog.storage.resetBookReadingPoint(bookID);
        await prog.storage.toggleAutoCard(bookID, autoCard);
        await prog.storage.setAddingIndex2paragraph(bookID, addIndex);
        if (splitType == "i" || splitType == "p" || splitType == "t") {
            await prog.storage.setAutoSplitSentence(bookID, true, splitType);
        } else {
            await prog.storage.disableAutoSplitSentence(bookID);
        }
        prog.startToLearnWithLock(bookID);
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="fn__hr"></div>
<div class="prog-style__id">《{bookName}》</div>
<div class="fn__hr"></div>
<div class="prog-style__id">
    总字数：{wordCount}<br />
    各级标题数：{headCount}<br />
    总块数：{contentBlocks.length}<br />
    平均每个标题下有：{Math.ceil(
        contentBlocks.length / (headCount == 0 ? 1 : headCount),
    )}块<br />
    平均每个块有：{Math.ceil(wordCount / contentBlocks.length)}字
</div>
<div class="fn__hr"></div>
<div class="prog-style__id">1、{prog.plugin.i18n.splitByHeadings}</div>
<input type="text" class="prog-style__input" bind:value={headingsText} />
<div class="fn__hr"></div>
<div class="prog-style__id">2、{prog.plugin.i18n.splitByBlockCount}</div>
<input type="number" class="prog-style__input" min="0" bind:value={blockNum} />
<div class="fn__hr"></div>
<div class="prog-style__id">3、{prog.plugin.i18n.splitByWordCount}</div>
<input
    type="number"
    class="prog-style__input"
    min="0"
    bind:value={splitWordNum}
/>
<div class="fn__hr"></div>
<label title={prog.plugin.i18n.autoCard}>
    把阅读到的分片设置为闪卡
    <input
        type="checkbox"
        class="prog-style__checkbox"
        bind:checked={autoCard}
    />
</label>
<div class="fn__hr"></div>
<label>
    新建分片时，给段落标上序号
    <input
        type="checkbox"
        class="prog-style__checkbox"
        bind:checked={addIndex}
    />
</label>
<div class="fn__hr"></div>
{#each ["p", "t", "i", "no"] as t}
    <label>
        <input type="radio" name="scoops" value={t} bind:group={splitType} />
        {t == "no" ? "不断句" : ""}
        {t == "p" ? "断句为段落块" : ""}
        {t == "t" ? "断句为任务块" : ""}
        {t == "i" ? "断句为无序表" : ""}
    </label><br />
{/each}
<div class="fn__hr"></div>
<button class="prog-style__button" on:click={process}
    >{prog.plugin.i18n.addOrReaddDoc}</button
>
<div class="fn__hr"></div>

<style>
</style>
