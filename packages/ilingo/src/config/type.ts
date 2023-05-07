import type { Store } from '../store';
import type { LocalesRecord } from '../type';

export type Config = {
    store: Store,
    // default: en
    locale: string,
    // default: {}
    data: LocalesRecord,
};

export type ConfigInput = Partial<Config>;
