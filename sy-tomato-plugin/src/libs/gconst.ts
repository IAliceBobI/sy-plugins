import { TOperation } from "siyuan";

export const SPACE = "　";
export const WEB_SPACE = "&nbsp;";
export const WEB_ZERO_SPACE = "\u200B";
export const CUSTOM_RIFF_DECKS = "custom-riff-decks";
export const DATA_NODE_ID = "data-node-id";
export const DATA_NODE_INDEX = "data-node-index";
export const BLOCK_REF = "block-ref";
export const DATA_ID = "data-id";
export const DATA_TYPE = "data-type";
export const DATA_SUBTYPE = "data-subtype";
export const PROTYLE_WYSIWYG_SELECT = "protyle-wysiwyg--select";
export const IDLen = 20;
export const TOMATO_CONTROL_ELEMENT = "tomato-control-card-priority";
export const TOMATO_BK_IGNORE = "tomato-bk-ignore";
export const TOMATO_BK_STATIC = "custom-tomato-bk-static";
export const STATICLINK = "custom-staticlink";
export const READINGPOINT = "custom-tomato-readingpoint";
export const BACKLINK_CACHE_TIME = 6 * 1000;

export enum BlockNodeEnum {
    DATA_HREF = "data-href",
    BLOCK_REF = "block-ref",
    NODE_PARAGRAPH = "NodeParagraph",
    NODE_HEADING = "NodeHeading",
    NODE_DOCUMENT = "NodeDocument",
    NODE_TABLE = "NodeTable",
    NODE_LIST = "NodeList",
    NODE_LIST_ITEM = "NodeListItem",
    NODE_CODE_BLOCK = "NodeCodeBlock",
    NODE_MATH_BLOCK = "NodeMathBlock",
    NODE_BLOCKQUOTE = "NodeBlockquote",
    NODE_SUPER_BLOCK = "NodeSuperBlock",
    NODE_HTML_BLOCK = "NodeHTMLBlock",
    NODE_BLOCK_QUERY_EMBED = "NodeBlockQueryEmbed",
    NODE_ATTRIBUTE_VIEW = "NodeAttributeView",
    NODE_KRAMDOWN_BLOCK_IAL = "NodeKramdownBlockIAL",
    NODE_IFRAME = "NodeIFrame",
    NODE_WIDGET = "NodeWidget",
    NODE_THEMATIC_BREAK = "NodeThematicBreak",
    NODE_VIDEO = "NodeVideo",
    NODE_AUDIO = "NodeAudio",
    NODE_TEXT = "NodeText",
    NODE_IMAGE = "NodeImage",
    NODE_LINK_TEXT = "NodeLinkText",
    NODE_LINK_DEST = "NodeLinkDest",
    NODE_TEXT_MARK = "NodeTextMark",
}

export const MarkKey = "custom-progmark"; // for doc
export const RefIDKey = "custom-progref"; // for content
export const TEMP_CONTENT = "插件管理勿改managedByPluginDoNotModify";
export const MarkBookKey = `book#${TEMP_CONTENT}`;
export const IN_PIECE_REF = "custom-in-piece-ref";
export const PROG_ORIGIN_TEXT = "custom-prog-origin-text";
export const PROG_PIECE_PREVIOUS = "custom-prog-piece-previous";
export const REF_HIERARCHY = "custom-ref-hierarchy";
export const ORIGIN_HPATH = "custom-origin-hpath";
export const REF_HPATH = "custom-ref-hpath";
export const PARAGRAPH_INDEX = "custom-paragraph-index";
export const CARD_PRIORITY = "custom-card-priority";
export const CARD_PRIORITY_STOP = "custom-card-priority-stop";
export const PROG_KEY_NOTE = "custom-prog-key-note";
export const TOMATO_LINE_THROUGH = "custom-tomato-line-through";

export enum WsActionTypes {
    transactions = "transactions",
    syncMergeResult = "syncMergeResult",
    readonly = "readonly",
    setConf = "setConf",
    progress = "progress",
    setLocalStorageVal = "setLocalStorageVal",
    rename = "rename",
    unmount = "unmount",
    removeDoc = "removeDoc",
    statusbar = "statusbar",
    downloadProgress = "downloadProgress",
    txerr = "txerr",
    syncing = "syncing",
    backgroundtask = "backgroundtask",
    refreshtheme = "refreshtheme",
    openFileById = "openFileById"
}

export interface TransactionData {
    timestamp: number;
    doOperations: DoOperation[];
    undoOperations: DoOperation[];
}

export interface DoOperation {
    action: TOperation;
    data: string;
    id: string;
    parentID: string;
    previousID: string;
    nextID: string;
    retData: any;
    blockIDs: any;
    deckID: string;
    avID: string;
    srcIDs: any;
    isDetached: boolean;
    name: string;
    type: string;
    format: string;
    keyID: string;
    rowID: string;
    isTwoWay: boolean;
    backRelationKeyID: string;
}