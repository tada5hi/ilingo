/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {Language, useLanguage} from "../../src";

describe('src/singleton.ts', () => {
    it('should create instance', () => {
        let instance = useLanguage();

        expect(instance).toBeInstanceOf(Language);

        expect(instance).toEqual(useLanguage());
    })
})
