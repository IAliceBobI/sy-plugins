import { IProtyle, Plugin, confirm } from "siyuan";
import { siyuan } from "@/libs/utils";
import "./index.scss";
import { EventType, events } from "@/libs/Events";

class CardBox {
    private plugin: Plugin;
    private delCardFunc: Func;
    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.addCommand({
            langKey: "removeBrokenCards",
            hotkey: "",
            callback: async () => {
                return navigator.locks.request("removeBrokenCardsLock", { ifAvailable: true }, async (lock) => {
                    if (lock) {
                        // todo: instead of query the db, scan all .sy files for safty.
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
                    siyuan.pushMsg("复习闪卡时，才能使用此功能。");
                }
            },
        });
        events.addListener("CardBox", (eventType, detail) => {
            if (eventType == EventType.loaded_protyle_static || eventType == EventType.switch_protyle) {
                const protyle = detail.protyle as IProtyle;
                if (!protyle) return;
                if (protyle?.element?.classList?.contains("card__block")) {
                    const id = protyle.block.id;
                    if (!id) {
                        this.delCardFunc = null;
                        return;
                    }
                    Array.from(document.querySelectorAll(".fn__flex.card__action")).forEach(bottomBtns => {
                        if (!bottomBtns?.parentElement) {
                            this.delCardFunc = null;
                            return;
                        }
                        bottomBtns.parentElement.querySelectorAll("[TomatoCardDelBtn]").forEach(e => e?.parentElement?.removeChild(e));
                        const div = bottomBtns.appendChild(document.createElement("div")) as HTMLDivElement;
                        div.setAttribute("TomatoCardDelBtn", "1");
                        div.appendChild(document.createElement("span")) as HTMLSpanElement;
                        const btn = div.appendChild(document.createElement("button")) as HTMLButtonElement;
                        btn.innerHTML = "<div>🗑</div> 删除";
                        btn.title = "仅删除闪卡，保留原文";
                        btn.setAttribute("data-type", "-100");
                        btn.setAttribute("aria-label", "默认ctrl+9仅参考");
                        btn.classList.add("b3-button");
                        btn.classList.add("b3-button--error");
                        btn.classList.add("b3-tooltips__n");
                        btn.classList.add("b3-tooltips");
                        const msg = `原文ID：${id}<br>请确认原文内容：<br>` + protyle.contentElement.textContent.slice(0, 100);
                        this.delCardFunc = async () => {
                            await siyuan.removeRiffCards([id]);
                            const btnSkip = document.body.querySelector('button[data-type="-3"]') as HTMLButtonElement;
                            btnSkip.click();
                            await siyuan.pushMsg(msg);
                        };
                        btn.addEventListener("click", () => {
                            confirm(btn.title, msg, () => {
                                siyuan.removeRiffCards([id]);
                                const btnSkip = document.body.querySelector('button[data-type="-3"]') as HTMLButtonElement;
                                btnSkip.click();
                            });
                        });
                    });
                } else {
                    this.delCardFunc = null;
                }
            }
        });
    }
}

export const cardBox = new CardBox();
