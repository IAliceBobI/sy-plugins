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

