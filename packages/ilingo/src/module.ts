/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigInput } from './config';
import { LOCALE_DEFAULT } from './constants';
import type { Store } from './store';
import type {
    GetContext,
} from './types';
import {
    template,
} from './utils';

export class Ilingo {
    public readonly stores : Set<Store>;

    protected locale: string;

    // ----------------------------------------------------

    constructor(input: ConfigInput = {}) {
        this.locale = input.locale || LOCALE_DEFAULT;

        this.stores = new Set<Store>();
        if (input.store) {
            this.stores.add(input.store);
        }
    }

    // ----------------------------------------------------

    merge(instance: Ilingo) {
        const ownEntries = Array.from(this.stores.values());
        const foreignEntries = Array.from(instance.stores.values());

        let foreignEntriesIndex = -1;
        for (let i = 0; i < foreignEntries.length; i++) {
            foreignEntriesIndex = -1;
            for (let j = 0; j < ownEntries.length; j++) {
                if (ownEntries[j] === foreignEntries[i]) {
                    foreignEntriesIndex = j;
                    break;
                }
            }

            if (foreignEntriesIndex === -1) {
                this.stores.add(foreignEntries[i]);
            }
        }
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

    async get(ctx: GetContext) : Promise<string | undefined> {
        let message : string | undefined;
        const entries = this.stores.values();
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const store = entries.next();
            if (store.done) {
                break;
            }

            message = await store.value.get({
                locale: ctx.locale || this.getLocale(),
                group: ctx.group,
                key: ctx.key,
            });

            if (message) {
                break;
            }
        }

        if (!message) {
            return undefined;
        }

        return this.format(message, ctx.data || {});
    }

    // ----------------------------------------------------

    format(input: string, data: Record<string, any>) {
        return template(input, data || {});
    }
}
