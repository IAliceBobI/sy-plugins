import { Plugin } from "siyuan";

class DigestProgressive {
    private plugin: Plugin;
    private settings: SettingCfgType;

    blockIconEvent(detail: any) {
        if (!this.plugin) return;

    }

    async onload(plugin: Plugin, settings: SettingCfgType) {
        this.plugin = plugin;
        this.settings = settings;

    }

}

export const digestProgressive = new DigestProgressive();

