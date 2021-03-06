/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbstractIlingo } from '../module';
import { IlingoOptions } from '../type';

export class Ilingo extends AbstractIlingo {
    // eslint-disable-next-line no-useless-constructor,@typescript-eslint/no-useless-constructor
    constructor(options?: IlingoOptions) {
        super(options);
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
