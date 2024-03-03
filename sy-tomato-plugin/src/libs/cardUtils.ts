import { events } from "./Events";
import { CUSTOM_RIFF_DECKS } from "./gconst";
import { isValidNumber, siyuan, timeUtil } from "./utils";

export async function removeDocCards(docID: string) {
    if (!docID) return;
    const ids = (await siyuan.sql(`select block_id as id from attributes 
        where name="${CUSTOM_RIFF_DECKS}"
        and root_id="${docID}"
        limit 30000
    `)).map(row => row.id);
    await siyuan.removeRiffCards(ids);
}

export async function doStopCards(days: string, blocks: GetCardRetBlock[]) {
    if (isValidNumber(Number(days))) {
        let datetimeStr = await siyuan.currentTime(Number(days) * 24 * 60 * 60);
        const datetimeStrDue = await siyuan.currentTime((Number(days) - 1) * 24 * 60 * 60); // TODO: XX
        datetimeStr = timeUtil.makesureDateTimeFormat(datetimeStr);
        if (datetimeStr) {
            const newAttrs = {} as AttrType;
            newAttrs["custom-card-priority-stop"] = datetimeStr;
            newAttrs.bookmark = "🛑 Suspended Cards";
            await siyuan.batchSetBlockAttrs(blocks.map(b => {
                return { id: b.ial.id, attrs: newAttrs };
            }));
            const due = datetimeStrDue.replace(/[- :]/g, "");
            console.log(blocks, due);
            await siyuan.batchSetRiffCardsDueTimeByBlockID(blocks.map(b => {
                return {
                    id: b.ial.id,
                    due,
                };
            }));
            setTimeout(() => {
                events.protyleReload();
            }, 500);
            await siyuan.pushMsg(`推迟${blocks.length}个闪卡${days}天`);
        }
    }
}