import type { LanguageCache } from '../type';

export type Config = {
    // default: process.cw() + path.separator + 'languages';
    directory: string[],
    // default: en
    locale: string,
    // default: {}
    cache: LanguageCache,
};

export type ConfigInput = {
    directory?: string | string[],
} & Partial<Pick<Config, 'cache' | 'locale'>>;
