import { Dialog, Plugin } from "siyuan";
import ImgOverlayEditor from "./ImgOverlayBox.svelte";
import { EventType, events } from "@/libs/Events";
import { getID, newID, siyuan } from "@/libs/utils";
import { ATTR_PIC_OVERLAY, OVERLAY_DIV } from "./constants";

class ImgOverlayBox {
    private plugin: Plugin;
    async onload(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.eventBus.on(EventType.open_menu_image, ({ detail }: any) => {
            detail.menu.addItem({
                label: this.plugin.i18n.addPicOverlay,
                icon: "iconOverlay",
                click: () => { this.overlayEditor(detail.element); }
            });
        });
        events.addListener("ImgOverlayBox", (eventType: string, detail: any) => {
            if (eventType == EventType.loaded_protyle_static) {
                const elements = detail?.protyle?.element?.querySelectorAll(`[${ATTR_PIC_OVERLAY}]`) ?? [];
                for (const element of elements) {
                    const overlays: Overlay[] = JSON.parse(element.getAttribute(ATTR_PIC_OVERLAY));
                    const img = element.querySelector("img");
                    if (!img) continue;
                    if (img.parentElement.querySelector(`[${OVERLAY_DIV}="1"]`)) continue;
                    showOverlayStyle(overlays, img);
                }
            }
        });
    }

    blockIconEvent(detail: any) {
        if (!this.plugin) return;
        detail.menu.addItem({
            iconHTML: "",
            label: this.plugin.i18n.addPicOverlay,
            click: () => {
                for (const element of detail.blockElements) {
                    this.overlayEditor(element);
                    break;
                }
            }
        });
    }

    async overlayEditor(imgSpan: HTMLSpanElement) {
        const id = newID();
        let editor: ImgOverlayEditor = null;
        const nextOverlays: Overlay[] = [];
        const imgID = getID(imgSpan);
        const dialog = new Dialog({
            title: "图片制卡",
            content: `<div id="${id}"></div>`,
            destroyCallback() {
                if (editor) editor.$destroy();
                let value = JSON.stringify(nextOverlays);
                if (value == "{}") value = "";
                const attrs = {};
                attrs[ATTR_PIC_OVERLAY] = value;
                siyuan.setBlockAttrs(imgID, attrs);
                showOverlayStyle(nextOverlays, imgSpan?.querySelector("img"));
            },
        });
        const attr = await siyuan.getBlockAttrs(imgID);
        const originOverlays: Overlay[] = JSON.parse(attr[ATTR_PIC_OVERLAY] ?? "[]");
        editor = new ImgOverlayEditor({
            target: dialog.element.querySelector("#" + id),
            props: {
                imgSpan,
                nextOverlays,
                originOverlays,
            }
        });
    }
}

function showOverlayStyle(overlays: Overlay[], img: HTMLElement) {
    const p = img.parentElement;
    p.querySelectorAll(`[${OVERLAY_DIV}="1"]`).forEach(e => {
        e.parentElement.removeChild(e);
    });
    for (const o of overlays) {
        const divElement = document.createElement("div");
        img.parentElement.appendChild(divElement);

        divElement.setAttribute(OVERLAY_DIV, "1");
        divElement.style.position = "absolute";
        divElement.style.top = `${o.top - o.height / 2}px`;
        divElement.style.left = `${o.left - o.width / 2}px`;
        divElement.style.width = `${o.width}px`;
        divElement.style.height = `${o.height}px`;
        divElement.style.background = "var(--b3-font-background8)";

        const textElement = document.createElement("span");
        divElement.appendChild(textElement);

        textElement.setAttribute(OVERLAY_DIV, "1");
        textElement.textContent = o.cID;
        textElement.style.color = "var(--b3-font-color5)";
        textElement.style.position = "absolute";
        textElement.style.top = "50%";
        textElement.style.left = "50%";
        textElement.style.transform = "translate(-50%, -50%)";
        textElement.style.backgroundColor = "transparent";

        divElement.addEventListener("mouseover", function () {
            divElement.style.backgroundColor = "transparent";
            textElement.style.color = "transparent";
        });
        divElement.addEventListener("mouseout", function () {
            divElement.style.backgroundColor = "var(--b3-font-background8)";
            textElement.style.color = "var(--b3-font-color5)";
        });
    }
}

export const imgOverlayBox = new ImgOverlayBox();