import { App, openTab } from "siyuan";
import { siyuan } from "./utils";

export async function gotoBookmark(docID: string, app: App, remove = false) {
    const rows = await siyuan.sqlAttr(`select * from attributes where name='bookmark' and root_id='${docID}'`);
    const id = rows?.pop()?.block_id;
    if (id) {
        await openTab({
            app,
            doc: {
                id,
                zoomIn: false,
                action: ["cb-get-hl", "cb-get-context"],
            },
        });
        if (remove) {
            await siyuan.removeRiffCards([id]);
            await siyuan.deleteBlocks([id]);
        }
    } else {
        await siyuan.pushMsg("当前文档无书签", 2000);
    }
}