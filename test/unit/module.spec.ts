/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {Ilingo} from "../../src/index.server";
import path from "path";

const basePath = path.join(__dirname, '..', 'data', 'language');

describe('src/module.ts', () => {
    it('should get/set directory + locale + groups', () => {
        const language = new Ilingo({
            cache: {
                ru: {
                    foo: {
                        line: 'bar-baz'
                    }
                },
                en: {
                    foo: {
                        line: 'baz-boz'
                    }
                }
            }
        });

        expect(language.getSync('foo.line', undefined, 'ru')).toEqual('bar-baz');
        expect(language.getSync('foo.line')).toEqual('baz-boz')

        language.setDirectory(basePath);
        expect(language.getDirectories()).toEqual([basePath]);
        expect(language.getDirectory()).toEqual(basePath);

        language.setLocale('en');
        expect(language.getLocale()).toEqual('en');
    });

    it('should work with lazy input', async () => {
        const language = new Ilingo();

        let output = await language.get('{{foo}}', {foo: 'bar'});
        expect(output).toEqual('bar');

        output = language.getSync('{{foo}}', {foo: 'bar'});
        expect(output).toEqual('bar');
    });

    it('should set line on the fly', async () => {
        const language = new Ilingo();

        language.set('foo.bar', 'value on the fly');
        let value = language.getSync('foo.bar');
        expect(value).toEqual('value on the fly');

        language.set('foo.baz', 'value with param {{param}} on the fly');
        value = await language.get('foo.baz', {param: 'lorem'});
        expect(value).toEqual('value with param lorem on the fly');
    })

    it('should work with nested input', async () => {
        const language = new Ilingo({
            directory: basePath,
            locale: 'en'
        });

        let output = await language.get('form.nested.key');
        expect(output).toEqual('I am nested');

        output = await language.get('form.nested.deep.key');
        expect(output).toEqual('I am deep nested');

        output = await language.get('form.nested.keyWithParam', {param: 'foo'});
        expect(output).toEqual('I am nested with param foo');

        // --------------------------------------------------

        language.setLocale('de');

        output = language.getSync('form.nested.key');
        expect(output).toEqual('Ich bin verschachtelt');

        output = language.getSync('form.nested.deep.key');
        expect(output).toEqual('Ich bin tief verschachtelt');

        output = language.getSync('form.nested.keyWithParam', {param: 'foo'});
        expect(output).toEqual('Ich bin mit parameter foo verschachtelt');
    })

    it('should translate async', async () => {
        const language = new Ilingo({
            directory: basePath
        });

        let line = await language.get('form.email');
        expect(line).toBeDefined();
        expect(line).toEqual('The input must be a valid email address.');

        line = await language.get('form.email', {}, 'de');
        expect(line).toEqual('Die Eingabe muss eine gültige E-Mail sein.');

        line = await language.get('form.maxLength', {max: 10});
        expect(line).toBeDefined();
        expect(line).toEqual('The length of the input must be less than 10.');

        line = await language.get('form.maxLength', {max: 5});
        expect(line).toBeDefined();
        expect(line).toEqual('The length of the input must be less than 5.');

        language.setLocale('de');

        line = await language.get('form.maxLength', {max: 5});
        expect(line).toBeDefined();
        expect(line).toEqual('Die Länge der Eingabe muss kleiner als 5 sein.');
    });

    it('should not translate async', async () => {
        const language = new Ilingo({
            directory: basePath,
            locale: 'en'
        });

        let line = await language.get('form.maxLength', {max: 5}, 'ru');
        expect(line).toEqual('maxLength');

        line = await language.get('form.foo', {});
        expect(line).toEqual('foo');
    })

    // ------------------------------------------------

    it('should translate sync',  () => {
        const language = new Ilingo({
            directory: basePath,
        });

        let line = language.getSync('form.email');
        expect(line).toBeDefined();
        expect(line).toEqual('The input must be a valid email address.');

        line = language.getSync('form.email', {}, 'de');
        expect(line).toEqual('Die Eingabe muss eine gültige E-Mail sein.');

        line = language.getSync('form.maxLength', {max: 10});
        expect(line).toBeDefined();
        expect(line).toEqual('The length of the input must be less than 10.');

        line = language.getSync('form.maxLength', {max: 5});
        expect(line).toBeDefined();
        expect(line).toEqual('The length of the input must be less than 5.');

        language.setLocale('de');

        line = language.getSync('form.maxLength', {max: 5});
        expect(line).toBeDefined();
        expect(line).toEqual('Die Länge der Eingabe muss kleiner als 5 sein.');
    });

    it('should not translate sync', () => {
        const language = new Ilingo({
            directory: basePath,
            locale: 'en'
        });

        let line = language.getSync('form.maxLength', {max: 5}, 'ru');
        expect(line).toEqual('maxLength');

        line = language.getSync('form.foo', {});
        expect(line).toEqual('foo');
    })
})
