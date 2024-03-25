// https://app.quicktype.io/?l=ts

type SettingCfgType = {
    hideBtnsInFlashCard: boolean;
    cardUnderPiece: boolean;
    openCardsOnOpenPiece: boolean,
    btnViewContents: boolean,
    btnSplitByPunctuationsListCheck: boolean;
    btnFullfilContent: boolean;
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

type AsList = "p" | "i" | "t";

type WordCountType = { id: string; count: number; type: string; subType: string };

type BookInfo = {
    time: number,
    boxID: string,
    point: number,
    bookID: string,
    ignored: boolean,
    fastInsert: boolean,
    autoCard: boolean,
    showLastBlock: boolean,
    autoSplitSentenceP: boolean,
    autoSplitSentenceI: boolean,
    autoSplitSentenceT: boolean,
    addIndex2paragraph: boolean,
};

type BookInfos = { [key: string]: BookInfo };


