// https://app.quicktype.io/?l=ts

type eventCB = (eventType: string, detail: any) => any;

type Func = (...args: any[]) => any;

type RefCollector = Map<string, { lnk: string, text: string, count: number, id: string }>;
