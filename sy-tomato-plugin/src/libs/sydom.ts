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

export function domSingleItemList(editableDivStr: string, isComment = false) {
    let comment = "";
    if (isComment) comment = 'custom-tomato-line-through2="1"';
    return `<div data-subtype="u" data-node-id="${NewNodeID()}" data-type="NodeList" class="list" ${comment}>
        <div data-marker="*" data-subtype="u" data-node-id="${NewNodeID()}" data-type="NodeListItem" class="li" >
            <div class="protyle-action" draggable="true"><svg>
                    <use xlink:href="#iconDot"></use>
                </svg></div>
            <div data-node-id="${NewNodeID()}" data-type="NodeParagraph" class="p" >
                ${editableDivStr}
                <div class="protyle-attr" contenteditable="false">​</div>
            </div>
            <div data-node-id="${NewNodeID()}" data-type="NodeParagraph" class="p" >
                <div contenteditable="true" spellcheck="false"></div>
                <div class="protyle-attr" contenteditable="false">​</div>
            </div>
            <div class="protyle-attr" contenteditable="false">​</div>
        </div>
        <div class="protyle-attr" contenteditable="false">​</div>
    </div>`;
}