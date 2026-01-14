import type { IStore } from '../store';

export type Config = {
    store: IStore,
    // default: en
    locale: string,
};

export type ConfigInput = Partial<Config>;
