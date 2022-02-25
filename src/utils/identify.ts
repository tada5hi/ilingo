/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function isLanguageObject(value: unknown) : value is Record<string, string> {
    if (typeof value !== 'object') {
        return false;
    }

    const ob = value as Record<string, any>;
    const keys = Object.keys(ob);
    for (let i = 0; i < keys.length; i++) {
        /* istanbul ignore next */
        if (
            typeof ob[keys[i]] !== 'string' &&
            !isLanguageObject(ob[keys[i]])
        ) {
            return false;
        }
    }

    return true;
}
