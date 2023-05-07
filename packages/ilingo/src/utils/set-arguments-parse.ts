/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { LinesRecord, SetInputParsed } from '../type';
import { isGroupContext, isLocaleContext } from './identify';
import { parseKey } from './key-parse';
import { isBCP47LanguageCode } from './language';
import { flattenLinesRecord } from './lines-record';

function buildOutputForLines(
    input: Omit<SetInputParsed, 'key' | 'value'>,
    lines: LinesRecord,
) : SetInputParsed[] {
    const output : SetInputParsed[] = [];

    const data = flattenLinesRecord(lines);
    const lineKeys = Object.keys(data);
    for (let i = 0; i < lineKeys.length; i++) {
        output.push({
            ...input,
            key: lineKeys[i],
            value: data[lineKeys[i]],
        });
    }

    return output;
}

export function parseSetArguments(...input: any): SetInputParsed[] {
    if (input.length === 3) {
        const [key, value, context] = input;

        // todo: verify key & value are of type string

        if (
            isGroupContext(context) &&
            isLocaleContext(context)
        ) {
            return [
                {
                    group: context.group,
                    locale: context.locale,
                    key,
                    value,
                },
            ];
        }

        if (isLocaleContext(context)) {
            const parsed = parseKey(key);

            return [{
                group: parsed[0],
                locale: context.locale,
                key: parsed[1],
                value,
            }];
        }

        return [];
    }

    if (input.length === 2) {
        const [keyOrRecord, data] = input;

        if (
            typeof keyOrRecord === 'string' &&
            typeof data === 'string'
        ) {
            const [group, key] = parseKey(keyOrRecord);

            return [{
                group,
                key,
                value: data,
            }];
        }

        if (isObject(keyOrRecord)) {
            if (isLocaleContext(data) && !isGroupContext(data)) {
                const output : SetInputParsed[] = [];
                const keys = Object.keys(keyOrRecord);
                for (let i = 0; i < keys.length; i++) {
                    output.push(...buildOutputForLines(
                        {
                            locale: typeof data === 'string' ? data : data.locale,
                            group: keys[i],
                        },
                        keyOrRecord[keys[i]],
                    ));
                }

                return output;
            }

            if (isGroupContext(data)) {
                let locale : string | undefined;
                if (isLocaleContext(data)) {
                    locale = data.locale;
                }

                return buildOutputForLines(
                    {
                        locale,
                        group: data.group,
                    },
                    keyOrRecord,
                );
            }

            if (typeof data === 'string') {
                if (isBCP47LanguageCode(data)) {
                    const output : SetInputParsed[] = [];
                    const keys = Object.keys(keyOrRecord);
                    for (let i = 0; i < keys.length; i++) {
                        output.push(...buildOutputForLines({
                            group: keys[i],
                        }, keyOrRecord[keys[i]]));
                    }
                    return output;
                }

                return buildOutputForLines(
                    {
                        group: data,
                    },
                    keyOrRecord,
                );
            }
        }

        if (typeof keyOrRecord === 'string') {
            const parsed = parseKey(keyOrRecord);

            if (typeof data === 'string') {
                return [{
                    group: parsed[0],
                    key: parsed[1],
                    value: data,
                }];
            }

            if (isObject(data)) {
                return buildOutputForLines(
                    {
                        group: parsed[0],
                    },
                    data,
                );
            }
        }
    }

    if (input.length === 1) {
        const data = input[0];
        const keys = Object.keys(data);
        if (keys.length === 0) {
            return [];
        }

        const output : SetInputParsed[] = [];

        const key = keys[0];
        if (isBCP47LanguageCode(key)) {
            for (let i = 0; i < keys.length; i++) {
                const groupKeys = Object.keys(data[keys[i]]);
                for (let j = 0; j < groupKeys.length; j++) {
                    output.push(...buildOutputForLines(
                        {
                            locale: keys[i],
                            group: groupKeys[j],
                        },
                        data[keys[i]][groupKeys[j]],
                    ));
                }
            }
        } else {
            for (let i = 0; i < keys.length; i++) {
                output.push(...buildOutputForLines(
                    {
                        group: keys[i],
                    },
                    data[keys[i]],
                ));
            }
        }

        return output;
    }

    return [];
}
