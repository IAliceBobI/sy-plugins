<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Dialog, confirm } from "siyuan";
    import { chunks, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
    import { prog } from "./Progressive";
    import { BookInfo } from "./helper";

    type TaskType = [string, BookInfo, string[][], Block];

    export let dialog: Dialog;

    let books: TaskType[];

    onMount(async () => {
        const tasks = Object.entries(prog.storage.booksInfos())
            .map(([bookID]) => {
                const bookInfo = prog.storage.booksInfo(bookID);
                const idx = prog.storage.loadBookIndexIfNeeded(bookID);
                const row = siyuan.sqlOne(
                    `select content from blocks where type='d' and id="${bookID}"`,
                );
                return [bookID, bookInfo, idx, row];
            })
            .flat();
        books = chunks(await Promise.all(tasks), 4) as TaskType[];

        // for (const [bookID, bookInfo, idx, row] of books.reverse()) {
        //     const subDiv = help.appendChild(div, "div", "", [
        //         "prog-style__container_div",
        //     ]);
        //     let name = bookID;
        //     if (row) name = row["content"];
        //     const progress = `${Math.ceil((bookInfo.point / idx.length) * 100)}%`;
        //     help.appendChild(subDiv, "p", name, ["prog-style__id"]);
        //     help.appendChild(subDiv, "p", progress, ["prog-style__id"]);
        //     help.appendChild(
        //         subDiv,
        //         "button",
        //         this.plugin.i18n.Reading,
        //         ["prog-style__button"],
        //         () => {
        //             this.startToLearnWithLock(bookID);
        //             dialog.destroy();
        //         },
        //     );
        //     help.appendChild(
        //         subDiv,
        //         "button",
        //         this.plugin.i18n.ignoreTxt + ` ${bookInfo.ignored}`,
        //         ["prog-style__button"],
        //         () => {
        //             this.storage.toggleIgnoreBook(bookID);
        //             dialog.destroy();
        //             this.viewAllProgressiveBooks();
        //         },
        //     );
        //     help.appendChild(
        //         subDiv,
        //         "button",
        //         this.plugin.i18n.autoCard + ` ${bookInfo.autoCard}`,
        //         ["prog-style__button"],
        //         () => {
        //             this.storage.toggleAutoCard(bookID);
        //             dialog.destroy();
        //             this.viewAllProgressiveBooks();
        //         },
        //     );
        //     help.appendChild(
        //         subDiv,
        //         "button",
        //         this.plugin.i18n.Repiece,
        //         ["prog-style__button"],
        //         () => {
        //             this.addProgressiveReadingWithLock(bookID);
        //             dialog.destroy();
        //         },
        //     );
        //     help.appendChild(
        //         subDiv,
        //         "button",
        //         this.plugin.i18n.Delete,
        //         ["prog-style__button"],
        //         () => {
        //             confirm(
        //                 "⚠️",
        //                 "只删除记录与辅助数据，不删除分片，不删除闪卡等。<br>删除：" +
        //                     name,
        //                 async () => {
        //                     await this.storage.removeIndex(bookID);
        //                     div.removeChild(subDiv);
        //                 },
        //             );
        //         },
        //     );
        // }
    });

    onDestroy(async () => {});

    async function btnStartToLearn(bookID: string) {
        await prog.startToLearnWithLock(bookID);
        dialog.destroy();
    }
    async function btnToggleIgnoreBook(bookID: string) {
        prog.storage.toggleIgnoreBook(bookID);
        dialog.destroy();
        prog.viewAllProgressiveBooks();
    }
    async function btnToggleAutoCard(bookID: string) {
        prog.storage.toggleAutoCard(bookID);
        dialog.destroy();
        prog.viewAllProgressiveBooks();
    }
    async function btnAddProgressiveReadingWithLock(bookID: string) {
        prog.addProgressiveReadingWithLock(bookID);
        dialog.destroy();
    }
    async function btnConfirm(bookID: string) {
        confirm(
            "⚠️",
            "只删除记录与辅助数据，不删除分片，不删除闪卡等。<br>删除：" + name,
            async () => {
                await prog.storage.removeIndex(bookID);
                dialog.destroy();
                prog.viewAllProgressiveBooks();
            },
        );
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
{#if books}
    {#each books as [bookID, bookInfo, idx, { content: name }]}
        <div class="prog-style__container_div">
            <p class="prog-style__id">
                {name}
            </p>
            <p class="prog-style__id">
                {Math.ceil((bookInfo.point / idx.length) * 100)}%
            </p>
            <button
                class="prog-style__button"
                on:click={() => btnStartToLearn(bookID)}
                >{prog.plugin.i18n.Reading}</button
            >
            <button
                class="prog-style__button"
                on:click={() => btnToggleIgnoreBook(bookID)}
                >{prog.plugin.i18n.ignoreTxt + bookInfo.ignored}</button
            >
            <button
                class="prog-style__button"
                on:click={() => btnToggleAutoCard(bookID)}
                >{prog.plugin.i18n.autoCard + bookInfo.autoCard}</button
            >
            <button
                class="prog-style__button"
                on:click={() => btnAddProgressiveReadingWithLock(bookID)}
                >{prog.plugin.i18n.Repiece}</button
            >
            <button
                class="prog-style__button"
                on:click={() => btnConfirm(bookID)}
                >{prog.plugin.i18n.Delete}</button
            >
        </div>
    {/each}
{:else}
    <h1>加载中……</h1>
{/if}

<style>
</style>
