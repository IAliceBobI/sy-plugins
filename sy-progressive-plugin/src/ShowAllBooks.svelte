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
        ignored: boolean;
        autoCard: boolean;
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
            ret.ignored = ret.bookInfo.ignored === "yes";
            ret.autoCard = ret.bookInfo.autoCard === "yes";
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
    }
    async function btnToggleAutoCard(bookID: string) {
        await prog.storage.toggleAutoCard(bookID);
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
    <table>
        <thead>
            <tr>
                <th>书名</th>
                <th>进度</th>
                <th>忽略</th>
                <th>制卡</th>
                <th>阅读</th>
                <th>分片</th>
                <th>删除</th>
            </tr>
        </thead>
        <tbody>
            {#each books.slice().reverse() as book}
                <tr>
                    <td class="prog-style__id">
                        {book.row.content}
                    </td>
                    <td class="prog-style__id">
                        {Math.ceil(
                            (book.bookInfo.point / book.bookIndex.length) * 100,
                        )}%
                    </td>
                    <td
                        class="prog-style__id"
                        title={prog.plugin.i18n.ignoreTxt +
                            book.bookInfo.ignored}
                    >
                        <input
                            type="checkbox"
                            bind:checked={book.ignored}
                            on:click={() => btnToggleIgnoreBook(book.bookID)}
                        />
                    </td>
                    <td
                        class="prog-style__id"
                        title={prog.plugin.i18n.autoCard +
                            book.bookInfo.autoCard}
                    >
                        <input
                            type="checkbox"
                            bind:checked={book.autoCard}
                            on:click={() => btnToggleAutoCard(book.bookID)}
                        />
                    </td>
                    <td>
                        <button
                            title="阅读《{book.row.content}》"
                            class="prog-style__button"
                            on:click={() => btnStartToLearn(book.bookID)}
                            >📖</button
                        >
                    </td>
                    <td>
                        <button
                            title="重新分片《{book.row.content}》"
                            class="prog-style__button"
                            on:click={() =>
                                btnAddProgressiveReadingWithLock(book.bookID)}
                            >🍕</button
                        >
                    </td>
                    <td>
                        <button
                            title="删除《{book.row
                                .content}》（不删除已经产生的文件）"
                            class="prog-style__button"
                            on:click={() =>
                                btnConfirm(book.bookID, book.row.content)}
                            >🗑️</button
                        >
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{:else}
    <h1>加载中……</h1>
{/if}

<style>
</style>
