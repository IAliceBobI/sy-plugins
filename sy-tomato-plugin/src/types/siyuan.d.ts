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
type BlockNodeType = "NodeParagraph" | "NodeHeading" | "NodeDocument" | "NodeTable" | "NodeList" | "NodeListItem" | "NodeCodeBlock" | "NodeMathBlock" | "NodeBlockquote" | "NodeSuperBlock" | "NodeHTMLBlock" | "NodeBlockQueryEmbed" | "NodeAttributeView" | "NodeKramdownBlockIAL" | "NodeIFrame" | "NodeWidget" | "NodeThematicBreak" | "NodeVideo" | "NodeAudio" | "NodeText" | "NodeImage" | "NodeLinkText" | "NodeLinkDest" | "NodeTextMark";

interface GetBlockMarkdownAndContent {
    markdown:string,
    content:string,
}