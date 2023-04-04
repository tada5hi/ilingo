/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isLineRecord } from "../../../src";

describe('src/utils/identify.ts', () => {
    it('should identify the value correctly', () => {
        let value : unknown = {
            'busy': 'I am busy as hell :P'
        };

        expect(isLineRecord(value)).toBeTruthy();

        value = {};

        expect(isLineRecord(value)).toBeTruthy();
    });

    it('should not identify the value correctly', () => {
        let value : unknown = true;

        expect(isLineRecord(value)).toBeFalsy();

        value = 1;

        expect(isLineRecord(value)).toBeFalsy();

        value = 'abc';

        expect(isLineRecord(value)).toBeFalsy();
    })
});
