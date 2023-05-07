/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';

export function setObjectPathProperty(
    record: Record<string, any>,
    key: string,
    value: unknown,
) {
    const parts = key.split('.');
    if (parts.length === 1) {
        record[key] = value;
        return;
    }

    const prefix = parts.shift();
    if (prefix) {
        if (
            !Object.prototype.hasOwnProperty.call(record, prefix) ||
            !isObject(record[prefix])
        ) {
            record[prefix] = {};
        }

        setObjectPathProperty(record[prefix], parts.join('.') as any, value as any);
    }
}

export function getObjectPathProperty(
    data: Record<string, any>,
    key: string,
) : any {
    const dotIndex = key.indexOf('.');
    const currentKey = dotIndex === -1 ?
        key :
        key.substring(0, dotIndex);

    if (dotIndex === -1) {
        return data[currentKey];
    }

    if (!isObject(data[currentKey])) {
        return undefined;
    }

    const nextKey = key.substring(currentKey.length + 1);
    return getObjectPathProperty(data[currentKey], nextKey);
}
