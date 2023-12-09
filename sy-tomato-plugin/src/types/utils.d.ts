// https://app.quicktype.io/?l=ts

type eventCB = (eventType: string, detail: any) => any;

type Func = (...args: any[]) => any;

type linkItem = { lnk: string, text: string, count: number, id: string };
type RefCollector = Map<string, linkItem>;
type Overlay = { left: number, top: number, width: number, height: number, angle: number, cID: string };
