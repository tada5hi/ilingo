/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {isLanguageObject} from "../../src";

describe('src/utils.ts', () => {
    it('should identify the value correctly', () => {
        let value : unknown = {
            'busy': 'I am busy as hell :P'
        };

        expect(isLanguageObject(value)).toBeTruthy();

        value = {};

        expect(isLanguageObject(value)).toBeTruthy();
    });

    it('should not identify the value correctly', () => {
        let value : unknown = true;

        expect(isLanguageObject(value)).toBeFalsy();

        value = 1;

        expect(isLanguageObject(value)).toBeFalsy();

        value = 'abc';

        expect(isLanguageObject(value)).toBeFalsy();
    })
});
