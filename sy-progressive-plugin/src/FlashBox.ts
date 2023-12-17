import { IProtyle, Plugin } from "siyuan";
import { siyuan } from "../../sy-tomato-plugin/src/libs/utils";
import * as utils from "../../sy-tomato-plugin/src/libs/utils";
import { events } from "../../sy-tomato-plugin/src/libs/Events";
import * as gconst from "../../sy-tomato-plugin/src/libs/gconst";
import { BlockNodeEnum } from "../../sy-tomato-plugin/src/libs/gconst";

enum CardType {
    B = "B", C = "C", None = "None"
}

class FlashBox {
    private plugin: Plugin;
    private settings: SettingCfgType;

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        let cardType = CardType.None
        if (this.settings.addCodeBlock) {
            cardType = CardType.C
        } else if (this.settings.addQuoteBlock) {
            cardType = CardType.B
        }
        detail.menu.addItem({
            iconHTML: "",
            label: this.plugin.i18n.insertBlankSpaceCard,
            click: () => {
                this.makeCard(detail.protyle, cardType);
            }
        });
    }

    async onload(plugin: Plugin, settings: SettingCfgType) {
        this.plugin = plugin;
        this.settings = settings;
        let cardType = CardType.None
        if (this.settings.addCodeBlock) {
            cardType = CardType.C
        } else if (this.settings.addQuoteBlock) {
            cardType = CardType.B
        }
        this.plugin.addCommand({
            langKey: "insertBlankSpaceCard",
            hotkey: "⌥E",
            editorCallback: (protyle) => {
                this.makeCard(protyle, cardType);
            },
        });
        this.plugin.eventBus.on("open-menu-content", async ({ detail }) => {
            const menu = detail.menu;
            menu.addItem({
                label: this.plugin.i18n.insertBlankSpaceCard,
                icon: "iconFlashcard",
                accelerator: "⌥E",
                click: () => {
                    const blockID = detail?.element?.getAttribute("data-node-id") ?? "";
                    const blank = detail?.range?.cloneContents()?.textContent ?? "";
                    if (blockID) {
                        this.blankSpaceCard(blockID, blank, detail?.range, detail?.protyle, cardType);
                    }
                },
            });
        });
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

    private cloneSelectedLineMarkdowns(protyle: IProtyle) {
        const lute = utils.NewLute();
        const multiLine = protyle?.element?.getElementsByTagName("div") as unknown as HTMLDivElement[] ?? [];
        const markdowns = [];
        let setRef = true;
        let lastSelectedID = "";
        for (const div of multiLine) {
            if (div.classList.contains(gconst.PROTYLE_WYSIWYG_SELECT)) {
                div.classList.remove(gconst.PROTYLE_WYSIWYG_SELECT);
                const [id, elem, hasRef] = this.cloneDiv(div, setRef);
                if (hasRef) setRef = false;
                lastSelectedID = id;
                markdowns.push(lute.BlockDOM2Md(elem.outerHTML));
            }
        }
        return { markdowns, lastSelectedID };
    }

    private cloneDiv(div: HTMLDivElement, setRef: boolean): [string, HTMLElement, boolean] {
        div = div.cloneNode(true) as HTMLDivElement;
        const id = div.getAttribute(gconst.DATA_NODE_ID);
        div.removeAttribute(gconst.DATA_NODE_ID);
        div.querySelectorAll(`[${gconst.DATA_NODE_ID}]`).forEach((e: HTMLElement) => {
            e.removeAttribute(gconst.DATA_NODE_ID);
        });
        if (setRef) {
            const span = div.querySelector(`[contenteditable="true"]`)?.appendChild(document.createElement("span"));
            if (span) {
                span.setAttribute(gconst.DATA_TYPE, BlockNodeEnum.BLOCK_REF);
                span.setAttribute(gconst.DATA_SUBTYPE, "s");
                span.setAttribute(gconst.DATA_ID, id);
                span.innerText = "*";
                return [id, div, true]
            }
        }
        return [id, div, false];
    }

    private getBlockDOM(dom: HTMLElement): { dom: HTMLElement, blockID: string } {
        if (!dom) return {} as any;
        if (dom?.tagName?.toLocaleLowerCase() == "body") return {} as any;
        const blockID: string = dom.getAttribute(gconst.DATA_NODE_ID) ?? "";
        if (!blockID) return this.getBlockDOM(dom.parentElement);
        return { dom, blockID };
    }

    private async blankSpaceCard(blockID: string, selected: string, range: Range, protyle: any, cardType: CardType) {
        const lute = utils.NewLute();
        let md = "";
        let { dom } = this.getBlockDOM(range.endContainer.parentElement);
        if (!dom) return;
        if (selected) {
            protyle.toolbar.setInlineMark(protyle, "mark", "range");
            const [_id, div] = this.cloneDiv(dom as HTMLDivElement, true)
            protyle.toolbar.setInlineMark(protyle, "mark", "range");
            md = lute.BlockDOM2Md(div.outerHTML);
        } else {
            const [_id, div] = this.cloneDiv(dom as HTMLDivElement, true)
            md = lute.BlockDOM2Md(div.outerHTML);
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
