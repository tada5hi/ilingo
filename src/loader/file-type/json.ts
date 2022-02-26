/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'fs';

export async function loadJsonLines(filePath: string) : Promise<unknown | undefined> {
    try {
        const file = await fs.promises.readFile(filePath);
        return JSON.parse(file.toString('utf-8'));
    } catch (e) {
        return undefined;
    }
}

export function loadJsonLinesSync(filePath: string) : unknown | undefined {
    try {
        const file = fs.readFileSync(filePath);
        return JSON.parse(file.toString('utf-8'));
    } catch (e) {
        return undefined;
    }
}
