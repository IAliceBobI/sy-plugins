type TestItem = { title: string, fn: any, skip: boolean }
const tests: TestItem[] = [];
let currentTitle = "";

export function assertEqual<T>(a: T, b: T, msg?: string) {
    if (!msg) msg = ""
    if (!deepEqual(a, b)) throw Error(`${currentTitle} : ${msg}\n${a}\n${b}\n`);
}

export function assertTrue(b: boolean, msg: string) {
    if (!b) throw Error(msg);
}

export function assertNotTrue(b: boolean, msg: string) {
    if (b) throw Error(msg);
}

export function add(skip: boolean, title: string, fn: any) {
    tests.push({ skip, title, fn })
}

export async function run() {
    for (const t of tests) {
        if (t.skip) continue;
        currentTitle = t.title;
        await t.fn()
    }
}

function deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) {
        return true;
    }

    if (typeof obj1 !== typeof obj2) {
        return false;
    }

    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) {
            return false;
        }
        for (let i = 0; i < obj1.length; i++) {
            if (!deepEqual(obj1[i], obj2[i])) {
                return false;
            }
        }
        return true;
    }

    if (typeof obj1 === 'object' && typeof obj2 === 'object') {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        if (keys1.length !== keys2.length) {
            return false;
        }
        for (let key of keys1) {
            if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
                return false;
            }
        }
        return true;
    }

    return false;
}
