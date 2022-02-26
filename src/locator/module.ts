/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import fs from 'fs';
import { LocatorInfo, LocatorOptions } from './type';
import { toArray } from '../utils';

function buildOptions(options?: Partial<LocatorOptions>) : LocatorOptions {
    options = options || {};
    options.locale = options.locale || 'en';
    options.paths = options.paths || [];
    options.paths = toArray(options.paths);
    if (options.paths.length === 0) {
        options.paths.push(path.join(process.cwd(), 'language'));
    }
    options.paths = options.paths.map((item) => path.join(item, options.locale));

    options.extensions = options.extensions ?
        toArray(options.extensions) : ['.ts', '.js'];

    return options as LocatorOptions;
}

export async function locateFile(
    fileName: string,
    options?: Partial<LocatorOptions>,
) : Promise<LocatorInfo | undefined> {
    options = buildOptions(options);

    for (let i = 0; i < options.paths.length; i++) {
        const filePath = path.join(options.paths[i], fileName);

        for (let j = 0; j < options.extensions.length; j++) {
            const filePathWithExtension = filePath + options.extensions[j];

            try {
                await fs.promises.access(filePathWithExtension, fs.constants.R_OK | fs.constants.F_OK);

                return {
                    path: options.paths[i],
                    fileName,
                    // we do not add .ts / .js extension so import/require can import the right file ;)
                    filePath: path.join(options.paths[i], fileName),
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
    options?: Partial<LocatorOptions>,
) : LocatorInfo | undefined {
    options = buildOptions(options);

    for (let i = 0; i < options.paths.length; i++) {
        const filePath = path.join(options.paths[i], fileName);

        for (let j = 0; j < options.extensions.length; j++) {
            const filePathWithExtension = filePath + options.extensions[j];

            try {
                fs.accessSync(filePathWithExtension, fs.constants.R_OK | fs.constants.F_OK);

                return {
                    path: options.paths[i],
                    fileName,
                    filePath: path.join(options.paths[i], fileName),
                    fileExtension: options.extensions[j],
                };
            } catch (e) {
                // do nothing ;)
            }
        }
    }

    return undefined;
}
