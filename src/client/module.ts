/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigInput } from '../config';
import { AbstractIlingo } from '../module';

export class Ilingo extends AbstractIlingo {
    // eslint-disable-next-line no-useless-constructor,@typescript-eslint/no-useless-constructor
    constructor(config?: ConfigInput) {
        super(config);
    }

    async loadGroup(file: string, locale?: string) : Promise<Record<string, any>> {
        this.setIsLoaded(file, locale);
        return {};
    }

    loadGroupSync(file: string, locale?: string) : Record<string, any> {
        this.setIsLoaded(file, locale);
        return {};
    }
}
