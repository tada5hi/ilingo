/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildConfig } from './config';
import type { ConfigInput } from './config';
import { LOCALE_DEFAULT, STORE_DEFAULT } from './constants';
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
    public readonly stores : Map<string | symbol, Store>;

    protected locale: string;

    // ----------------------------------------------------

    constructor(input: ConfigInput = {}) {
        const config = buildConfig(input);

        this.locale = config.locale;

        this.stores = new Map<string | symbol, Store>();
        this.stores.set(STORE_DEFAULT, config.store);
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

    async getLocales() : Promise<string[]> {
        const locales : string[] = [];
        const entries = this.stores.values();
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const store = entries.next();
            if (store.done) {
                break;
            }

            locales.push(...await store.value.getLocales());
        }
        return Array.from(new Set(locales));
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

        const store = this.stores.get(STORE_DEFAULT);
        for (let i = 0; i < parsed.length; i++) {
            promises.push(store.set({
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

        let message : string | undefined;
        const entries = this.stores.values();
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const store = entries.next();
            if (store.done) {
                break;
            }

            message = await store.value.get({
                locale: parsed.locale || this.getLocale(),
                group: parsed.group,
                key: parsed.key,
            });

            if (message) {
                break;
            }
        }

        return this.format(message || parsed.key, parsed.data || {});
    }

    // ----------------------------------------------------

    format(input: string, data: Record<string, any>) {
        return template(input, data || {});
    }
}
