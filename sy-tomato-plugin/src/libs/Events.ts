import { Plugin, getFrontend, Protyle } from "siyuan";
import { getCursorElement, getID } from "./utils";

export enum EventType {
    click_editorcontent = "click-editorcontent",
    open_menu_doctree = "open-menu-doctree",
    loaded_protyle_static = "loaded-protyle-static",
    loaded_protyle_dynamic = "loaded-protyle-dynamic",
    switch_protyle = "switch-protyle",
    destroy_protyle = "destroy-protyle",
    ws_main = "ws-main",
    click_blockicon = "click-blockicon",
    click_pdf = "click-pdf",
    click_editortitleicon = "click-editortitleicon",
    open_noneditableblock = "open-noneditableblock",
    open_menu_blockref = "open-menu-blockref",
    open_menu_fileannotationref = "open-menu-fileannotationref",
    open_menu_tag = "open-menu-tag",
    open_menu_link = "open-menu-link",
    open_menu_image = "open-menu-image",
    open_menu_av = "open-menu-av",
    open_menu_content = "open-menu-content",
    open_menu_breadcrumbmore = "open-menu-breadcrumbmore",
    input_search = "input-search",
    paste = "paste",
    open_siyuan_url_plugin = "open-siyuan-url-plugin",
    open_siyuan_url_block = "open-siyuan-url-block"
}

class Events {
    private _title: string;
    public get title(): string {
        return this._title;
    }

    private _docID: string;
    public get docID(): string {
        return this._docID;
    }

    public get lastBlockID(): string {
        return getCursorBlock();
    }

    private _boxID: string;
    public get boxID(): string {
        return this._boxID;
    }

    private _protyle: Protyle;
    public get protyle(): Protyle {
        return this._protyle;
    }

    private _isMobile: boolean;
    public get isMobile(): boolean {
        return this._isMobile;
    }

    private plugin: Plugin;

    private _protyleListeners: Map<string, eventCB> = new Map();

    public addListener(name: string, cb: eventCB) {
        this._protyleListeners.set(name, cb);
    }

    private invokeCB(eventType: string, detail: Protyle) {
        if (eventType != EventType.destroy_protyle) {
            this._protyle = detail;
            this._boxID = this.protyle?.protyle?.notebookId ?? "";
            this._title = this.protyle?.protyle?.title?.editElement?.textContent?.trim() ?? "";
            this._docID = this.protyle?.protyle?.block.rootID ?? "";
        }
        for (const cb of this._protyleListeners.values()) {
            cb(eventType, detail);
        }
    }

    onload(plugin: Plugin) {
        if (!navigator.locks) {
            (navigator as any).locks = {
                request: function (name: string, options: any, callback: any) {
                    return new Promise((resolve) => {
                        const lock = {
                            name: name,
                            mode: (options && options.mode) || "exclusive"
                        };
                        resolve(callback(lock));
                    });
                }
            };
        }

        this.plugin = plugin;
        const frontEnd = getFrontend();
        this._isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        this.plugin.eventBus.on(EventType.open_menu_content, ({ detail }: any) => {
            this.invokeCB(EventType.open_menu_content, detail);
        });
        this.plugin.eventBus.on(EventType.click_editorcontent, ({ detail }: any) => {
            this.invokeCB(EventType.loaded_protyle_static, detail);
        });
        this.plugin.eventBus.on(EventType.open_menu_doctree, ({ detail }: any) => {
            this.invokeCB(EventType.loaded_protyle_static, detail);
        });
        this.plugin.eventBus.on(EventType.loaded_protyle_static, ({ detail }: any) => {
            this.invokeCB(EventType.loaded_protyle_static, detail);
        });
        this.plugin.eventBus.on(EventType.loaded_protyle_dynamic, ({ detail }: any) => {
            this.invokeCB(EventType.loaded_protyle_dynamic, detail);
        });
        this.plugin.eventBus.on(EventType.switch_protyle, ({ detail }: any) => {
            this.invokeCB(EventType.switch_protyle, detail);
        });
    }

    public protyleReload(protyle?: Protyle) {
        if (protyle) {
            ((protyle.protyle as any)?.getInstance() as Protyle)?.reload(true);
        } else {
            ((this.protyle?.protyle as any)?.getInstance() as Protyle)?.reload(true);
        }
    }
}

function getCursorBlock() {
    return getID(getCursorElement());
}

export const events = new Events();
