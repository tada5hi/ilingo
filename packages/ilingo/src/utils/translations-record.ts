/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PluralNode, Translations } from '../types';
import { isPluralNode } from './identify';

export type TranslationsRecordParsed = {
    key: string,
    value: string | PluralNode
};
export function parseTranslationsRecord(record: Translations, parent?: string): TranslationsRecordParsed[] {
    const output : TranslationsRecordParsed[] = [];
    const keys = Object.keys(record);
    for (const key of keys) {
        const value = record[key];
        const nextKey = parent ?
            `${parent}.${  key}` :
            key;

        if (typeof value === 'string' || isPluralNode(value)) {
            output.push({
                value,
                key: nextKey,
            });
        } else {
            output.push(...parseTranslationsRecord(value, nextKey));
        }
    }

    return output;
}
