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
    private _lastBlockID: string;
    public get lastBlockID(): string {
        const blockID = getCursorBlock();
        if (blockID) {
            this._lastBlockID = blockID;
        }
        return this._lastBlockID;
    }
    private set lastBlockID(value: string) {
        this._lastBlockID = value;
    }

    private _boxID: string;
    public get boxID(): string {
        return this._boxID;
    }
    public set boxID(value: string) {
        this._boxID = value;
    }

    private _protyle: Protyle;
    public get protyle(): Protyle {
        return this._protyle;
    }
    private set protyle(value: Protyle) {
        this._protyle = value;
    }

    private _isMobile: boolean;
    public get isMobile(): boolean {
        return this._isMobile;
    }
    private set isMobile(value: boolean) {
        this._isMobile = value;
    }

    private plugin: Plugin;

    private _protyleListeners: Map<string, eventCB> = new Map();

    public addListener(name: string, cb: eventCB) {
        this._protyleListeners.set(name, cb);
    }

    private invokeCB(eventType: string, detail: Protyle) {
        for (const cb of this._protyleListeners.values()) {
            cb(eventType, detail);
        }
    }

    onload(plugin: Plugin) {
        this.plugin = plugin;
        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        this.plugin.eventBus.on(EventType.click_editorcontent, ({ detail }: any) => {
            this.lastBlockID = detail?.event?.srcElement?.parentElement?.getAttribute("data-node-id") ?? this.lastBlockID;
            this.boxID = detail?.protyle?.notebookId ?? this.boxID;
            this.protyle = detail;
        });
        this.plugin.eventBus.on(EventType.open_menu_doctree, ({ detail }: any) => {
            this.boxID = detail?.protyle?.notebookId ?? this.boxID;
            this.protyle = detail;
        });
        this.plugin.eventBus.on(EventType.loaded_protyle_static, ({ detail }: any) => {
            this.boxID = detail?.protyle?.notebookId ?? this.boxID;
            this.protyle = detail;
            this.invokeCB(EventType.loaded_protyle_static, detail);
        });
        this.plugin.eventBus.on(EventType.loaded_protyle_dynamic, ({ detail }: any) => {
            this.boxID = detail?.protyle?.notebookId ?? this.boxID;
            this.protyle = detail;
            this.invokeCB(EventType.loaded_protyle_dynamic, detail);
        });
        this.plugin.eventBus.on(EventType.switch_protyle, ({ detail }: any) => {
            this.boxID = detail?.protyle?.notebookId ?? this.boxID;
            this.protyle = detail;
            this.invokeCB(EventType.switch_protyle, detail);
        });
        this.plugin.eventBus.on(EventType.destroy_protyle, ({ detail }: any) => {
            this.boxID = detail?.protyle?.notebookId ?? this.boxID;
            this.protyle = detail;
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
