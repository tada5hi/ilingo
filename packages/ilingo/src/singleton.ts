/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { singa } from 'singa';
import { Ilingo } from './module';

const singleton = singa({
    name: 'ilingo',
    factory: () => new Ilingo(),
});

export function hasIlingo() : boolean {
    return singleton.has();
}
export function useIlingo(): Ilingo {
    return singleton.use();
}

export function setIlingo(instance: Ilingo) {
    singleton.set(instance);
}
