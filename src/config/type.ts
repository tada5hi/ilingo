import type { LanguageData } from '../type';

export type Config = {
    // default: process.cw() + path.separator + 'languages';
    directory: string[],
    // default: en
    locale: string,
    // default: {}
    data: LanguageData,
};

export type ConfigInput = {
    directory?: string | string[],
} & Partial<Pick<Config, 'data' | 'locale'>>;
