import { SearchEngine } from "./search"
import * as test from "./utils4test"

test.add(false, "test11", () => {
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
    test.assertEqual(a.jsonCon(), b, "incorrect condition parsing")
})

test.add(false, "test22", () => {
    let txt;
    const a = new SearchEngine(true);
    a.setQuery("!aa bb cc|dd !yy")

    txt = "奥赛房东bb大房cc东"
    test.assertTrue(a.match(txt), txt)
    txt = "奥赛房东bb大房dd东"
    test.assertTrue(a.match(txt), txt)
    txt = "奥赛房东bb大cc房dd东"
    test.assertTrue(a.match(txt), txt)
    txt = "奥赛房东bb大房东"

    test.assertNotTrue(a.match(txt), txt)
    txt = "奥赛房东bb大房cc东aa"
    test.assertNotTrue(a.match(txt), txt)
    txt = "奥赛房东bb大房cc东yy"
    test.assertNotTrue(a.match(txt), txt)
})

test.run();

