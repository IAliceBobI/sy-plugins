export function zip2ways<A, B>(a: A[], b: B[]): [A, B][] {
    return zipAnyArrays(a, b) as any;
}

export function zip3ways<A, B, C>(a: A[], b: B[], c: C[]): [A, B, C][] {
    return zipAnyArrays(a, b, c) as any;
}

export function zipAnyArrays(...arrays: any[][]): any[][] {
    const maxLength = Math.max(...arrays.map(array => array.length));
    const zipped: any[][] = [];
    for (let i = 0; i < maxLength; i++) {
        const row: any[] = [];
        for (const array of arrays) {
            row.push(array[i]);
        }
        zipped.push(row);
    }
    return zipped;
}

export function flatChunkMap<M>(array: any[], num: number, map: (ts: any[]) => M) {
    array = array.flat();
    const newArr: M[] = [];
    for (let i = 0; i < array.length; i += num) {
        const part = array.slice(i, i + num);
        if (part.length > 0) {
            newArr.push(map(part));
        }
    }
    return newArr;
}

export async function aFlatChunkMap<M>(array: any[], num: number, map: (ts: any[]) => M) {
    return flatChunkMap(await Promise.all(array.flat()), num, map);
}

export function isIterable(obj: any): boolean {
    if (obj == null) return obj;

    // Check if the object has the Symbol.iterator property
    if (typeof obj[Symbol.iterator] === "function") {
        return true;
    }

    // Check if the object has the @@iterator method
    if (typeof obj["@@iterator"] === "function") {
        return true;
    }

    // If neither is present, the object is not iterable
    return false;
}