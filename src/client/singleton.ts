/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from './module';
import { IlingoOptions } from '../type';
import { AbstractIlingo } from '../module';

const instances: Record<string, AbstractIlingo> = {};

export function useIlingo(
    options?: IlingoOptions,
    key?: string,
): AbstractIlingo {
    key = key || 'default';

    if (Object.prototype.hasOwnProperty.call(instances, key)) {
        return instances[key];
    }

    const instance = new Ilingo(options);

    instances[key] = instance;

    return instance;
}
