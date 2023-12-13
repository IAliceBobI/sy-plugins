export class MaxCache<T> {
    private cache: Map<string, { obj: T, timestamp: number }> = new Map();
    private _maxSize: number;
    public get maxSize(): number {
        return this._maxSize;
    }
    public set maxSize(value: number) {
        this._maxSize = value;
    }
    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }
    /**
     *  add `obj` to cache, drop the old one without return it.
     * @param key 
     * @param obj 
     * @returns return the new value NOT the old one
     */
    public add(key: string, obj: T): T {
        const entries = Array.from(this.cache.entries());
        if (entries.length > this.maxSize) {
            entries.sort((e1, e2) => {
                return e1[1].timestamp - e2[1].timestamp;
            }).slice(0, entries.length / 2).forEach(e => {
                this.cache.delete(e[0]);
            });
        }
        this.cache.set(key, { obj: obj, timestamp: new Date().getTime() });
        return obj;
    }
    public get(key: string, defaultValue: T): T {
        const v = this.cache.get(key)
        if (!v) {
            return this.add(key, defaultValue)
        }
        return v.obj;
    }
    public getOrElse(key: string, createValue: Func): T {
        const v = this.cache.get(key)
        if (!v) {
            return this.add(key, createValue())
        }
        return v.obj;
    }
}
