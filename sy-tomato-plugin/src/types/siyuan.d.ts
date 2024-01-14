// https://app.quicktype.io/?l=ts

type BlockID = string;

interface GetNotebookConf {
    box: string;
    conf: Conf;
    name: string;
}

interface Conf {
    name: string;
    sort: number;
    icon: string;
    closed: boolean;
    refCreateSavePath: string;
    docCreateSavePath: string;
    dailyNoteSavePath: string;
    dailyNoteTemplatePath: string;
    sortMode: number;
}

interface GetBacklink2 {
    backlinks: Backlink2[];
    backmentions: Backlink2[];
    box: string;
    k: string;
    linkRefsCount: number;
    mentionsCount: number;
    mk: string;
}

interface Backlink2 {
    id: string;
    box: string;
    name: string;
    hPath: string;
    type: BacklinkType;
    nodeType: BlockNodeType;
    subType: BlockNodeSubType;
    depth: number;
    count: number;
    updated: string;
    created: string;
}

interface GetBackmentionDoc {
    backmentions: Backlink[];
}

interface GetBacklinkDoc {
    backlinks: Backlink[];
}

interface Backlink {
    dom: string;
    blockPaths: BlockPath[];
    expand: boolean;
}

interface BlockPath {
    id: string;
    name: string;
    type: BlockNodeType;
    subType: BlockNodeSubType;
    children: BlockPath[];
}

type BacklinkType = "backlink"
type BlockNodeSubType = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
type BlockNodeType = "block-ref" | "NodeParagraph" | "NodeHeading" | "NodeDocument" | "NodeTable" | "NodeList" | "NodeListItem" | "NodeCodeBlock" | "NodeMathBlock" | "NodeBlockquote" | "NodeSuperBlock" | "NodeHTMLBlock" | "NodeBlockQueryEmbed" | "NodeAttributeView" | "NodeKramdownBlockIAL" | "NodeIFrame" | "NodeWidget" | "NodeThematicBreak" | "NodeVideo" | "NodeAudio" | "NodeText" | "NodeImage" | "NodeLinkText" | "NodeLinkDest" | "NodeTextMark";

interface GetBlockMarkdownAndContent {
    markdown: string,
    content: string,
}

interface GetChildBlocks {
    id: string;
    type: string;
    subType: string;
}

interface Block {
    alias: string;
    box: string;
    content: string;
    created: string;
    fcontent: string;
    hash: string;
    hpath: string;
    ial: string;
    id: string;
    length: number;
    markdown: string;
    memo: string;
    name: string;
    parent_id: string;
    path: string;
    root_id: string;
    sort: number;
    subtype: string;
    tag: string;
    type: string;
    updated: string;
}

type GetBlocksWordCount = {
    runeCount: number, wordCount: number, linkCount: number, imageCount: number, refCount: number
}

type GetBlockKramdown = { id: string, kramdown: string }

type GetCardRet = { blocks: Block[], total: number, pageCount: number };

type DueCard = {
    deckID: string;
    cardID: string;
    blockID: string;
    state: number;
    nextDues: { "1": string, "2": string, "3": string, "4": string };
}

type GetDueCardRet = {
    cards: DueCard[],
    unreviewedCount: number,
    unreviewedNewCardCount: number,
    unreviewedOldCardCount: number,
};

type BreadcrumbPath = {
    id: string;
    name: string;
    type: string;
    subType: string;
    children: any;
};
