<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Dialog, confirm } from "siyuan";
    import { chunks, siyuan } from "../../sy-tomato-plugin/src/libs/utils";
    import { prog } from "./Progressive";

    type TaskType = {
        bookID: string;
        bookInfo: BookInfo;
        row: Block;
        bookIndex: string[][];
    };

    const MAXBOOKNAME = 10;

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
            if (!ret.row.content) ret.row.content = "(找不到此书籍)";
            return ret;
        });
    }

    onDestroy(async () => {});

    async function btnStartToLearn(bookID: string) {
        await prog.startToLearnWithLock(bookID);
        dialog.destroy();
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
                    if (book.bookID == bookID) return true;
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
                <th>序号</th>
                <th>书名</th>
                <th>进度</th>
                <th>速度</th>
                <th>忽略</th>
                <th>制卡</th>
                <th>标号</th>
                <th>末尾</th>
                <th>断句p</th>
                <th>断句t</th>
                <th>断句i</th>
                <th>阅读</th>
                <th>重分</th>
                <th>删除</th>
            </tr>
        </thead>
        <tbody>
            {#each books.slice().reverse() as book, i}
                <tr>
                    <td class="prog-style__id">
                        {i + 1}
                    </td>

                    <td class="prog-style__id" title={book.row.content}>
                        {book.row.content.slice(
                            0,
                            MAXBOOKNAME,
                        )}{#if book.row.content.length > MAXBOOKNAME}...{/if}
                    </td>

                    <td class="prog-style__id">
                        {Math.ceil(
                            (book.bookInfo.point / book.bookIndex.length) * 100,
                        )}%
                    </td>

                    <td
                        class="prog-style__id"
                        title={"快速生成分片[但一些书籍可能与原文样式有出入]" +
                            !!book.bookInfo.fastInsert}
                    >
                        <input
                            type="checkbox"
                            bind:checked={book.bookInfo.fastInsert}
                            on:click={() =>
                                prog.storage.setFastInsert(
                                    book.bookID,
                                    !book.bookInfo.fastInsert,
                                )}
                        />
                    </td>

                    <td
                        class="prog-style__id"
                        title={prog.plugin.i18n.ignoreTxt +
                            !!book.bookInfo.ignored}
                    >
                        <input
                            type="checkbox"
                            bind:checked={book.bookInfo.ignored}
                            on:click={() =>
                                prog.storage.setIgnoreBook(
                                    book.bookID,
                                    !book.bookInfo.ignored,
                                )}
                        />
                    </td>

                    <td
                        class="prog-style__id"
                        title={prog.plugin.i18n.autoCard +
                            !!book.bookInfo.autoCard}
                    >
                        <input
                            type="checkbox"
                            bind:checked={book.bookInfo.autoCard}
                            on:click={() =>
                                prog.storage.toggleAutoCard(book.bookID)}
                        />
                    </td>

                    <td
                        class="prog-style__id"
                        title={"给分片内段落标上序号" +
                            book.bookInfo.addIndex2paragraph}
                    >
                        <input
                            type="checkbox"
                            bind:checked={book.bookInfo.addIndex2paragraph}
                            on:click={() =>
                                prog.storage.setAddingIndex2paragraph(
                                    book.bookID,
                                    !book.bookInfo.addIndex2paragraph,
                                )}
                        />
                    </td>

                    <td
                        class="prog-style__id"
                        title={"显示上一分片最后一个内容块" +
                            !!book.bookInfo.showLastBlock}
                    >
                        <input
                            type="checkbox"
                            bind:checked={book.bookInfo.showLastBlock}
                            on:click={() =>
                                prog.storage.setShowLastBlock(
                                    book.bookID,
                                    !book.bookInfo.showLastBlock,
                                )}
                        />
                    </td>

                    <td
                        class="prog-style__id"
                        title={"自动断句为段落块" +
                            !!book.bookInfo.autoSplitSentenceP}
                    >
                        <input
                            type="checkbox"
                            bind:checked={book.bookInfo.autoSplitSentenceP}
                            on:click={() =>
                                prog.storage.setAutoSplitSentence(
                                    book.bookID,
                                    !book.bookInfo.autoSplitSentenceP,
                                    "p",
                                )}
                        />
                    </td>

                    <td
                        class="prog-style__id"
                        title={"自动断句为任务列表" +
                            !!book.bookInfo.autoSplitSentenceT}
                    >
                        <input
                            type="checkbox"
                            bind:checked={book.bookInfo.autoSplitSentenceT}
                            on:click={() =>
                                prog.storage.setAutoSplitSentence(
                                    book.bookID,
                                    !book.bookInfo.autoSplitSentenceT,
                                    "t",
                                )}
                        />
                    </td>

                    <td
                        class="prog-style__id"
                        title={"自动断句为无序列表" +
                            !!book.bookInfo.autoSplitSentenceI}
                    >
                        <input
                            type="checkbox"
                            bind:checked={book.bookInfo.autoSplitSentenceI}
                            on:click={() =>
                                prog.storage.setAutoSplitSentence(
                                    book.bookID,
                                    !book.bookInfo.autoSplitSentenceI,
                                    "i",
                                )}
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
