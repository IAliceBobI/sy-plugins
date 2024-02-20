import { siyuan } from "./utils";

export async function delAllchecked(docID: string) {
    const kramdowns = await Promise.all((await siyuan.sql(`select id from blocks 
        where type='i' and subType='t' and root_id="${docID}"
        and markdown like "* [X] %"
        limit 30000
    `)).map(b => siyuan.getBlockKramdown(b.id)));
    await siyuan.safeDeleteBlocks(kramdowns.map(b => b.id));
    await siyuan.pushMsg(`删除了${kramdowns.length}个任务`);
}

export async function uncheckAll(docID: string) {
    const kramdowns = await Promise.all((await siyuan.sql(`select id from blocks 
        where type='i' and subType='t' and root_id="${docID}"
        and markdown like "* [X] %"
        limit 30000
    `)).map(b => siyuan.getBlockKramdown(b.id)));

    await Promise.all(kramdowns.map(({ id, kramdown }) => {
        const newKramdown = kramdown.replace("}[X] ", "}[ ] ");
        return siyuan.updateBlock(id, newKramdown);
    }));

    await siyuan.pushMsg(`取消了${kramdowns.length}个任务`);
}

