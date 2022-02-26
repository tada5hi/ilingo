/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '../../utils';

export async function loadScript(filePath: string) : Promise<unknown | undefined> {
    try {
        let data = await import(filePath);
        if (hasOwnProperty(data, 'default')) {
            data = data.default;
        }

        return data;
    } catch (e) {
        return undefined;
    }
}

export function loadScriptSync(filePath: string) : unknown | undefined {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require,import/no-dynamic-require
        let data = require(filePath);
        if (hasOwnProperty(data, 'default')) {
            data = data.default;
        }

        return data;
    } catch (e) {
        return undefined;
    }
}
