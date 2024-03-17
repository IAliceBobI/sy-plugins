import { Dialog, IProtyle, Plugin, confirm } from "siyuan";
import { getContenteditableElement, newID, siyuan, sleep } from "@/libs/utils";
import "./index.scss";
import { EventType, events } from "@/libs/Events";
import CardBoxDel from "./CardBoxDel.svelte";
import { pressSkip, pressSpace } from "./libs/cardUtils";
import { CARD_PRIORITY, DATA_NODE_ID, WEB_SPACE } from "./libs/gconst";
import { cardPriorityBox } from "./CardPriorityBox";

class CardBox {
    private plugin: Plugin;
    private delCardFunc: Func;
    private fastSkipFunc: Func;
    private changePriFunc: Func;
    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "removeBrokenCards",
            hotkey: "",
            callback: async () => {
                return navigator.locks.request("removeBrokenCardsLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        // instead of query the db, scan all .sy files for safty.
                        confirm(this.plugin.i18n.removeBrokenCards, "<strong>务必，请先看说明，或者备份好。</strong><a href=\"https://gitee.com/TokenzQdBN/sy-plugins/blob/main/sy-tomato-plugin/README_zh_CN.md#%E6%B8%85%E7%90%86%E5%A4%B1%E6%95%88%E9%97%AA%E5%8D%A1\">说明</a>", async () => {
                            const ids = await siyuan.removeBrokenCards();
                            if (ids.length) {
                                siyuan.pushMsg(`${this.plugin.i18n.removedBrokenCards}：${ids.length}个：${ids}`);
                            } else {
                                siyuan.pushMsg(this.plugin.i18n.thereIsNoInvalidCards);
                            }
                        });
                    } else {
                        siyuan.pushMsg("正在删除，请耐心等候……");
                    }
                });
            },
        });
        this.plugin.addCommand({
            langKey: "delCard",
            hotkey: "⌘9",
            callback: async () => {
                if (this.delCardFunc) {
                    this.delCardFunc();
                } else {
                    siyuan.pushMsg("复习闪卡时，才能使用此功能 delete card");
                }
            },
        });
        this.plugin.addCommand({
            langKey: "skipCard",
            hotkey: "⌘8",
            callback: async () => {
                if (this.fastSkipFunc) {
                    this.fastSkipFunc();
                } else {
                    siyuan.pushMsg("复习闪卡时，才能使用此功能 fast skip");
                }
            },
        });
        this.plugin.addCommand({
            langKey: "setCardPriority",
            hotkey: "⌘;",
            callback: async () => {
                if (this.changePriFunc) {
                    this.changePriFunc();
                } else {
                    siyuan.pushMsg("复习闪卡时，才能使用此功能 修改卡优先级");
                }
            },
        });
        events.addListener("CardBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static || eventType == EventType.switch_protyle) {
                const protyle = detail.protyle as IProtyle;
                if (!protyle) return;
                if (protyle?.element?.classList?.contains("card__block")) {
                    const id = protyle.block.id;
                    let msg = "";
                    {
                        const e = getContenteditableElement(protyle.contentElement);
                        msg = `原文ID：${id}<br>请确认原文内容：<br>` + e.textContent.slice(0, 50) ?? "";
                    }
                    if (!id) {
                        this.delCardFunc = null;
                        this.fastSkipFunc = null;
                        this.changePriFunc = null;
                        return;
                    }
                    this.delCardFunc = async () => {
                        await siyuan.removeRiffCards([id]);
                        if (pressSpace()) await sleep(300);
                        pressSkip();
                        await siyuan.pushMsg(msg);
                    };
                    this.fastSkipFunc = async () => {
                        if (pressSpace()) await sleep(300);
                        pressSkip();
                    };
                    this.changePriFunc = async () => {
                        const card = protyle.element.querySelector(`div[${DATA_NODE_ID}="${id}"]`) as HTMLElement;
                        if (card) {
                            const p = card.getAttribute(CARD_PRIORITY) ?? "50";
                            cardPriorityBox.updatePrioritySelected([card], Number(p), true, () => {
                                document.body.focus();
                            });
                        }
                    };
                    this.initSkipBtn();
                    this.initSettingsBtn(msg, id, protyle);
                } else {
                    this.delCardFunc = null;
                    this.fastSkipFunc = null;
                    this.changePriFunc = null;
                }
            }
        });
    }

    private initSkipBtn() {
        const btnPrevious = document.body.querySelector(
            'button[data-type="-2"]'
        ) as HTMLButtonElement;
        if (btnPrevious) {
            btnPrevious.parentElement.querySelectorAll("[TomatoCardSkipBtn]").forEach(e => e?.parentElement?.removeChild(e));
            const nextBtn = btnPrevious.insertAdjacentElement("afterend", document.createElement("button")) as HTMLButtonElement;

            const span = btnPrevious.insertAdjacentElement("afterend", document.createElement("span"));
            span.classList.add("fn__space");
            span.setAttribute("TomatoCardSkipBtn", "1");

            nextBtn.title = "不看答案前\n取消制卡ctrl+9\n跳过卡ctrl+8\n优先级ctrl+;";
            nextBtn.setAttribute("TomatoCardSkipBtn", "1");
            nextBtn.classList.add(...btnPrevious.classList);
            nextBtn.style.width = btnPrevious.style.width;
            nextBtn.style.minWidth = btnPrevious.style.minWidth;
            nextBtn.style.display = btnPrevious.style.display;
            nextBtn.innerHTML = `Skip${WEB_SPACE}<svg><use xlink:href="#iconRight"></use></svg>`;
            nextBtn.addEventListener("click", () => {
                if (this.fastSkipFunc) this.fastSkipFunc();
            });
        }
    }

    private initSettingsBtn(msg: string, id: string, protyle: IProtyle) {
        const btnPrevious = document.body.querySelector(
            'button[data-type="-3"]'
        ) as HTMLButtonElement;
        const container = btnPrevious?.parentElement?.parentElement;
        if (container) {
            container.querySelectorAll("[TomatoCardDelBtn]").forEach(e => e?.parentElement?.removeChild(e));
            const div = container.appendChild(document.createElement("div")) as HTMLDivElement;
            div.setAttribute("TomatoCardDelBtn", "1");
            div.appendChild(document.createElement("span")) as HTMLSpanElement;
            const btn = div.appendChild(document.createElement("button")) as HTMLButtonElement;
            btn.innerHTML = "<div class=\"card__icon\">⚙️</div> 设置";
            btn.title = "删卡、定位、推迟";
            btn.setAttribute("data-type", "-100");
            btn.setAttribute("aria-label", "不看答案前\n取消制卡ctrl+9\n跳过卡ctrl+8\n优先级ctrl+;");
            btn.classList.add(...btnPrevious.classList);
            btn.addEventListener("click", () => {
                const btnId = newID();
                const dialog = new Dialog({
                    title: btn.title,
                    content: `<div id="${btnId}"></div>`,
                });
                new CardBoxDel({
                    target: dialog.element.querySelector("#" + btnId),
                    props: {
                        protyle,
                        dialog,
                        plugin: this.plugin,
                        dialogDiv: document.querySelector(".b3-dialog__container"),
                        msg,
                        id,
                    }
                });
            });
        }
    }
}

export const cardBox = new CardBox();
