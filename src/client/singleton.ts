/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useConfig } from '../config';
import { Ilingo } from './module';

const instances: Record<string, Ilingo> = {};

export function useIlingo(key?: string): Ilingo {
    key = key || 'default';

    if (Object.prototype.hasOwnProperty.call(instances, key)) {
        return instances[key];
    }

    const config = useConfig(key);
    const instance = new Ilingo(config);

    instances[key] = instance;

    return instance;
}
