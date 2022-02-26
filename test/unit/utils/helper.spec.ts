/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {lang, langSync, useLanguage} from "../../../src/index.server";
import path from "path";

const basePath = path.join(__dirname, '..', '..', 'data', 'language');

describe('src/module.ts', () => {
    it('should work with async helper', async () => {
        useLanguage({
            directory: basePath,
            locale: 'en'
        });

        let output = await lang('form.nested.key');
        expect(output).toEqual('I am nested');
    });

    it('should work with sync helper', () => {
        useLanguage({
            directory: basePath,
            locale: 'en'
        });

        let output = langSync('form.nested.key');
        expect(output).toEqual('I am nested');
    });
});
