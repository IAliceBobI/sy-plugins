import { Dialog, IEventBusMap, IProtyle, Plugin } from "siyuan";
import { getContenteditableElement, getCursorElement, newID, siyuan } from "./libs/utils";
import HotMenu from "./HotMenu.svelte";
import { ChatContext } from "./libs/baiduAI";
import { addFlashCard } from "./libs/listUtils";
import { removeDocCards } from "./libs/cardUtils";
import { STORAGE_SETTINGS } from "./constants";
import { EventType, events } from "./libs/Events";
import { DATA_NODE_ID, TOMATO_LINE_THROUGH } from "./libs/gconst";
import { addTodoBookmark, rmTodoBookmark } from "./libs/bookmark";
import { item2ref } from "./libs/docUtils";

class HotMenuBox {
    public plugin: Plugin;
    public settingCfg: TomatoSettings;
    public ctx4k: ChatContext;
    public ctx8k: ChatContext;
    public shouldSaveAIHistory = false;
    private docID: string;
    private observer: MutationObserver;

    async saveCfg() {
        await this.plugin.saveData(STORAGE_SETTINGS, this.settingCfg);
        window.location.reload();
    }

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.settingCfg = (plugin as any).settingCfg;
        this.ctx4k = new ChatContext(4000);
        this.ctx8k = new ChatContext(8000);
        this.plugin.addCommand({
            langKey: "hotMenu",
            hotkey: "⌥A",
            editorCallback: async (protyle: IProtyle) => {
                this.openDialog(protyle);
            },
        });
        this.plugin.addCommand({
            langKey: "addFlashCard",
            hotkey: "⌘1",
            editorCallback: async () => {
                await addFlashCard(getCursorElement() as any);
            },
        });
        this.plugin.addCommand({
            langKey: "removeDocCards",
            hotkey: "",
            editorCallback: async (protyle: IProtyle) => {
                await removeDocCards(protyle.block.rootID);
            },
        });
        this.plugin.addCommand({
            langKey: "baiduAI",
            hotkey: "F10",
            editorCallback: async (protyle: IProtyle) => {
                const target = document.createElement("div");
                const m = new HotMenu({
                    target,
                    props: {
                        protyle,
                        callName: "baiduAI",
                    }
                });
                m.$destroy();
            },
        });
        this.plugin.addCommand({
            langKey: "addTODOBookmark",
            hotkey: "⌘F1",
            editorCallback: async (protyle: IProtyle) => {
                const { ids } = await events.selectedDivs(protyle);
                await addTodoBookmark(ids);
            },
        });
        this.plugin.addCommand({
            langKey: "deleteAllTODOBookmarks",
            hotkey: "⌘F2",
            editorCallback: async (protyle: IProtyle) => {
                const { docID } = await events.selectedDivs(protyle);
                await rmTodoBookmark(docID);
            },
        });
        this.plugin.addCommand({
            langKey: "txt2ref",
            hotkey: "F3",
            editorCallback: async (protyle: IProtyle) => {
                const boxID = protyle.notebookId;
                const { selected, rangeText } = await events.selectedDivs(protyle);
                await item2ref(boxID, selected, rangeText, false);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.hotMenu,
                iconHTML: "⌨️",
                accelerator: "⌥A",
                click: async () => {
                    this.openDialog(detail.protyle);
                },
            });
        });

        events.addListener("Tomato-HotMenuBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static) {
                navigator.locks.request("Tomato-HotMenuBox-onload", { ifAvailable: true }, async (lock) => {
                    const protyle: IProtyle = detail.protyle;
                    if (!protyle) return;
                    const notebookId = protyle.notebookId;
                    const nextDocID = protyle?.block?.rootID;
                    const element = protyle?.wysiwyg?.element;
                    if (lock && element && nextDocID && notebookId) {
                        if (this.docID != nextDocID) {
                            this.docID = nextDocID;
                            this.observer?.disconnect();
                            this.observer = new MutationObserver((mutationsList) => {
                                mutationsList
                                    .map(i => i.previousSibling)
                                    .forEach((e: HTMLElement) => this.findAllCommentLock(e));
                            });
                            this.observer.observe(element, { childList: true });
                        }
                    }
                });
            }
        });
    }

    private async findAllCommentLock(element: HTMLElement) {
        return navigator.locks.request("Tomato-HotMenuBox-findAllCommentLock", { ifAvailable: true }, async (lock) => {
            if (lock && element) {
                await this.findAllComment(element);
            }
        });
    }

    private async findAllComment(element: HTMLElement) {
        const id = element.getAttribute(DATA_NODE_ID);
        if (!id) return;
        const txt = getContenteditableElement(element)?.textContent ?? "";
        if (txt.startsWith(";;") || txt.startsWith("；；")) {
            element.setAttribute(TOMATO_LINE_THROUGH, "1");
            setTimeout(() => {
                const attr = {} as AttrType;
                attr["custom-tomato-line-through"] = "1";
                siyuan.setBlockAttrs(id, attr);
            }, 3000);
        }
    }

    blockIconEvent(detail: IEventBusMap["click-blockicon"]) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "⌨️",
            label: this.plugin.i18n.hotMenu,
            click: () => {
                this.openDialog(detail.protyle);
            }
        });
    }

    private openDialog(protyle: IProtyle) {
        const id = newID();
        const dialog = new Dialog({
            title: this.plugin.i18n.hotMenu,
            content: `<div id='${id}'></div>`,
        });
        new HotMenu({
            target: dialog.element.querySelector("#" + id),
            props: {
                dialog,
                protyle,
            }
        });
    }
}

export const hotMenuBox = new HotMenuBox();
