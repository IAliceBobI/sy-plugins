export function zipArrays<T>(...arrays: T[][]): T[][] {
    return zipAnyArrays(...arrays);
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

