import { App, openTab } from "siyuan";
import { siyuan } from "./utils";
import { events } from "./Events";
import { READINGPOINT } from "./gconst";

export async function gotoBookmark(docID: string, app: App) {
    const rows = await siyuan.sqlAttr(`select * from attributes where name='${READINGPOINT}' and root_id='${docID}'`);
    for (const row of rows) {
        await openTab({
            app,
            doc: {
                id: row.block_id,
                zoomIn: false,
                action: ["cb-get-hl", "cb-get-context"],
            },
        });
        break;
    }
    if (rows.length == 0) await siyuan.pushMsg("当前文档无书签", 2000);
}

export async function removeReadingPoint(docID: string) {
    const rows = await siyuan.sqlAttr(`select * from attributes where name='${READINGPOINT}' and root_id='${docID}'`);
    await siyuan.deleteBlocks(rows.map(row => row.block_id));
    await siyuan.removeRiffCards(rows.map(row => row.block_id));
}

export async function rmTodoBookmark(docID: string) {
    const rows = await siyuan.sqlAttr(`select * from attributes where name='bookmark' and value='🚩' and root_id='${docID}'`);
    await siyuan.batchSetBlockAttrs(rows.map(row => {
        return { id: row.block_id, attrs: { bookmark: "" } as AttrType };
    }));
    events.protyleReload();
}

export async function addTodoBookmark(ids: string[]) {
    for (const id of ids) {
        const attr = await siyuan.getBlockAttrs(id);
        if (attr.bookmark == "🚩")
            await siyuan.setBlockAttrs(id, { bookmark: "" } as AttrType);
        else if (!attr.bookmark)
            await siyuan.setBlockAttrs(id, { bookmark: "🚩" } as AttrType);
    }
}
