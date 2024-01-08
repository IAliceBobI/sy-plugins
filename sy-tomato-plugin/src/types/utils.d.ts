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
    cpBoxCheckbox: boolean,
    linkBoxCheckbox: boolean,
    dailyNoteBoxCheckbox: boolean,
    imgOverlayCheckbox: boolean,
    backLinkBottomBoxCheckbox: boolean,
    cmdBlockBoxCheckbox: boolean,
    "daily-note-box-id": string,
    "tomato-clocks": string,
};