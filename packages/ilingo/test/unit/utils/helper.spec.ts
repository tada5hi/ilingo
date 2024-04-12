/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {Ilingo, lang, setIlingo} from "../../../src";

describe('src/module.ts', () => {
    it('should work with async helper', async () => {
        const instance = new Ilingo();
        await instance.set({
            locale: 'ru',
            group: 'form',
            key: 'nested.key',
            value: 'RA'
        });

        setIlingo(instance);

        const output = await lang({
            locale: 'ru',
            group: 'form',
            key: 'nested.key'
        });
        expect(output).toEqual('RA');
    })
});
