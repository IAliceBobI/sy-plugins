
// this.plugin.eventBus.on("ws-main", async ({ detail }) => {
//     if (detail?.cmd == WsActionTypes.transactions) {
//         for (const element of detail.data as TransactionData[]) {
//             for (const ops of element?.doOperations ?? []) {
//                 if (ops?.action == "update" && ops.id) {
//                     const row = await siyuan.getDocRowByBlockID(ops.id);
//                     if (row?.id) {
//                         const attr = (await siyuan.getBlockAttrs(row.id))[MarkKey] ?? "";
//                         const pieceLen = TEMP_CONTENT.length + 1 + "20231229160401-0lfc8qj".length + 1 + 1;
//                         if (attr.startsWith(TEMP_CONTENT + "#") && attr.length >= pieceLen) {
//                             navigator.locks.request(constants.TryAddStarsLock, { ifAvailable: true }, async (lock) => {
//                                 if (lock) {
//                                     for (let i = 0; i < 6; i++) {
//                                         await utils.sleep(4000);
//                                         await this.tryAddRefAttr(row.id);
//                                     }
//                                 }
//                             });
//                         }
//                     }
//                 }
//             }
//         }
//     }
// });