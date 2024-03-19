import { IProtyle, Plugin, Protyle } from "siyuan";
import "./index.scss";
import { getContenteditableElement as getContentEditableElement } from "./libs/utils";
import { EventType, events } from "./libs/Events";
import { BlockNodeEnum, DATA_TYPE, WEB_ZERO_SPACE } from "./libs/gconst";
import { delAllchecked, getDocListMd, uncheckAll } from "./libs/listUtils";

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
            description: "依赖：列表工具。(若想从中间断开列表：shift+tab)",
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

        this.plugin.addCommand({
            langKey: "delAllchecked",
            hotkey: "",
            editorCallback: async (protyle: IProtyle) => {
                const docID = protyle?.block?.rootID;
                await delAllchecked(docID);
            },
        });

        this.plugin.protyleSlash.push(...[{
            filter: ["item", "single", "list", "列表", "单项", "dxlb", "lb"],
            html: "插入单项列表(\"item\", \"single\", \"list\", \"列表\", \"单项\", \"dxlb\", \"lb\")",
            id: "insertSingleItemList",
            callback(protyle: Protyle) {
                protyle.insert(getDocListMd());
            }
        }, {
            filter: ["comment", "zsdxlb", "list", "zs"],
            html: "插入单项注释列表(\"comment\", \"zsdxlb\", \"list\", \"zs\")(快捷菜单'📜📋全文'功能，会忽略注释)",
            id: "insertCommentedSingleItemList",
            callback(protyle: Protyle) {
                protyle.insert(getDocListMd("", true));
            }
        }]);

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
}

function insertZSpace(e: HTMLElement) {
    const content = getContentEditableElement(e);
    if (content?.textContent === "") {
        content.textContent = WEB_ZERO_SPACE;
        document.getSelection().collapse(content, 1);
    }
}

export const listBox = new ListBox();

// this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
//     const menu = detail.menu;
//     menu.addItem({
//         label: this.plugin.i18n.uncheckAll,
//         icon: "iconUncheck",
//         accelerator: "",
//         click: async () => {
//             const docID = detail?.protyle?.block?.rootID;
//             await uncheckAll(docID);
//         },
//     });
// });
// this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
//     const menu = detail.menu;
//     menu.addItem({
//         label: this.plugin.i18n.delAllchecked,
//         icon: "iconTrashcan",
//         accelerator: "",
//         click: async () => {
//             const docID = detail?.protyle?.block?.rootID;
//             await delAllchecked(docID);
//         },
//     });
// });
// blockIconEvent(detail: any) {
//     if (!this.plugin) return;
//     detail.menu.addItem({
//         iconHTML: "🚫✅",
//         label: this.plugin.i18n.uncheckAll,
//         click: async () => {
//             const docID = detail?.protyle?.block?.rootID;
//             await uncheckAll(docID);
//         }
//     });
//     detail.menu.addItem({
//         iconHTML: "🧹✅",
//         label: this.plugin.i18n.delAllchecked,
//         click: async () => {
//             const docID = detail?.protyle?.block?.rootID;
//             await delAllchecked(docID);
//         }
//     });
// }
