/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LocatorInfo } from '../locator';
import {
    loadJsonLines, loadJsonLinesSync, loadScript, loadScriptSync,
} from './file-type';
import { buildLoaderFilePath } from './utils';

export async function load(info?: LocatorInfo) : Promise<unknown | undefined> {
    if (!info) return undefined;

    const filePath = buildLoaderFilePath(info);

    if (info.fileExtension === '.json') {
        return loadJsonLines(filePath);
    }

    return loadScript(filePath);
}

export function loadSync(info: LocatorInfo) : unknown | undefined {
    if (!info) return undefined;

    const filePath = buildLoaderFilePath(info);

    if (info.fileExtension === '.json') {
        return loadJsonLinesSync(filePath);
    }

    return loadScriptSync(filePath);
}
