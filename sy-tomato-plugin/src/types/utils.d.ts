// https://app.quicktype.io/?l=ts

type eventCB = (eventType: string, detail: any) => any;

type Func = (...args: any[]) => any;

type LinkElementAttr = { isThisDoc: boolan }
type LinkItem = { text: string, count: number, id: string, dataNodeIDSet: Set<string>, attrs: LinkElementAttr };
type RefCollector = Map<string, LinkItem>;
type Overlays = { overlays: Overlay[], originWidth: number }
type Overlay = { left: number, top: number, width: number, height: number, angle: number, cID: string };

type TomatoSettings = {
    tomatoClockCheckbox: boolean,
    scheduleCheckbox: boolean,
    readingPointBoxCheckbox: boolean,
    cardBoxCheckbox: boolean,
    cardRemoveBoxCheckbox: boolean,
    cardAddListBoxCheckbox: boolean,
    cardPriorityBoxCheckbox: boolean,
    cpBoxCheckbox: boolean,
    linkBoxCheckbox: boolean,
    dailyNoteBoxCheckbox: boolean,
    imgOverlayCheckbox: boolean,
    backLinkBottomBoxCheckbox: boolean,
    tag2RefBoxCheckbox: boolean,
    toolbarBoxCheckbox: boolean,
    cmdBlockBoxCheckbox: boolean,
    listBoxCheckbox: boolean,
    "daily-note-box-id": string,
    "tomato-clocks": string,
    "tomato-clocks-change-bg": string,
    "tomato-clocks-change-bg-dark": string,
    "back-link-max-size": number,
    "back-link-mention-count": number,
    "tag-to-ref-add-card": boolean,
    "auto-card-priority": boolean,
    "dont-break-list": boolean,
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
    "custom-card-priority-stop": string,
    "custom-ref-hierarchy": string,
    "custom-origin-hpath": string,
    "custom-ref-hpath": string,
    "custom-paragraph-index": string,
    [key: string]: string,
};

type RiffCard = { due: string, reps: number };