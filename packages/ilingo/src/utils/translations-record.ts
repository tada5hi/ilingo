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
