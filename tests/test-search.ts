import { SearchEngine } from "./search"

const a = new SearchEngine(true);
a.setQuery("啊是 我是 !!！吧是|的是|人是 　　 ！!！网是   　 懂是 !! ! ！ ！！")

const b = JSON.stringify([
    {
        "type": "inc",
        "value": "啊是"
    },
    {
        "type": "inc",
        "value": "我是"
    },
    {
        "type": "or",
        "values": [
            {
                "type": "exc",
                "value": "吧是"
            },
            {
                "type": "inc",
                "value": "的是"
            },
            {
                "type": "inc",
                "value": "人是"
            }
        ]
    },
    {
        "type": "exc",
        "value": "网是"
    },
    {
        "type": "inc",
        "value": "懂是"
    }
])

if (a.jsonCon() != b) throw Error("condition parsing error")

