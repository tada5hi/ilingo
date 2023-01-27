/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import fs from 'fs';
import { LocatorInfo, LocatorOptions } from './type';
import { buildLocatorOptions } from './utils';

export async function locateFile(
    fileName: string,
    input?: Partial<LocatorOptions>,
) : Promise<LocatorInfo | undefined> {
    const options = buildLocatorOptions(input);

    for (let i = 0; i < options.paths.length; i++) {
        const filePath = path.join(options.paths[i], fileName);

        for (let j = 0; j < options.extensions.length; j++) {
            const filePathWithExtension = filePath + options.extensions[j];

            try {
                await fs.promises.access(filePathWithExtension, fs.constants.R_OK | fs.constants.F_OK);

                return {
                    path: options.paths[i],
                    fileName,
                    fileExtension: options.extensions[j],
                };
            } catch (e) {
                // do nothing ;)
            }
        }
    }

    return undefined;
}

export function locateFileSync(
    fileName: string,
    input?: Partial<LocatorOptions>,
) : LocatorInfo | undefined {
    const options = buildLocatorOptions(input);

    for (let i = 0; i < options.paths.length; i++) {
        const filePath = path.join(options.paths[i], fileName);

        for (let j = 0; j < options.extensions.length; j++) {
            const filePathWithExtension = filePath + options.extensions[j];

            try {
                fs.accessSync(filePathWithExtension, fs.constants.R_OK | fs.constants.F_OK);

                return {
                    path: options.paths[i],
                    fileName,
                    fileExtension: options.extensions[j],
                };
            } catch (e) {
                // do nothing ;)
            }
        }
    }

    return undefined;
}
