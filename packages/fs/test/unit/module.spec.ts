/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { beforeAll, describe, it, expect } from "vitest";
import path from "node:path";
import {Ilingo} from "ilingo";
import {FSStore} from "../../src";

const basePath = path.join(__dirname, '..', 'data', 'language');

describe('src/store/file-system', function () {
    let store : FSStore;

    beforeAll(() => {
        store = new FSStore({ directory: basePath });
    })

    it('should get locales', async () => {
        const language = new Ilingo({ store });
        expect(await language.getLocales()).toEqual(['de', 'en', 'fr']);
    });

    it('should get locales sync',  async () => {
        const language = new Ilingo({ store });
        expect(await language.getLocales()).toEqual(['de', 'en', 'fr']);
    });

    it('should work with nested input', async () => {
        const language = new Ilingo({ store });

        let output = await language.get({
            group: 'form',
            key: 'nested.key'
        });
        expect(output).toEqual('I am nested');

        output = await language.get({
            group: 'form',
            key: 'nested.deep.key'
        });
        expect(output).toEqual('I am deep nested');

        output = await language.get({
            group: 'form',
            key: 'nested.keyWithParam',
            data: {
                param: 'foo'
            }
        });
        expect(output).toEqual('I am nested with param foo');

        // --------------------------------------------------

        language.setLocale('de');

        output = await language.get({
            group: 'form',
            key: 'nested.key'
        });
        expect(output).toEqual('Ich bin verschachtelt');

        output = await language.get({
            group: 'form',
            key: 'nested.deep.key'
        });
        expect(output).toEqual('Ich bin tief verschachtelt');

        output = await language.get({
            group: 'form',
            key: 'nested.keyWithParam',
            data: {
                param: 'foo'
            }
        });
        expect(output).toEqual('Ich bin mit parameter foo verschachtelt');
    })

    it('should translate async', async () => {
        const language = new Ilingo({ store });

        let line = await language.get({
            group: 'form',
            key: 'email'
        });
        expect(line).toBeDefined();
        expect(line).toEqual('The input must be a valid email address.');

        line = await language.get({
            group: 'form',
            key: 'email',
            locale: 'de'
        });
        expect(line).toEqual('Die Eingabe muss eine gültige E-Mail sein.');

        line = await language.get({
            group: 'form',
            key: 'maxLength',
            data: {
                max: 10
            }
        });
        expect(line).toBeDefined();
        expect(line).toEqual('The length of the input must be less than 10.');

        line = await language.get({
            group: 'form',
            key: 'maxLength',
            data: {
                max: 5
            }
        });
        expect(line).toBeDefined();
        expect(line).toEqual('The length of the input must be less than 5.');

        language.setLocale('de');

        line = await language.get({
            group: 'form',
            key: 'maxLength',
            data: {
                max: 5
            }
        });
        expect(line).toBeDefined();
        expect(line).toEqual('Die Länge der Eingabe muss kleiner als 5 sein.');
    });

    it('should not translate async', async () => {
        const language = new Ilingo({ store });

        let line = await language.get({
            group: 'form',
            key: 'maxLength',
            data: {
                max: 10
            },
            locale: 'ru'
        });
        expect(line).toBeUndefined();

        line = await language.get({
            group: 'form',
            key: 'foo'
        });
        expect(line).toBeUndefined();
    })
});
