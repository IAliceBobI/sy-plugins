// https://app.quicktype.io/?l=ts

type eventCB = (eventType: string, detail: any) => any;

type Func = (...args: any[]) => any;

type linkItem = { lnk: HTMLSpanElement, text: string, count: number, id: string };
type RefCollector = Map<string, linkItem>;
type Overlays = { overlays: Overlay[], originWidth: number }
type Overlay = { left: number, top: number, width: number, height: number, angle: number, cID: string };

type TomatoSettings = {
    tomatoClockCheckbox: boolean,
    scheduleCheckbox: boolean,
    readingPointBoxCheckbox: boolean,
    cardBoxCheckbox: boolean,
    cardPriorityBoxCheckbox: boolean,
    cpBoxCheckbox: boolean,
    linkBoxCheckbox: boolean,
    dailyNoteBoxCheckbox: boolean,
    imgOverlayCheckbox: boolean,
    backLinkBottomBoxCheckbox: boolean,
    cmdBlockBoxCheckbox: boolean,
    "daily-note-box-id": string,
    "tomato-clocks": string,
};

type AttrType = {
    title: string,
    alias: string, // comma separated
    memo: string,
    updated: string,
    id: string,
    name: string,
    bookmark: string,
    scroll: string,
    "custom-progmark": string,
    "custom-progref": string,
    "custom-in-piece-ref": string,
    "custom-prog-origin-text": string,
    "custom-sy-readonly": string,
    "custom-riff-decks": string,
    "custom-linkboxdoclinkial": string,
    "custom-attr-pic-overlay": string,
    "custom-tomatomention": string,
    "custom-tomatobacklink": string,
    "custom-card-priority": string,
    [key: string]: string,
};

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
