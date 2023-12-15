import { SearchEngine } from "./search"

const tests: any[] = [];

function assertTrue(b: boolean, msg: string) {
    if (!b) throw Error(msg);
}

function assertNotTrue(b: boolean, msg: string) {
    if (b) throw Error(msg);
}

tests.push(() => {
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
    assertTrue(a.jsonCon() == b, "incorrect condition parsing")
})

tests.push(() => {
    let txt;
    const a = new SearchEngine(true);
    a.setQuery("!aa bb cc|dd !yy")

    txt = "奥赛房东bb大房cc东"
    assertTrue(a.match(txt), txt)
    txt = "奥赛房东bb大房dd东"
    assertTrue(a.match(txt), txt)
    txt = "奥赛房东bb大cc房dd东"
    assertTrue(a.match(txt), txt)
    txt = "奥赛房东bb大房东"

    assertNotTrue(a.match(txt), txt)
    txt = "奥赛房东bb大房cc东aa"
    assertNotTrue(a.match(txt), txt)
    txt = "奥赛房东bb大房cc东yy"
    assertNotTrue(a.match(txt), txt)
})

tests.forEach(t => t());

