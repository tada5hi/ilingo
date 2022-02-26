/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbstractIlingo } from '../module';
import { IlingoOptions } from '../type';
import { locateFile, locateFileSync } from '../locator';
import { load, loadSync } from '../loader';
import { isLineRecord } from '../utils';

export class Ilingo extends AbstractIlingo {
    // eslint-disable-next-line no-useless-constructor,@typescript-eslint/no-useless-constructor
    constructor(options?: IlingoOptions) {
        super(options);
    }

    async loadGroup(file: string, locale?: string) : Promise<Record<string, any>> {
        locale = locale || this.getLocale();

        // only load file once
        if (this.isLoaded(file, locale)) {
            /* istanbul ignore next */
            return {};
        }

        this.initLines(file, locale);
        this.setIsLoaded(file, locale);

        const locatorInfo = await locateFile(file, {
            locale,
            paths: this.directories,
        });

        if (!locatorInfo) {
            return {};
        }

        const data = await load(locatorInfo);

        this.cache[locale][file] = isLineRecord(data) ? data : {};

        return this.cache[locale][file];
    }

    loadGroupSync(file: string, locale?: string) : Record<string, any> {
        locale = locale || this.getLocale();

        if (this.isLoaded(file, locale)) {
            /* istanbul ignore next */
            return {};
        }

        this.initLines(file, locale);
        this.setIsLoaded(file, locale);

        const locatorInfo = locateFileSync(file, {
            locale,
            paths: this.directories,
        });

        if (!locatorInfo) {
            return {};
        }

        const data = loadSync(locatorInfo);

        this.cache[locale][file] = isLineRecord(data) ? data : {};

        return this.cache[locale][file];
    }
}
