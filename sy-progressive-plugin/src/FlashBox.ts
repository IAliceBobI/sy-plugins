import { Plugin } from "siyuan";
import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import * as utils from "../../sy-tomato-plugin/src/libs/utils";
import { events } from "../../sy-tomato-plugin/src/libs/Events";
import * as gconst from "../../sy-tomato-plugin/src/libs/gconst";
import * as helper from "./helper";
import { BlockNodeEnum } from "../../sy-tomato-plugin/src/libs/gconst";

enum CardType {
    B = "B", C = "C", None = "None"
}

class FlashBox {
    private plugin: Plugin;
    private settings: SettingCfgType;

    async onload(plugin: Plugin, settings: SettingCfgType) {
        this.plugin = plugin;
        this.settings = settings;
        this.plugin.addCommand({
            langKey: "insertBlankSpaceCard",
            hotkey: "⌥E",
            editorCallback: (protyle) => {
                if (this.settings.addCodeBlock) {
                    this.makeCard(protyle, CardType.C);
                } else if (this.settings.addQuoteBlock) {
                    this.makeCard(protyle, CardType.B);
                } else {
                    this.makeCard(protyle, CardType.None);
                }
            },
        });
        // this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
        //     const menu = detail.menu;
        //     menu.addItem({
        //         label: this.plugin.i18n.insertBlankSpaceCardB,
        //         icon: "iconFlashcard",
        //         accelerator: "⌥E",
        //         click: () => {
        //             const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
        //             const blank = detail?.range?.cloneContents()?.textContent ?? "";
        //             if (blockID) {
        //                 this.blankSpaceCard(blockID, blank, detail?.range, detail?.protyle, CardType.B);
        //             }
        //         },
        //     });
        // });
    }

    private async makeCard(protyle: any, t: CardType) {
        const { lastSelectedID, markdowns } = this.cloneSelectedLineMarkdowns(protyle);
        if (lastSelectedID) { // multilines
            const { cardID, markdown } = this.createList(markdowns, t);
            await siyuan.insertBlockAfter("", lastSelectedID);
            await utils.sleep(200);
            await siyuan.insertBlockAfter(markdown, lastSelectedID);
            await utils.sleep(200);
            await siyuan.insertBlockAfter("", lastSelectedID);
            setTimeout(() => { siyuan.addRiffCards([cardID]); }, 1000);
        } else {
            const blockID = events.lastBlockID;
            const range = document.getSelection()?.getRangeAt(0);
            const blank = range?.cloneContents()?.textContent ?? "";
            if (blockID) {
                this.blankSpaceCard(blockID, blank, range, protyle, t);
            }
        }
    }

    private createList(markdowns: string[], cardType: CardType) {
        const tmp = [];
        for (const m of markdowns) {
            tmp.push("* " + m);
        }
        const cardID = utils.NewNodeID();
        if (cardType === CardType.C) {
            tmp.push("* ```");
        } else if (cardType === CardType.B) {
            tmp.push("* >");
        }
        tmp.push(`{: id="${cardID}"}`);
        return { cardID, "markdown": tmp.join("\n") };
    }

    private cloneSelectedLineMarkdowns(protyle: any) {
        const lute = utils.NewLute();
        const multiLine = protyle?.element?.getElementsByTagName("div") as HTMLDivElement[] ?? [];
        const markdowns = [];
        let lastSelectedID = "";
        let firstSelectedID = "";
        let setRef = false;
        for (const div of multiLine) {
            if (div.classList.contains(gconst.PROTYLE_WYSIWYG_SELECT)) {
                const id = div.getAttribute(gconst.DATA_NODE_ID);
                if (id) {
                    lastSelectedID = id;
                    if (!firstSelectedID) firstSelectedID = id;
                }
                div.classList.remove(gconst.PROTYLE_WYSIWYG_SELECT);
                const elem = div.cloneNode(true) as HTMLDivElement;
                elem.removeAttribute(gconst.DATA_NODE_ID)
                elem.querySelectorAll(`[${gconst.DATA_NODE_ID}]`).forEach((e: HTMLElement) => {
                    e.removeAttribute(gconst.DATA_NODE_ID)
                })
                if (!setRef) {
                    const span = elem.querySelector(`[contenteditable="true"]`)?.appendChild(document.createElement("span"))
                    if (span) {
                        span.setAttribute(gconst.DATA_TYPE, BlockNodeEnum.BLOCK_REF)
                        span.setAttribute(gconst.DATA_SUBTYPE, "s")
                        span.setAttribute(gconst.DATA_ID, id)
                        span.innerText = "*"
                        setRef = true;
                    }
                }
                markdowns.push(lute.BlockDOM2Md(elem.outerHTML));
            }
        }
        return { markdowns, firstSelectedID, lastSelectedID };
    }

    private getBlockDOM(dom: Element): { dom: Element, blockID: string } {
        if (!dom) return {} as any;
        if (dom?.tagName?.toLocaleLowerCase() == "body") return {} as any;
        const blockID: string = dom.getAttribute(gconst.DATA_NODE_ID) ?? "";
        if (!blockID) return this.getBlockDOM(dom.parentElement);
        return { dom, blockID };
    }

    private async blankSpaceCard(blockID: string, selected: string, range: Range, protyle: any, cardType: CardType) {
        const lute = utils.NewLute();
        let md = "";
        if (selected) {
            const { dom } = this.getBlockDOM(range.endContainer.parentElement);
            if (!dom) return;
            protyle.toolbar.setInlineMark(protyle, "mark", "range");
            md = helper.tryRmIDAddLinkOne(lute.BlockDOM2Md(dom.outerHTML));
            protyle.toolbar.setInlineMark(protyle, "mark", "range");
        } else {
            const { dom } = await siyuan.getBlockDOM(blockID);
            md = helper.tryRmIDAddLinkOne(lute.BlockDOM2Md(dom));
        }
        const cardID = utils.NewNodeID();
        const list = [];
        list.push(`* ${md}`);
        if (cardType === CardType.C) {
            list.push("* ```");
        } else if (cardType === CardType.B) {
            list.push("* >");
        }
        list.push(`{: id="${cardID}"}`);
        await siyuan.insertBlockAfter("", blockID);
        await utils.sleep(200);
        await siyuan.insertBlockAfter(list.join("\n"), blockID);
        await utils.sleep(200);
        await siyuan.insertBlockAfter("", blockID);
        await siyuan.addRiffCards([cardID]);
    }
}

export const flashBox = new FlashBox();
