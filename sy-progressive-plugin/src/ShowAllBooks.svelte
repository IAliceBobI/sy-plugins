<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Dialog, confirm } from "siyuan";
    import { chunks, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
    import { prog } from "./Progressive";
    import { BookInfo } from "./helper";

    type TaskType = {
        bookID: string;
        bookInfo: BookInfo;
        row: Block;
        bookIndex: string[][];
    };

    export let dialog: Dialog;

    let books: TaskType[];

    onMount(async () => {
        await loadBooks();
    });

    async function loadBooks() {
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
        books = chunks(await Promise.all(tasks), 4).map(([a, b, c, d]) => {
            const ret = {} as TaskType;
            ret.bookID = a as any;
            ret.bookInfo = b as any;
            ret.bookIndex = c as any;
            ret.row = d as any;
            return ret;
        });
    }

    onDestroy(async () => {});

    async function btnStartToLearn(bookID: string) {
        await prog.startToLearnWithLock(bookID);
        dialog.destroy();
    }
    async function btnToggleIgnoreBook(bookID: string) {
        await prog.storage.toggleIgnoreBook(bookID);
        await loadBooks();
    }
    async function btnToggleAutoCard(bookID: string) {
        await prog.storage.toggleAutoCard(bookID);
        await loadBooks();
    }
    async function btnAddProgressiveReadingWithLock(bookID: string) {
        prog.addProgressiveReadingWithLock(bookID);
        dialog.destroy();
    }
    async function btnConfirm(bookID: string, name: string) {
        confirm(
            "⚠️",
            "只删除记录与辅助数据，不删除分片，不删除闪卡等。<br>删除：" + name,
            async () => {
                await prog.storage.removeIndex(bookID);
                const idx = books.findIndex((book) => {
                    if (book[0] == bookID) return true;
                });
                if (idx != -1) {
                    books.splice(idx, 1);
                    books = books;
                }
            },
        );
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
{#if books}
    {#each books.slice().reverse() as { bookID, bookInfo, bookIndex, row }}
        <div class="prog-style__container_div">
            <p class="prog-style__id">
                {row.content}
            </p>
            <p class="prog-style__id">
                {Math.ceil((bookInfo.point / bookIndex.length) * 100)}%
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
                on:click={() => btnConfirm(bookID, row.content)}
                >{prog.plugin.i18n.Delete}</button
            >
        </div>
    {/each}
{:else}
    <h1>加载中……</h1>
{/if}

<style>
</style>
