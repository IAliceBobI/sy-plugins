import { events } from "./Events";
import { BlockNodeEnum, CUSTOM_RIFF_DECKS, DATA_NODE_ID, DATA_NODE_INDEX, DATA_TYPE } from "./gconst";
import { dom2div, siyuan } from "./utils";

export async function delAllchecked(docID: string) {
    const kramdowns = await Promise.all((await siyuan.sql(`select id from blocks 
        where type='i' and subType='t' and root_id="${docID}"
        and markdown like "* [X] %"
        limit 30000
    `)).map(b => siyuan.getBlockKramdown(b.id)));
    await siyuan.deleteBlocks(kramdowns.map(b => b.id));
    await siyuan.pushMsg(`删除了${kramdowns.length}个任务`);
}

export async function uncheckAll(docID: string) {
    const doms = await Promise.all((await siyuan.sql(`select id from blocks 
        where type='i' and subType='t' and root_id="${docID}"
        and markdown like "* [X] %"
        limit 30000
    `)).map(b => siyuan.getBlockDOM(b.id)));
    await siyuan.updateBlocks(doms.map(({ id, dom }) => {
        const div = dom2div(dom);
        div.classList.remove("protyle-task--done");
        return { id, domStr: div.outerHTML };
    }));
    setTimeout(() => {
        events.protyleReload();
    }, 1000);
    await siyuan.pushMsg(`取消了${doms.length}个任务`);
}

export async function addFlashCard(element: HTMLElement) {
    if (!element) return;
    const { id, isCard } = findListTypeByElement(element);
    if (id) {
        if (!isCard) {
            await siyuan.addRiffCards([id]);
        } else {
            await siyuan.removeRiffCards([id]);
        }
    }
}

function findListTypeByElement(e: HTMLElement) {
    let id: string;
    let isCard: boolean;
    for (let i = 0; i < 1000 && e; i++, e = e.parentElement) {
        const tmpID = e.getAttribute(DATA_NODE_ID);
        const dataType = e.getAttribute(DATA_TYPE);
        if (tmpID && e.hasAttribute(DATA_NODE_INDEX) && dataType == BlockNodeEnum.NODE_LIST) {
            id = tmpID;
            isCard = e.hasAttribute(CUSTOM_RIFF_DECKS);
        }
    }
    return { id, isCard };
}
