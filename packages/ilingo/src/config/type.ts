import type { Store } from '../store';

export type Config = {
    store: Store,
    // default: en
    locale: string,
};

export type ConfigInput = Partial<Config>;
