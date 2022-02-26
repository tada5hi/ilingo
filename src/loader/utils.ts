/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { LocatorInfo } from '../locator';

export function buildLoaderFilePath(info: LocatorInfo) {
    return path.join(info.path, info.fileName) +
        (info.fileExtension === '.json' ? '.json' : '');
}
