enum SearchEngineConditionTypeOr {
    include = "inc",
    exclude = "exc",
}
enum SearchEngineConditionType {
    include = "inc",
    or = "or",
    exclude = "exc",
}

type SearchEngineConditionOr = { type: SearchEngineConditionTypeOr, value: string }
type SearchEngineCondition = { type: SearchEngineConditionType, value?: string, values?: SearchEngineConditionOr[] }

export class SearchEngine {
    private conditions: SearchEngineCondition[] = [];
    private isCaseInsensitive: boolean;

    constructor(isCaseInsensitive: boolean) {
        this.isCaseInsensitive = isCaseInsensitive;
    }

    setQuery(query: string) {
        if (this.isCaseInsensitive)
            query = query.toLowerCase();
        this.conditions = query
            .replace(/[！!]+/g, "!")
            .replace(/\s+/, " ")
            .replace(/ ?\| ?/g, "|")
            .split(" ").filter(c => c != "!").map(c => {
                const con = c.split("|").map(c => c.trim()).filter(c => c.length > 0);
                const ret = {} as SearchEngineCondition;
                if (con.length == 1) {
                    const s = con[0]
                    if (s[0] == "!") {
                        ret.type = SearchEngineConditionType.exclude;
                        ret.value = s.slice(1);
                    } else {
                        ret.type = SearchEngineConditionType.include;
                        ret.value = s;
                    }
                } else {
                    ret.type = SearchEngineConditionType.or;
                    ret.values = con.map(c => {
                        const ret = {} as SearchEngineConditionOr;
                        if (c[0] == "!") {
                            ret.type = SearchEngineConditionTypeOr.exclude;
                            ret.value = c.slice(1)
                        } else {
                            ret.type = SearchEngineConditionTypeOr.include;
                            ret.value = c
                        }
                        return ret;
                    })
                }
                return ret;
            }).filter(c => {
                if (c.type == SearchEngineConditionType.or) {
                    if (c.values?.length == 0) return false;
                }
                return true;
            });
    }

    jsonCon() {
        return JSON.stringify(this.conditions);
    }

    match(text: string): boolean {
        if (this.isCaseInsensitive)
            text = text.toLowerCase();
        console.log(text)
        console.log(this.conditions)
        for (const con of this.conditions) {
            if (typeof con === "string") {

            } else {

            }
        }
        return true;
    }
}
