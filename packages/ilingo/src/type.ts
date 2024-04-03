/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type ValueOrNestedValue<T> = {
    [key: string]: ValueOrNestedValue<T> | T
};

// default: Record<group, Record<locale, Lines>>
export type LinesRecord = ValueOrNestedValue<string>;
// default: Record<group, Lines>
export type GroupsRecord = Record<string, LinesRecord>;
// default: Record<locale, Groups>
export type LocalesRecord = Record<string, GroupsRecord>;

export type LocaleContext = {
    locale: string
};

export type DotKey = `${string}.${string}`;

export type GroupContext = {
    group: string
};

export type SetInputParsed = {
    locale?: string,
    group: string,
    key: string,
    value: string
};

export type GetInputParsed = {
    data?: Record<string, string>
    locale?: string,
    group: string,
    key: string,
};

export type StoreOptions = {
    /**
     * Set store in read only mode.
     */
    locked: boolean,
};
