import { NewNodeID, replaceAll } from "./utils";

export function domHdeading(id: string, text: string, subtype = "h1") {
    if (!id) id = NewNodeID();
    if (!text) text = "<<<<nodata>>>>";
    return `<div data-subtype="${subtype}" data-node-id="${id}" data-type="NodeHeading" class="${subtype}">
        <div contenteditable="true" spellcheck="false">${text}</div>
        <div class="protyle-attr" contenteditable="false">​</div>
    </div>`;
}

export function domEmbedding(id: string, text: string) {
    if (!id) id = NewNodeID();
    if (!text) text = "<<<<nodata>>>>";
    text = replaceAll(text, '"', "&quot;");
    return `<div data-content="${text}"
        data-node-id="${id}" data-type="NodeBlockQueryEmbed" class="render-node" >
        <div class="protyle-attr" contenteditable="false">​</div>
    </div>`;
}