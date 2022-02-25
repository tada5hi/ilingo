/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from "path";
import fs from "fs";
import {LocatorInfo} from "./type";

export async function locateFile(
    paths: string[] | string,
    fileName: string,
    extensions?: string[] | string
) : Promise<LocatorInfo | undefined> {
    paths = Array.isArray(paths) ? paths : [paths];
    extensions = extensions ? (Array.isArray(extensions) ? extensions : [extensions]) : ['.ts', '.js'];

    for(let i=0; i<paths.length; i++) {
        const filePath = path.join(paths[i], fileName);

        for(let j=0; j<extensions.length; j++) {
            const filePathWithExtension = filePath + extensions[j];

            try {
                await fs.promises.access(filePathWithExtension, fs.constants.R_OK | fs.constants.F_OK);

                return {
                    path: paths[i],
                    fileName: fileName,
                    fileExtension: extensions[j]
                };
            } catch (e) {
                // do nothing ;)
            }
        }
    }

    return undefined;
}

export function locateFileSync(
    paths: string[] | string,
    fileName: string,
    extensions?: string | string[]
) : LocatorInfo | undefined {
    paths = Array.isArray(paths) ? paths : [paths];
    extensions = extensions ? (Array.isArray(extensions) ? extensions : [extensions]) : ['.ts', '.js'];

    for(let i=0; i<paths.length; i++) {
        const filePath = path.join(paths[i], fileName);

        for(let j=0; j<extensions.length; j++) {
            const filePathWithExtension = filePath + extensions[j];

            try {
                fs.accessSync(filePathWithExtension, fs.constants.R_OK | fs.constants.F_OK);

                return {
                    path: paths[i],
                    fileName: fileName,
                    fileExtension: extensions[j]
                };
            } catch (e) {
                // do nothing ;)
            }
        }
    }

    return undefined;
}
