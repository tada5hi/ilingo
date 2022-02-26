/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { LocatorOptions } from './type';
import { toArray } from '../utils';

export function buildLocatorOptions(options?: Partial<LocatorOptions>) : LocatorOptions {
    options = options || {};
    options.locale = options.locale || 'en';
    options.paths = options.paths || [];
    options.paths = toArray(options.paths);
    if (options.paths.length === 0) {
        options.paths.push(path.join(process.cwd(), 'language'));
    }
    options.paths = options.paths.map((item) => path.join(item, options.locale));

    options.extensions = options.extensions ?
        toArray(options.extensions) : ['.ts', '.js', '.json'];

    return options as LocatorOptions;
}
