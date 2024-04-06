/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildConfig } from './config';
import type { ConfigInput } from './config';
import { LOCALE_DEFAULT } from './constants';
import type { Store } from './store';
import type {
    DotKey,
    GroupContext,
    GroupsRecord, LinesRecord, LocaleContext, LocalesRecord,
} from './type';
import {
    parseGetArguments,
    parseSetArguments,
    template,
} from './utils';

export class Ilingo {
    protected store : Store;

    protected locale: string;

    // ----------------------------------------------------

    constructor(input: ConfigInput = {}) {
        const config = buildConfig(input);

        this.locale = config.locale;
        this.store = config.store;
    }

    // ----------------------------------------------------

    setStore(value: Store) {
        this.store = value;
    }

    getStore() : Store {
        return this.store;
    }

    // ----------------------------------------------------

    setLocale(key: string) {
        this.locale = key;
    }

    resetLocale() {
        this.locale = LOCALE_DEFAULT;
    }

    getLocale() : string {
        return this.locale;
    }

    // ----------------------------------------------------

    getLocales() : Promise<string[]> {
        return this.store.getLocales();
    }

    // ----------------------------------------------------

    async set(localesRecord: LocalesRecord) : Promise<void>;

    async set(groupsRecord: GroupsRecord, groupOrLocale?: string) : Promise<void>;

    async set(groupsRecord: GroupsRecord, context?: LocaleContext) : Promise<void>;

    async set(linesRecord: LinesRecord, context: Partial<LocaleContext> & GroupContext) : Promise<void>;

    async set(keyWithGroup: DotKey, value: string | LinesRecord, context?: LocaleContext) : Promise<void>;

    async set(key: string, value: string, context: Partial<LocaleContext> & GroupContext) : Promise<void>;

    async set(...input: any[]) {
        const parsed = parseSetArguments(...input);
        const promises : Promise<void>[] = [];
        for (let i = 0; i < parsed.length; i++) {
            promises.push(this.store.set({
                ...parsed[i],
                locale: parsed[i].locale || this.getLocale(),
            }));
        }

        await Promise.all(promises);
    }

    // ----------------------------------------------------

    async get(keyWithGroup: DotKey, locale?: string) : Promise<string | undefined>;

    async get(keyWithGroup: DotKey, context?: LocaleContext) : Promise<string | undefined>;

    async get(keyWithGroup: DotKey, data?: Record<string, any>) : Promise<string | undefined>;

    async get(keyWithGroup: DotKey, data?: Record<string, any>, locale?: string) : Promise<string | undefined>;

    async get(key: string, context: GroupContext & Partial<LocaleContext>) : Promise<string | undefined>;

    async get(key: string, data: Record<string, any>, context: GroupContext & Partial<LocaleContext>) : Promise<string | undefined>;

    async get(...input: any[]) : Promise<string | undefined> {
        const parsed = parseGetArguments(...input);
        if (!parsed) {
            return undefined;
        }

        const message = await this.store.get({
            locale: parsed.locale || this.getLocale(),
            group: parsed.group,
            key: parsed.key,
        });

        return this.format(message || parsed.key, parsed.data || {});
    }

    // ----------------------------------------------------

    format(input: string, data: Record<string, any>) {
        return template(input, data || {});
    }
}
