<script lang="ts">
    import { onMount } from "svelte";
    import { prog } from "./Progressive";
    import {
        isValidNumber,
        siyuan,
    } from "../../sy-tomato-plugin/src/libs/utils";
    import { WordCountType } from "./helper";

    export let bookID: string;
    export let bookName: string;
    export let boxID: string;

    let wordCount = 0;
    let headCount = 0;
    let contentBlocks: WordCountType[] = [];
    let headingsText = "1,2,3,4,5,6,b";
    let autoCard = false;
    let blockNum = 0;
    let splitWordNum = 0;

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

        //     const splitLen = Number(LengthSplitInput.value.trim());
        //     if (!utils.isValidNumber(splitLen)) {
        //         LengthSplitInput.value = "0";
        //         return;
        //     }

        //     const blockNumber = Number(BlockNumInput.value.trim());
        //     if (!utils.isValidNumber(blockNumber)) {
        //         BlockNumInput.value = "0";
        //         return;
        //     }

        //     dialog.destroy();
        //     await siyuan.setBlockAttrs(bookID, {
        //         "custom-sy-readonly": "true",
        //     });

        //     if (splitLen > 0) {
        //         contentBlocks =
        //             await this.helper.getDocWordCount(contentBlocks);
        //     }

        //     await siyuan.pushMsg(this.plugin.i18n.splitByHeadings);
        //     let groups = (
        //         await new help.HeadingGroup(
        //             contentBlocks,
        //             headings,
        //             bookID,
        //         ).init()
        //     ).split();
        //     groups = help.splitByBlockCount(groups, blockNumber);
        //     if (splitLen > 0) {
        //         await siyuan.pushMsg(
        //             this.plugin.i18n.splitByWordCount + ":" + splitLen,
        //         );
        //         groups = new help.ContentLenGroup(groups, splitLen).split();
        //     }
        //     await this.storage.saveIndex(bookID, groups);
        //     await this.storage.resetBookReadingPoint(bookID);
        //     if (!autoCardBox.checked) {
        //         await this.storage.toggleAutoCard(bookID, "no");
        //     } else {
        //         await this.storage.toggleAutoCard(bookID, "yes");
        //     }
        //     this.startToLearnWithLock(bookID);
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
<div title="把阅读到的分片设置为闪卡">
    <span class="prog-style__id">{prog.plugin.i18n.autoCard}</span>
    <input
        type="checkbox"
        class="prog-style__checkbox"
        bind:checked={autoCard}
    />
</div>
<div class="fn__hr"></div>
<button class="prog-style__button" on:click={process}
    >{prog.plugin.i18n.addOrReaddDoc}</button
>
<div class="fn__hr"></div>

<style>
</style>
