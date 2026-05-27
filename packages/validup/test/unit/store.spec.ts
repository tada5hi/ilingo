/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from 'ilingo';
import { IssueCode } from 'validup';
import { describe, expect, it } from 'vitest';
import { Store, createStore } from '../../src';

describe('Store', () => {
    it('ships all four locales for the built-in IssueCodes', async () => {
        const ilingo = new Ilingo({ locale: 'en' });
        ilingo.stores.add(createStore());

        for (const [locale, expected] of [
            ['en', 'The value is invalid'],
            ['de', 'Der Wert ist ungültig'],
            ['fr', 'La valeur est invalide'],
            ['es', 'El valor no es válido'],
        ] as const) {
            const message = await ilingo.get({
                group: 'validup',
                key: IssueCode.VALUE_INVALID,
                locale,
            });
            expect(message).toBe(expected);
        }
    });

    it('createStore returns a Store instance (identity check for install())', () => {
        const store = createStore();
        expect(store).toBeInstanceOf(Store);
    });
});
