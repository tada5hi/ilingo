/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { GetInputParsed } from '../type';
import { isGroupContext, isLocaleContext } from './identify';
import { parseKey } from './key-parse';
import { isBCP47LanguageCode } from './language';

export function parseGetArguments(...input: any[]) : GetInputParsed | undefined {
    if (input.length === 3) {
        const [key, data, context] = input;
        if (typeof context === 'string') {
            if (isBCP47LanguageCode(context)) {
                const parsed = parseKey(key);

                return {
                    ...(data ? { data } : {}),
                    group: parsed[0],
                    key: parsed[1],
                    locale: context,
                };
            }

            return {
                ...(data ? { data } : {}),
                group: context,
                key,
            };
        }

        let locale: string | undefined;
        let group : string | undefined;

        if (isGroupContext(context)) {
            group = context.group;
        }

        if (isLocaleContext(context)) {
            locale = context.locale;
        }

        if (group) {
            return {
                ...(data ? { data } : {}),
                group,
                key,
                locale,
            };
        }
    }

    if (input.length >= 1) {
        const [groupKey, data] = input;

        if (isObject(data)) {
            if (isGroupContext(data) || isLocaleContext(data)) {
                let locale: string | undefined;
                let group : string | undefined;

                if (isGroupContext(data)) {
                    group = data.group;
                }

                if (isLocaleContext(data)) {
                    locale = data.locale;
                }

                if (group) {
                    return {
                        group,
                        locale,
                        key: groupKey,
                    };
                }

                const parsed = parseKey(groupKey);

                return {
                    group: parsed[0],
                    locale,
                    key: parsed[1],
                };
            }

            const [group, key] = parseKey(groupKey);

            return {
                ...(data ? { data } : {}),
                group,
                key,
            };
        }

        let locale : string | undefined;
        let group : string | undefined;

        if (typeof data === 'string') {
            if (isBCP47LanguageCode(data)) {
                locale = data;
            } else {
                group = data;
            }
        }

        if (typeof group === 'undefined') {
            const parsed = parseKey(groupKey);

            return {
                group: parsed[0],
                ...(locale ? { locale } : {}),
                key: parsed[1],
            };
        }

        return {
            group,
            ...(locale ? { locale } : {}),
            key: groupKey,
        };
    }

    return undefined;
}
