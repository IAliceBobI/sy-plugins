import { Plugin, getFrontend, Protyle } from "siyuan";

export enum EventType {
    click_editorcontent = "click-editorcontent",
    open_menu_doctree = "open-menu-doctree",
    loaded_protyle_static = "loaded-protyle-static",
    loaded_protyle_dynamic = "loaded-protyle-dynamic",
    switch_protyle = "switch-protyle",
    destroy_protyle = "destroy-protyle",
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
        this._protyle = detail;
        this._boxID = this.protyle?.protyle?.notebookId ?? "";
        this._title = this.protyle?.protyle?.title?.editElement?.textContent?.trim() ?? "";
        this._docID = this.protyle?.protyle?.block.rootID ?? "";
        for (const cb of this._protyleListeners.values()) {
            cb(eventType, detail);
        }
    }

    onload(plugin: Plugin) {
        this.plugin = plugin;
        const frontEnd = getFrontend();
        this._isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
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
        this.plugin.eventBus.on(EventType.destroy_protyle, ({ detail }: any) => {
            this.invokeCB(EventType.destroy_protyle, detail);
        });
    }
}

function getCursorBlock() {
    const selection = document.getSelection();
    return getID(selection?.focusNode?.parentElement);
}

function getID(e: Element) {
    const tn = e?.tagName?.toLocaleLowerCase() ?? "";
    if (!tn) return "";
    if (tn == "body") return "";
    const id = e?.getAttribute("data-node-id") ?? "";
    if (!id) return getID(e?.parentElement);
    return id;
}

export const events = new Events();
