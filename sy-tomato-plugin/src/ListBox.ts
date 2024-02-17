import { IProtyle, Plugin } from "siyuan";
import "./index.scss";
import { getContenteditableElement as getContentEditableElement, siyuan } from "./libs/utils";
import { EventType, events } from "./libs/Events";
import { BlockNodeEnum, DATA_TYPE, WEB_ZERO_SPACE } from "./libs/gconst";

class ListBox {
    private plugin: Plugin;
    public settingCfg: TomatoSettings;
    private docID: string;
    private observer: MutationObserver;

    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.settingCfg = (plugin as any).settingCfg;
        this.plugin.setting.addItem({
            title: "** 阻止连续回车断开列表",
            description: "依赖：列表工具。若想断开列表：1个shift+enter 然后连续2个enter",
            createActionElement: () => {
                const checkbox = document.createElement("input") as HTMLInputElement;
                checkbox.type = "checkbox";
                checkbox.checked = this.settingCfg["dont-break-list"] ?? false;
                checkbox.addEventListener("change", () => {
                    this.settingCfg["dont-break-list"] = checkbox.checked;
                });
                checkbox.className = "b3-switch fn__flex-center";
                return checkbox;
            },
        });

        this.plugin.addCommand({
            langKey: "uncheckAll",
            hotkey: "",
            editorCallback: async (protyle: IProtyle) => {
                const docID = protyle?.block?.rootID;
                await uncheckAll(docID);
            },
        });

        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.uncheckAll,
                icon: "iconUncheck",
                accelerator: "",
                click: async () => {
                    const docID = detail?.protyle?.block?.rootID;
                    await uncheckAll(docID);
                },
            });
        });

        this.plugin.addCommand({
            langKey: "delAllchecked",
            hotkey: "",
            editorCallback: async (protyle: IProtyle) => {
                const docID = protyle?.block?.rootID;
                await delAllchecked(docID);
            },
        });

        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.delAllchecked,
                icon: "iconTrashcan",
                accelerator: "",
                click: async () => {
                    const docID = detail?.protyle?.block?.rootID;
                    await delAllchecked(docID);
                },
            });
        });

        if (this.settingCfg["dont-break-list"]) {
            events.addListener("Tomato-ListBox-ListAsFile", (eventType, detail) => {
                if (eventType == EventType.loaded_protyle_static) {
                    navigator.locks.request("Tomato-ListBox-ListAsFile-onload", { ifAvailable: true }, async (lock) => {
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
                                        .map(e => [...e.addedNodes.values()])
                                        .flat()
                                        .filter(e => e instanceof HTMLElement)
                                        .filter((e: HTMLElement) => e.getAttribute(DATA_TYPE) == BlockNodeEnum.NODE_LIST_ITEM)
                                        .forEach(e => insertZSpace(e as any));
                                });
                                this.observer.observe(element, { subtree: true, childList: true });
                            }
                        }
                    });
                }
            });
        }
    }

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "🚫✅",
            label: this.plugin.i18n.uncheckAll,
            click: async () => {
                const docID = detail?.protyle?.block?.rootID;
                await uncheckAll(docID);
            }
        });
        detail.menu.addItem({
            iconHTML: "🧹✅",
            label: this.plugin.i18n.delAllchecked,
            click: async () => {
                const docID = detail?.protyle?.block?.rootID;
                await delAllchecked(docID);
            }
        });
    }
}

async function delAllchecked(docID: string) {
    const kramdowns = await Promise.all((await siyuan.sql(`select id from blocks 
        where type='i' and subType='t' and root_id="${docID}"
        and markdown like "* [X] %"
        limit 30000
    `)).map(b => siyuan.getBlockKramdown(b.id)));
    await siyuan.safeDeleteBlocks(kramdowns.map(b => b.id));
    await siyuan.pushMsg(`删除了${kramdowns.length}个任务`);
}

async function uncheckAll(docID: string) {
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

function insertZSpace(e: HTMLElement) {
    const content = getContentEditableElement(e);
    if (content?.textContent === "") {
        content.textContent = WEB_ZERO_SPACE;
        document.getSelection().collapse(content, 1);
    }
}

export const listBox = new ListBox();

