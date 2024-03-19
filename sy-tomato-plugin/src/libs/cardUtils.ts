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
    const numDays = Number(days);
    if (isValidNumber(numDays)) {
        const datetimeStr = timeUtil.dateFormat(timeUtil.now(numDays * 24 * 60 * 60));
        const due = timeUtil.getYYYYMMDDHHmmssPlus0(timeUtil.nowts(numDays * 24 * 60 * 60));
        const newAttrs = {} as AttrType;
        if (numDays <= 0) {
            newAttrs["custom-card-priority-stop"] = "";
            newAttrs.bookmark = "";
        } else {
            newAttrs["custom-card-priority-stop"] = datetimeStr;
            newAttrs.bookmark = "🛑 Suspended Cards";
        }
        await siyuan.batchSetBlockAttrs(blocks.map(b => {
            return { id: b.ial.id, attrs: newAttrs };
        }));
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

export function pressSpace() {
    const btnSpace = document.body.querySelector(
        'button[data-type="-1"]',
    ) as HTMLButtonElement;
    if (btnSpace) {
        btnSpace.click();
        return true;
    }
    return false;
}

export function pressSkip() {
    const btnSkip = document.body.querySelector(
        'button[data-type="-3"]',
    ) as HTMLButtonElement;
    if (btnSkip) {
        btnSkip.click();
        return true;
    }
    return false;
}