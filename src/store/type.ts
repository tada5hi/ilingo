
export type StoreGetContext = {
    locale: string,
    group: string,
    key: string
}

export type StoreSetContext = StoreGetContext & {
    value: string
}

export interface Store {
    get(context: StoreGetContext) : Promise<string | undefined>;
    set(context: StoreSetContext) : Promise<void>;
}
