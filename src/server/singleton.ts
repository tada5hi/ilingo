/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useConfig } from '../config';
import { Ilingo } from './module';

let instance : Ilingo | undefined;

export function useIlingo(): Ilingo {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    const config = useConfig();
    instance = new Ilingo(config);

    return instance;
}

export function setIlingo(value: Ilingo) {
    instance = value;
}
