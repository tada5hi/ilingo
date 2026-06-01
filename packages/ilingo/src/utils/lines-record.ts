import type { Lines, PluralNode } from '../types';
import { isPluralNode } from './identify';

export type LinesRecordParsed = {
    key: string,
    value: string | PluralNode
};
export function parseLinesRecord(record: Lines, parent?: string): LinesRecordParsed[] {
    const output : LinesRecordParsed[] = [];
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
            output.push(...parseLinesRecord(value, nextKey));
        }
    }

    return output;
}
