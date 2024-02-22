<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Dialog, IProtyle, openTab } from "siyuan";
    import { events } from "./libs/Events";
    import { DATA_NODE_ID, TOMATO_BK_IGNORE } from "./libs/gconst";
    import {
        NewNodeID,
        cleanText,
        getCursorElement,
        siyuan,
        siyuanCache,
    } from "./libs/utils";
    import { BaiduAI, ChatContext } from "./libs/baiduAI";
    import { EnumUtils } from "./libs/EnumUtils";
    import { STORAGE_SETTINGS } from "./constants";
    import { hotMenuBox } from "./HotMenuBox";
    import { addFlashCard, delAllchecked, uncheckAll } from "./libs/listUtils";
    import { removeDocCards } from "./libs/cardUtils";
    import { cleanBackLinks, insertBackLinks } from "./libs/bkUtils";

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
    let apiKey: string;
    let secretKey: string;
    let insertPlace: number;
    let aiAPI: BaiduAI;

    onMount(async () => {
        attrs[TOMATO_BK_IGNORE] = "1";

        const s = events.selectedDivs(protyle);
        element = s.element;
        docID = s.docID;
        anchorID = s.ids[s.ids.length - 1];
        selected = s.selected;
        if (!element || !docID) return;

        insertPlace =
            hotMenuBox.settingCfg["ai-return-insert-place"] ??
            getIdx(InsertPlace.here);
        initAI();
    });

    function initAI() {
        apiKey = hotMenuBox.settingCfg["ernie-bot-4-ak"];
        secretKey = hotMenuBox.settingCfg["ernie-bot-4-sk"];
        aiAPI = new BaiduAI(apiKey, secretKey);
    }

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
        await siyuan.pushMsg(text.slice(0, 100), 2000);
        const ai = await aiAPI.chatCompletionsPro(ctx, text);
        if (!ai?.usage?.completion_tokens) {
            return siyuan.pushMsg(JSON.stringify(ai));
        }
        const boxID = events.boxID;
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
            const { id } = await siyuan.createDailyNote(boxID);
            await siyuan.appendBlock(result, id);
            if (id != docID) await open();
        } else if (insertPlace == getIdx(InsertPlace.here)) {
            if (anchorID) await siyuan.insertBlockAfter(result, anchorID);
        } else if (insertPlace == getIdx(InsertPlace.subdoc)) {
            const row = await siyuan.getDocRowByBlockID(docID);
            let hpath = row?.hpath;
            if (hpath) {
                hpath += "/ai";
                const id = await siyuanCache.createDocWithMdIfNotExists(
                    6000,
                    boxID,
                    hpath,
                    "",
                );
                await siyuan.appendBlock(result, id);
                if (id != docID) await open();
            }
        }
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

    function saveCfg() {
        hotMenuBox.plugin.saveData(STORAGE_SETTINGS, hotMenuBox.settingCfg);
    }

    compare;
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

    copyExpandPrompt;
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
请压缩并提取中心意思
`.trim();
            if (copy) await navigator.clipboard.writeText(prompt);
        }
        return prompt;
    }
</script>

<!-- https://learn.svelte.dev/tutorial/if-blocks -->
<div class="protyle-wysiwyg">
    <table>
        <tbody>
            <!-- 注册 -->
            <tr>
                <td title="注册后，创建应用，复制API Key与Secret Key即可">
                    <a
                        href="https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application"
                        >注册AI</a
                    >
                </td>
                <td>
                    <input
                        bind:value={apiKey}
                        class="ai-key cfg"
                        title="API Key"
                        placeholder="API Key"
                        on:input={() => {
                            hotMenuBox.settingCfg["ernie-bot-4-ak"] = apiKey;
                            saveCfg();
                            initAI();
                        }}
                    />
                </td>
                <td>
                    <input
                        bind:value={secretKey}
                        class="ai-key cfg"
                        title="Secret Key"
                        placeholder="Secret Key"
                        on:input={() => {
                            hotMenuBox.settingCfg["ernie-bot-4-sk"] = secretKey;
                            saveCfg();
                            initAI();
                        }}
                    />
                </td>
                <td>
                    <select
                        class="cfg"
                        title="AI回复位置"
                        bind:value={insertPlace}
                        on:change={() => {
                            hotMenuBox.settingCfg["ai-return-insert-place"] =
                                insertPlace;
                            saveCfg();
                        }}
                    >
                        {#each [...insertPlaceMap.map.values()] as item}
                            <option value={item.idx}>
                                {item.text}
                            </option>
                        {/each}
                    </select>
                </td>
            </tr>
            <tr>
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
                <td>
                    <button
                        title="复制微信多个对话后，清理对话开头的人名"
                        class="b3-button"
                        on:click={cleanWX}>💬🧹微信</button
                    >
                </td>
                <td>
                    <button
                        title="复制选中的文本、光标所在文本"
                        class="b3-button"
                        on:click={copyText}>📋选中</button
                    >
                </td>
                <td>
                    <button
                        title="复制当前文档"
                        class="b3-button"
                        on:click={copyDoc}>📜📋全文</button
                    >
                </td>
            </tr>
            <tr>
                <td>
                    <button
                        title="文心4:选中内容发给AI，请把问题也一起选中。"
                        class="b3-button"
                        on:click={async () => {
                            await ai(hotMenuBox.ctx4k, getAllText());
                            destroy();
                        }}>🤖文心4</button
                    >
                </td>
                <td>
                    <button
                        title="文心4(8K):选中内容发给AI，请把问题也一起选中。"
                        class="b3-button"
                        on:click={async () => {
                            await ai(hotMenuBox.ctx8k, getAllText());
                            destroy();
                        }}>🤖文心8K</button
                    >
                </td>
                <td>
                    <button
                        title="AI总结内容"
                        class="b3-button"
                        on:click={async () => {
                            await ai(
                                hotMenuBox.ctx4k,
                                await copyCompressPrompt(false),
                            );
                            destroy();
                        }}>🗜️压缩</button
                    >
                    <button
                        title="复制提示词"
                        class="b3-button"
                        on:click={async () => {
                            await copyCompressPrompt(true);
                            await siyuan.pushMsg("已经复制", 1000);
                        }}>📜</button
                    >
                </td>
            </tr>
            <tr>
                <td>
                    <button
                        title={hotMenuBox.plugin.i18n.uncheckAll}
                        class="b3-button"
                        on:click={async () => {
                            await uncheckAll(docID);
                            destroy();
                        }}>🚫✅</button
                    >
                </td>
                <td>
                    <button
                        title={hotMenuBox.plugin.i18n.delAllchecked}
                        class="b3-button"
                        on:click={async () => {
                            await delAllchecked(docID);
                            destroy();
                        }}>🧹✅</button
                    >
                </td>
                <td>
                    <button
                        title={hotMenuBox.plugin.i18n.addFlashCard}
                        class="b3-button"
                        on:click={async () => {
                            await addFlashCard(getCursorElement());
                            destroy();
                        }}>📌🗃️</button
                    >
                </td>
                <td>
                    <button
                        title={hotMenuBox.plugin.i18n.removeDocCards}
                        class="b3-button"
                        on:click={async () => {
                            await removeDocCards(docID);
                            destroy();
                        }}>🚫🗃️</button
                    >
                </td>
            </tr>
            <tr>
                <td>
                    <button
                        title="刷新静态反链"
                        class="b3-button"
                        on:click={async () => {
                            await cleanBackLinks(docID);
                            await insertBackLinks(docID);
                            destroy();
                        }}>♻️🔙🔗</button
                    >
                </td>
                <td>
                    <button
                        title="删除静态反链"
                        class="b3-button"
                        on:click={async () => {
                            await cleanBackLinks(docID);
                            destroy();
                        }}>🧹🔙🔗</button
                    >
                </td>
            </tr>
            <!-- <tr>
                <td>
                    
                </td>
                <td>
                    <button
                        title="展开内容"
                        class="b3-button"
                        on:click={copyExpandPrompt}>🌲扩写内容</button
                    >
                </td>
           
                <td>
                    <button
                        title="对比内容"
                        class="b3-button"
                        on:click={compare}>🆚</button
                    >
                </td>
            </tr> -->
        </tbody>
    </table>
</div>

<style>
    .ai-key {
        width: 130px;
    }
    .cfg {
        color: var(--b3-theme-primary);
        background-color: var(--b3-theme-background);
    }
</style>
