/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from './client/module';

let instance : Ilingo | undefined;

export function useIlingo(): Ilingo {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = new Ilingo();

    return instance;
}

export function unsetIlingo() {
    instance = undefined;
}
