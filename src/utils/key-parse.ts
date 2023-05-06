/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function parseKey(key: string) : [string, string] {
    const index = key.indexOf('.');
    if (index === -1) {
        throw new SyntaxError('The key with required group prefix could not be parsed.');
    }

    const group = key.substring(0, index);
    const line = key.substring(group.length + 1);

    return [group, line];
}
