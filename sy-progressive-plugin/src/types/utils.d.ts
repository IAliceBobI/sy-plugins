// https://app.quicktype.io/?l=ts

type SettingCfgType = {
    hideBtnsInFlashCard: boolean;
    cardUnderPiece: boolean;
    addCodeBlock: boolean,
    addQuoteBlock: boolean,
    openCardsOnOpenPiece: boolean,
    cardIndent: boolean,
    addIndex2paragraph: boolean,
    btnViewContents: boolean,
    btnSplitByPunctuationsListCheck: boolean;
    btnFullfilContent: boolean;
    btnCleanUnchanged: boolean;
    btnCleanOriginText: boolean;
    btnPrevious: boolean;
    btnNext: boolean;
    btnDeleteBack: boolean;
    btnDeleteNext: boolean;
    btnSaveCard: boolean;
    btnDelCard: boolean;
    btnStop: boolean;
    btnNextBook: boolean;
    btnIgnoreBook: boolean;
    btnOpenFlashcardTab: boolean;
    btnSplitByPunctuations: boolean;
    btnSplitByPunctuationsList: boolean;
    btnDeleteExit: boolean;
}

type AsList = "p" | "l" | "t";

type WordCountType = { id: string; count: number; type: string; subType: string };

type BookInfo = {
    time: number,
    boxID: string,
    point: number,
    bookID: string,
    ignored: boolean,
    autoCard: boolean,
    showLastBlock: boolean,
};

type BookInfos = { [key: string]: BookInfo };

enum HtmlCBType {
    previous = 0,
    deleteAndNext = 1,
    AddDocCard = 2,
    // saveDoc = 3,
    quit = 4,
    nextBook = 5,
    next = 6,
    ignoreBook = 7,
    fullfilContent = 8,
    cleanUnchanged = 9,
    DelDocCard = 10,
    deleteAndExit = 11,
    openFlashcardTab = 12,
    deleteAndBack = 13,
    viewContents = 14,
    splitByPunctuations = 15,
    splitByPunctuationsList = 16,
    splitByPunctuationsListCheck = 17,
    cleanOriginText = 18,
}
