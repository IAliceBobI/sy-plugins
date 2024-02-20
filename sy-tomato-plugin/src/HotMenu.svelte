<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Dialog, IProtyle, openTab } from "siyuan";
    import { events } from "./libs/Events";
    import {
        DATA_NODE_ID,
        PROTYLE_WYSIWYG_SELECT,
        TOMATO_BK_IGNORE,
    } from "./libs/gconst";
    import { NewNodeID, cleanText, siyuan, siyuanCache } from "./libs/utils";
    import { BaiduAI, ChatContext } from "./libs/baiduAI";
    import { EnumUtils } from "./libs/EnumUtils";
    import { STORAGE_SETTINGS } from "./constants";
    import { hotMenuBox } from "./HotMenuBox";

    enum InsertPlace {
        here = "1#当前位置",
        dailynote = "2#今日笔记",
        subdoc = "3#子文档",
    }
    const insertPlaceMap = new EnumUtils(InsertPlace);
    const getIdx = (v: InsertPlace) => insertPlaceMap.getItem(v).idx;

    export let dialog: Dialog;
    export let protyle: IProtyle;

    const attrs = {};
    let element: HTMLElement;
    let selected: HTMLElement[] = [];
    let docID: string;
    let anchorID: string;
    let insertPlace: number;
    let aiAPI: BaiduAI;

    onMount(async () => {
        element = protyle?.wysiwyg?.element;
        docID = protyle?.block?.rootID;
        if (!element || !docID) return;

        attrs[TOMATO_BK_IGNORE] = "1";
        selected = [
            ...element.querySelectorAll(`.${PROTYLE_WYSIWYG_SELECT}`),
        ] as any;
        if (selected.length == 0) {
            const e = element.querySelector(
                `[${DATA_NODE_ID}="${events.lastBlockID}"]`,
            ) as HTMLElement;
            if (e) selected.push(e);
        }
        selected.slice(-1).forEach((i) => {
            anchorID = i.getAttribute(DATA_NODE_ID);
        });
        insertPlace =
            hotMenuBox.settingCfg["ai-return-insert-place"] ??
            getIdx(InsertPlace.here);

        aiAPI = new BaiduAI(
            hotMenuBox.settingCfg["ernie-bot-4-ak"],
            hotMenuBox.settingCfg["ernie-bot-4-sk"],
        );
    });

    function getAllText() {
        return selected
            .map((e) => {
                const txt = e.textContent || e.innerText;
                return cleanText(txt);
            })
            .filter((t) => !!t)
            .reduce((list, t) => {
                list.push(t);
                return list;
            }, [])
            .join("\n");
    }

    onDestroy(destroy);

    function destroy() {
        dialog.destroy();
    }

    async function ai(ctx: ChatContext, text: string) {
        destroy();
        await siyuan.pushMsg(text.slice(0, 100), 2000);
        const ai = await aiAPI.chatCompletionsPro(ctx, text);
        if (!ai?.usage?.completion_tokens) {
            return siyuan.pushMsg(JSON.stringify(ai));
        }
        const newID = NewNodeID();
        const result = `${ai.result}\n${JSON.stringify(ai.usage)}\n{: id="${newID}" }`;
        const open = async () => {
            await openTab({
                app: hotMenuBox.plugin.app,
                doc: {
                    id: newID,
                    zoomIn: false,
                    action: ["cb-get-hl", "cb-get-context"],
                },
                position: "right",
            });
        };
        if (insertPlace == getIdx(InsertPlace.dailynote)) {
            const { id } = await siyuan.createDailyNote(events.boxID);
            await siyuan.appendBlock(result, id);
            if (id != events.docID) await open();
        } else if (insertPlace == getIdx(InsertPlace.here)) {
            if (anchorID) await siyuan.insertBlockAfter(result, anchorID);
        } else if (insertPlace == getIdx(InsertPlace.subdoc)) {
            const docID = await siyuan.getDocIDByBlockID(anchorID);
            const row = await siyuan.getDocRowByBlockID(docID);
            let hpath = row?.hpath;
            if (hpath) {
                hpath += "/ai";
                const id = await siyuanCache.createDocWithMdIfNotExists(
                    6000,
                    events.boxID,
                    hpath,
                    "",
                );
                await siyuan.appendBlock(result, id);
                if (id != events.docID) await open();
            }
        }
    }

    async function compare() {
        const text = getAllText();
        const prompt = `
资料1：\n
${text.replace("===", "\n资料2：\n")}
\n-----\n
请从人物、对话、情节等方面，对资料1与资料2两段文字，进行全面对比，并分析各自的优缺点，给出建议，帮助我何改进资料2。
`.trim();
        await navigator.clipboard.writeText(prompt.trim());
        destroy();
    }

    async function cleanWX() {
        const tasks = selected
            .map((e) => {
                const id = e.getAttribute(DATA_NODE_ID);
                return { id, txt: e.textContent.replace(/^.*?:\n/, "") };
            })
            .map(({ id, txt }) => siyuan.safeUpdateBlock(id, txt));
        await Promise.all(tasks);
        destroy();
    }

    async function copyDoc() {
        const mds = (
            await Promise.all(
                (await siyuan.getChildBlocks(docID)).map((i) =>
                    siyuan.getBlockMarkdownAndContent(i.id),
                ),
            )
        ).map((b) => b.markdown);
        await navigator.clipboard.writeText(mds.join("\n"));
        destroy();
    }

    async function copyText() {
        const text = getAllText();
        await navigator.clipboard.writeText(text.trim());
        destroy();
    }

    async function copyExpandPrompt() {
        const text = getAllText();
        if (text) {
            const prompt = `
${text}
-------------------
请将以上文字扩写，以对话为主。
`;
            await navigator.clipboard.writeText(prompt.trim());
            destroy();
        }
    }

    async function copyCompressPrompt(copy?: boolean) {
        const text = getAllText();
        let prompt = "";
        if (text) {
            prompt = `
${text}
-------------------
请将以上文字压缩到最简，保留核心信息。
`.trim();
            if (copy) await navigator.clipboard.writeText(prompt);
        }
        destroy();
        return prompt;
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="protyle-wysiwyg">
    <table>
        <tbody>
            <tr>
                <td title="注册后，创建应用，复制API Key与Secret Key即可">
                    <a
                        href="https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application"
                        >注册AI</a
                    >
                </td>
                <td>
                    <input placeholder="API Key" />
                </td>
                <td>
                    <input placeholder="Secret Key" />
                </td>
            </tr>
            <tr>
                <td>
                    <select
                        title="AI回复位置"
                        bind:value={insertPlace}
                        on:change={() => {
                            hotMenuBox.settingCfg["ai-return-insert-place"] =
                                insertPlace;
                            hotMenuBox.plugin.saveData(
                                STORAGE_SETTINGS,
                                hotMenuBox.settingCfg,
                            );
                        }}
                    >
                        {#each [...insertPlaceMap.map.values()] as item}
                            <option value={item.idx}>
                                {item.text}
                            </option>
                        {/each}
                    </select>
                </td>
                <td>
                    <button
                        title="清空与AI对话历史"
                        class="b3-button"
                        on:click={() => {
                            let a = hotMenuBox.ctx4k.clear();
                            a += hotMenuBox.ctx8k.clear();
                            siyuan.pushMsg(`清理了${a}个tokens`, 3000);
                        }}>🤖💬🧹</button
                    >
                </td>
            </tr>

            <tr>
                <td>
                    <button
                        title="复制选择文本、光标所在文本"
                        class="b3-button"
                        on:click={copyText}>📋文本复制</button
                    >
                </td>
                <td>
                    <button
                        title="复制当前文档"
                        class="b3-button"
                        on:click={copyDoc}>📜📋全文复制</button
                    >
                </td>
                <td>
                    <button
                        title="总结内容"
                        class="b3-button"
                        on:click={async () => {
                            await ai(
                                hotMenuBox.ctx4k,
                                await copyCompressPrompt(false),
                            );
                        }}>🗜️压缩内容</button
                    >
                    <button
                        title="复制提示词"
                        class="b3-button"
                        on:click={async () => await copyCompressPrompt(true)}
                        >📜</button
                    >
                </td>
                <td>
                    <button
                        title="展开内容"
                        class="b3-button"
                        on:click={copyExpandPrompt}>🌲扩写内容</button
                    >
                </td>
            </tr>
            <tr>
                <td>
                    <button
                        title="复制微信多个对话后，清理对话开头的人名"
                        class="b3-button"
                        on:click={cleanWX}>💬🧹微信对话</button
                    >
                </td>
                <td>
                    <button
                        title="对比内容"
                        class="b3-button"
                        on:click={compare}>🆚</button
                    >
                </td>
                <td>
                    <button
                        title="文心一言4"
                        class="b3-button"
                        on:click={async () => {
                            await ai(hotMenuBox.ctx4k, "");
                        }}>🤖</button
                    >
                </td>
                <td>
                    <button
                        title="文心一言4(8K)"
                        class="b3-button"
                        on:click={async () => {
                            await ai(hotMenuBox.ctx8k, "");
                        }}>🤖8K</button
                    >
                </td>
            </tr>
        </tbody>
    </table>
</div>

<style>
</style>
