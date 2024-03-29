/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {Ilingo, lang, langSync, setIlingo, useIlingo} from "../../../src";

describe('src/module.ts', () => {
    it('should work with async helper', async () => {
        const instance = new Ilingo();
        await instance.set({
            ru: {
                form: {
                    nested: {
                        key: 'RA'
                    }
                }
            }
        });

        setIlingo(instance);

        const output = await lang('form.nested.key', 'ru');
        expect(output).toEqual('RA');
    })

    it('should work with sync helper', () => {
        useIlingo()
            .setSync({
                ru: {
                    form: {
                        nested: {
                            key: 'RA'
                        }
                    }
                }
            })

        const output = langSync('form.nested.key', 'ru');
        expect(output).toEqual('RA');
    });
});
