import { CUSTOM_RIFF_DECKS } from "./gconst";
import { siyuan } from "./utils";

export async function removeDocCards(docID: string) {
    if (!docID) return;
    const ids = (await siyuan.sql(`select block_id as id from attributes 
        where name="${CUSTOM_RIFF_DECKS}"
        and root_id="${docID}"
        limit 30000
    `)).map(row => row.id);
    await siyuan.removeRiffCards(ids);
}
