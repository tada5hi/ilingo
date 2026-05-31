/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from 'ilingo';
import { IssueCode } from 'validup';
import { describe, expect, it } from 'vitest';
import { STORE_ID } from '../../src/constants';
import { Store, createMemoryStore } from '../../src/store/memory';

describe('Store', () => {
    it('ships all four locales for the built-in IssueCodes', async () => {
        const ilingo = new Ilingo({ locale: 'en' });
        ilingo.registerStore(createMemoryStore());

        for (const [locale, expected] of [
            ['en', 'The value is invalid'],
            ['de', 'Der Wert ist ungültig'],
            ['fr', 'La valeur est invalide'],
            ['es', 'El valor no es válido'],
        ] as const) {
            const message = await ilingo.get({
                namespace: 'validup',
                key: IssueCode.VALUE_INVALID,
                locale,
            });
            expect(message).toBe(expected);
        }
    });

    it('createMemoryStore returns a Store instance keyed by STORE_ID', () => {
        const store = createMemoryStore();
        expect(store).toBeInstanceOf(Store);
        expect(store.id).toBe(STORE_ID);
    });
});
