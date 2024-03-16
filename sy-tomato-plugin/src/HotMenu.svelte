<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Dialog, IProtyle, openTab } from "siyuan";
    import { events } from "./libs/Events";
    import {
        DATA_NODE_ID,
        TOMATO_BK_IGNORE,
        TOMATO_LINE_THROUGH,
        WEB_SPACE,
    } from "./libs/gconst";
    import {
        NewNodeID,
        cleanText,
        getCursorElement,
        replaceAll,
        siyuan,
        siyuanCache,
    } from "./libs/utils";
    import { BaiduAI, ChatContext } from "./libs/baiduAI";
    import { EnumUtils } from "./libs/EnumUtils";
    import { STORAGE_SETTINGS } from "./constants";
    import { hotMenuBox } from "./HotMenuBox";
    import { addFlashCard, delAllchecked, uncheckAll } from "./libs/listUtils";
    import { removeDocCards } from "./libs/cardUtils";
    import {
        cleanBackLinks,
        disableBK,
        enableBK,
        insertBackLinks,
    } from "./libs/bkUtils";
    import { gotoBookmark } from "./libs/bookmark";
    import { DialogText } from "./libs/DialogText";
    import { mergeDocs, moveAllContentHere } from "./libs/docUtils";

    enum InsertPlace {
        here = "1#当前位置",
        dailynote = "2#今日笔记",
        subdoc = "3#子文档",
    }
    const insertPlaceMap = new EnumUtils(InsertPlace);
    const getIdx = (v: InsertPlace) => insertPlaceMap.getItem(v).idx;

    export let dialog: Dialog = null;
    export let protyle: IProtyle;
    export let callName: string = "";

    const attrs = {};
    let element: HTMLElement;
    let selected: HTMLElement[] = [];
    let docID: string;
    let anchorID: string;
    let apiKey: string;
    let secretKey: string;
    let insertPlace: number;
    let aiAPI: BaiduAI;
    let selectedText: string;
    let selectedIds: string[] = [];

    onMount(async () => {
        attrs[TOMATO_BK_IGNORE] = "1";

        const s = await events.selectedDivs(protyle);
        selectedIds = s.ids;
        element = s.element;
        docID = s.docID;
        selectedText = s.rangeText;
        anchorID = s.ids[s.ids.length - 1];
        selected = s.selected;
        if (!element || !docID) return;

        insertPlace =
            hotMenuBox.settingCfg["ai-return-insert-place"] ??
            getIdx(InsertPlace.here);
        initAI();
        if (callName == "baiduAI") {
            await ai(hotMenuBox.ctx4k, getAllText());
        }
    });

    function initAI() {
        apiKey = hotMenuBox.settingCfg["ernie-bot-4-ak"];
        secretKey = hotMenuBox.settingCfg["ernie-bot-4-sk"];
        aiAPI = new BaiduAI(apiKey, secretKey);
    }

    function getAllText() {
        if (selectedText) return selectedText;
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
        dialog?.destroy();
    }

    async function ai(ctx: ChatContext, text: string) {
        await siyuan.pushMsg(text.slice(0, 100), 2000);
        const ai = await aiAPI.chatCompletionsPro(
            ctx,
            text,
            hotMenuBox.shouldSaveAIHistory,
        );
        if (!ai?.usage?.completion_tokens) {
            return siyuan.pushMsg(JSON.stringify(ai));
        }
        siyuan.pushMsg(`token用量：${JSON.stringify(ai.usage)}`);
        const boxID = protyle.notebookId;
        const newID = NewNodeID();
        let result = ai.result
            .split("\n")
            .map((i) => "> " + i)
            .join("\n");
        result = `${result}\n{: id="${newID}" }`;
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
        // const md = await siyuan.copyStdMarkdown(docID);
        const contents = (
            await siyuan.getRows(
                (await siyuan.getChildBlocks(docID)).map((b) => b.id),
                "markdown,content,ial",
                true,
            )
        )
            .filter((row) => !row.ial.includes(TOMATO_LINE_THROUGH))
            .map((row) => {
                if (row.markdown.includes("((")) {
                    return row.content;
                }
                return row.markdown;
            });
        await navigator.clipboard.writeText(contents.join("\n"));
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

    //     async function compare() {
    //         const text = getAllText();
    //         const prompt = `
    // 资料1：\n
    // ${text.replace("===", "\n资料2：\n")}
    // \n-----\n
    // 请从人物、对话、情节等方面，对资料1与资料2两段文字，进行全面对比，并分析各自的优缺点，给出建议，帮助我何改进资料2。
    // `.trim();
    //         await navigator.clipboard.writeText(prompt.trim());
    //         destroy();
    //     }

    async function copyExpandPrompt(copy?: boolean) {
        const text = getAllText();
        let prompt = "";
        if (text) {
            prompt = `
Context:        
${text}
-------------------
请根据 Context 续写内容。
`.trim();
            if (copy) await navigator.clipboard.writeText(prompt);
        }
        return prompt;
    }

    async function addLineThrough(v: string, all = false) {
        destroy();
        const attrs: AttrType = {} as any;
        attrs["custom-tomato-line-through"] = v;
        if (all) {
            await siyuan.batchSetBlockAttrs(
                (await siyuan.getDocAttrs(docID, TOMATO_LINE_THROUGH)).map(
                    ({ block_id: id }) => {
                        return { id, attrs };
                    },
                ),
            );
        } else {
            await siyuan.batchSetBlockAttrs(
                selectedIds.map((id) => {
                    return { id, attrs };
                }),
            );
        }
        events.protyleReload();
    }

    async function mergeDoc() {
        new DialogText(
            "填入要被删除的文档的ID，文档里面的块ID也行，会最终得到文档ID",
            "",
            async (input: string) => {
                input = input.trim();
                if (input) {
                    const docID = await siyuan.getDocIDByBlockID(input);
                    if (docID) {
                        await mergeDocs(docID, anchorID);
                    }
                }
                destroy();
            },
        );
    }

    async function moveContentHere() {
        new DialogText(
            "填入要被清空的文档的ID，文档里面的块ID也行，会最终得到文档ID",
            "",
            async (input: string) => {
                input = input.trim();
                if (input) {
                    const docID = await siyuan.getDocIDByBlockID(input);
                    if (docID) {
                        const ids = await moveAllContentHere(docID, anchorID);
                        destroy();
                        await siyuan.pushMsg(`移动了${ids.length}个块`);
                        events.protyleReload();
                        return;
                    }
                }
                await siyuan.pushMsg("啥也没有。");
            },
        );
    }

    async function copyCompressPrompt(copy?: boolean) {
        const text = getAllText();
        let prompt = "";
        if (text) {
            prompt = `
Context:        
${text}
-------------------
请对 Context 压缩并提取中心意思
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
                    <label title="是否保留与AI对话历史"
                        >🤖💬{@html WEB_SPACE}<input
                            class="b3-switch"
                            type="checkbox"
                            bind:checked={hotMenuBox.shouldSaveAIHistory}
                            on:change={() => {
                                if (!hotMenuBox.shouldSaveAIHistory) {
                                    let a = hotMenuBox.ctx4k.clear();
                                    a += hotMenuBox.ctx8k.clear();
                                    siyuan.pushMsg(`清理了${a}个tokens`, 3000);
                                }
                            }}
                        /></label
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
                        title="复制当前文档（忽略注释）"
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
                            destroy();
                            await ai(hotMenuBox.ctx4k, getAllText());
                        }}>🤖文心4</button
                    >
                </td>
                <td>
                    <button
                        title="文心4(8K):选中内容发给AI，请把问题也一起选中。"
                        class="b3-button"
                        on:click={async () => {
                            destroy();
                            await ai(hotMenuBox.ctx8k, getAllText());
                        }}>🤖文心8K</button
                    >
                </td>
                <td>
                    <button
                        title="AI总结内容"
                        class="b3-button"
                        on:click={async () => {
                            destroy();
                            await ai(
                                hotMenuBox.ctx4k,
                                await copyCompressPrompt(false),
                            );
                        }}>压缩</button
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
                <td>
                    <button
                        title="AI续写内容"
                        class="b3-button"
                        on:click={async () => {
                            destroy();
                            await ai(
                                hotMenuBox.ctx4k,
                                await copyExpandPrompt(false),
                            );
                        }}>续写</button
                    >
                    <button
                        title="复制提示词"
                        class="b3-button"
                        on:click={async () => {
                            await copyExpandPrompt(true);
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
                            await disableBK(docID);
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
                            await enableBK(docID);
                            destroy();
                        }}>🧹🔙🔗</button
                    >
                </td>
                <td>
                    <button
                        title="启用底部反链"
                        class="b3-button"
                        on:click={async () => {
                            await enableBK(docID);
                            destroy();
                            if (
                                !hotMenuBox.settingCfg.backLinkBottomBoxCheckbox
                            ) {
                                hotMenuBox.settingCfg.backLinkBottomBoxCheckbox = true;
                                await hotMenuBox.saveCfg();
                            }
                        }}>👁️🔙🔗</button
                    >
                </td>
                <td>
                    <button
                        title="禁用底部反链"
                        class="b3-button"
                        on:click={async () => {
                            await disableBK(docID);
                            destroy();
                        }}>🚫🔙🔗</button
                    >
                </td>
            </tr>
            <tr>
                <td>
                    <button
                        title="把文档内容移动到这里"
                        class="b3-button"
                        on:click={moveContentHere}>📃📩</button
                    >
                </td>
                <td>
                    <button
                        title="合并文档到这里，把其他文档的属性、内容、引用转移到此文档，并把其他文档删除。"
                        class="b3-button"
                        on:click={mergeDoc}>📃🈴</button
                    >
                </td>
                <td>
                    <button
                        title="选中块转为注释（复制当前文档功能，会忽略注释）"
                        class="b3-button"
                        on:click={() => addLineThrough("1")}>🙈</button
                    >
                    {@html WEB_SPACE.repeat(2)}
                    <button
                        title="选中块去掉注释"
                        class="b3-button"
                        on:click={() => addLineThrough("")}>🙉</button
                    >
                </td>
                <td>
                    <button
                        title="插入空的xmind文件"
                        class="b3-button"
                        on:click={async () => {
                            new DialogText(
                                "xmind名字(不带后缀)",
                                "",
                                async (value) => {
                                    const newFile = `assets/${value}-${NewNodeID()}.xmind`;
                                    await siyuan.copyFile2(
                                        "/data/plugins/sy-tomato-plugin/i18n/empty.xmind",
                                        `/data/${newFile}`,
                                    );
                                    await siyuan.insertBlockAfter(
                                        `[${value}](${newFile})`,
                                        anchorID,
                                    );
                                    destroy();
                                },
                            );
                        }}>➕🧠</button
                    >
                </td>
            </tr>
            <tr>
                <td>
                    <button
                        title="跳到当前文档的书签位置"
                        class="b3-button"
                        on:click={async () => {
                            await gotoBookmark(docID, hotMenuBox.plugin.app);
                            destroy();
                        }}>🕊️🔖</button
                    >
                </td>
                <td>
                    <button
                        title="删除本文档的阅读点"
                        class="b3-button"
                        on:click={async () => {
                            await gotoBookmark(
                                docID,
                                hotMenuBox.plugin.app,
                                true,
                            );
                            destroy();
                        }}>🗑️🔖</button
                    ></td
                >
                <td
                    ><button
                        title="打开剪贴板中的块ID"
                        class="b3-button"
                        on:click={async () => {
                            let text = await navigator.clipboard.readText();
                            text = replaceAll(text, `["'    ]+`, "");
                            await openTab({
                                app: hotMenuBox.plugin.app,
                                doc: {
                                    id: text.trim(),
                                    zoomIn: false,
                                    action: ["cb-get-hl", "cb-get-context"],
                                },
                            });
                            destroy();
                        }}>🦋</button
                    ></td
                >
                <td></td>
            </tr>
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
