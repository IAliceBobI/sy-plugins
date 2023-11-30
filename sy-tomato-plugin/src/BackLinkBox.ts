import { Plugin } from "siyuan";
import BackLinkView from "./BackLink.svelte";

const DOCK_TYPE = "dock_tab";

class BackLinkBox {
    onload(plugin: Plugin) {
        plugin.addDock({
            config: {
                position: "RightBottom",
                size: { width: 320, height: 0 },
                icon: "iconLink2",
                title: "极简反链",
            },
            data: {},
            type: DOCK_TYPE,
            init() {
                this.data.svelte = new BackLinkView({
                    target: this.element,
                    props: {
                    }
                });
            }
        });
    }
}

export const backLinkBox = new BackLinkBox();
