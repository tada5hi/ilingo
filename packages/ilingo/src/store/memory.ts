/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getPathValue, setPathValue } from 'pathtrace';
import type { Leaf, LocalesRecord } from '../types';
import { isProductionEnv } from '../utils/env';
import { isPluralLeaf, isPluralLeafExplicit } from '../utils/identify';
import type {
    IStore,
    MemoryStoreOptions,
    StoreGetContext,
    StoreSetContext,
} from './types';

export class MemoryStore implements IStore {
    protected data: LocalesRecord;

    /**
     * Per-instance warn-once set for the bare structural plural form
     * (`{ one, other }` without the `@plural` wrapper). Deprecated in the
     * stability roadmap (#917 Track B) — will be removed at the next major.
     * Each `(locale, group, key)` triple only warns the first time it is
     * seen, so a render loop doesn't spam the console.
     */
    protected warnedStructuralPlural = new Set<string>();

    constructor(options: MemoryStoreOptions) {
        this.data = options.data;
    }

    async get(context: StoreGetContext): Promise<Leaf | undefined> {
        if (
            !this.data[context.locale] ||
            !this.data[context.locale][context.group]
        ) {
            return undefined;
        }

        const output = getPathValue(
            this.data[context.locale][context.group],
            context.key,
        );

        if (typeof output === 'string') {
            return output;
        }

        // Explicit `{ "@plural": { ... } }` — the recommended form.
        if (isPluralLeafExplicit(output)) {
            return output['@plural'];
        }

        // Bare structural `{ one, other }` — accepted today for backward
        // compatibility, deprecated by the stability roadmap (#917 Track B)
        // and scheduled for removal at the next major. Warns once per
        // (locale, group, key) so consumers can migrate without console spam.
        if (isPluralLeaf(output)) {
            this.warnStructuralPlural(context);
            return output;
        }

        return undefined;
    }

    async set(context: StoreSetContext): Promise<void> {
        this.initLines(context.group, context.locale);

        setPathValue(
            this.data[context.locale][context.group],
            context.key,
            context.value,
        );
    }

    protected initLines(group: string, locale: string) {
        if (typeof this.data[locale] === 'undefined') {
            this.data[locale] = {};
        }

        if (typeof this.data[locale][group] === 'undefined') {
            this.data[locale][group] = {};
        }
    }

    async getLocales(): Promise<string[]> {
        return Object.keys(this.data);
    }

    protected warnStructuralPlural(context: StoreGetContext): void {
        /* istanbul ignore next */
        if (isProductionEnv()) return;
        const id = `${context.locale}|${context.group}|${context.key}`;
        if (this.warnedStructuralPlural.has(id)) return;
        this.warnedStructuralPlural.add(id);
        // eslint-disable-next-line no-console
        console.warn(
            '[ilingo] deprecated: the bare structural plural form ' +
            `({ one, other, ... }) at "${context.locale}.${context.group}.${context.key}" ` +
            'will be removed in the next major. Wrap it in `{ "@plural": { ... } }` ' +
            '(JSON) or use `definePlural({ ... })` (TS).',
        );
    }
}
