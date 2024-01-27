<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Dialog } from "siyuan";

    export let dialog: Dialog;

    let wordCount = 0;

    onMount(async () => {
        // const tasks = Object.entries(this.storage.booksInfos())
        //     .filter(([_bookID]) => {
        //         // if(_bookID=="20231124021105-errwtja")
        //         return true;
        //     })
        //     .map(([bookID]) => {
        //         const bookInfo = this.storage.booksInfo(bookID);
        //         const idx = this.storage.loadBookIndexIfNeeded(bookID);
        //         const row = siyuan.sqlOne(
        //             `select content from blocks where type='d' and id="${bookID}"`,
        //         );
        //         return [bookID, bookInfo, idx, row];
        //     })
        //     .flat();
        // const books = utils.chunks(await Promise.all(tasks), 4) as [
        //     string,
        //     help.BookInfo,
        //     string[][],
        //     Block,
        // ][];
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
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="fn__hr"></div>

<style>
</style>
