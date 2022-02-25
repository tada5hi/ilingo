/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {Language} from "../../src";
import path from "path";

const basePath = path.join(__dirname, '..', 'data', 'language');

describe('src/module.ts', () => {
    it('should get/set options + locale', () => {
        const language = new Language();
        const options = {
            directory: basePath,
            locale: 'en'
        };
        language.setOptions(options);

        const value = language.getOptions();
        expect(value).toEqual(options);
    });

    it('should work with lazy input', async () => {
        const language = new Language();

        let output = await language.getLine('{{foo}}', {foo: 'bar'});
        expect(output).toEqual('bar');

        output = language.getLineSync('{{foo}}', {foo: 'bar'});
        expect(output).toEqual('bar');
    });

    it('should work with nested input', async () => {
        const language = new Language();
        language.setOptions({
            directory: basePath,
            locale: 'en'
        });

        let output = await language.getLine('form.nested.key');
        expect(output).toEqual('I am nested');

        output = await language.getLine('form.nested.deep.key');
        expect(output).toEqual('I am deep nested');

        output = await language.getLine('form.nested.keyWithParam', {param: 'foo'});
        expect(output).toEqual('I am nested with param foo');

        // --------------------------------------------------

        language.setOptions({locale: 'de'})

        output = language.getLineSync('form.nested.key');
        expect(output).toEqual('Ich bin verschachtelt');

        output = language.getLineSync('form.nested.deep.key');
        expect(output).toEqual('Ich bin tief verschachtelt');

        output = language.getLineSync('form.nested.keyWithParam', {param: 'foo'});
        expect(output).toEqual('Ich bin mit parameter foo verschachtelt');
    })

    it('should translate async', async () => {
        const language = new Language();
        language.setOptions({
            directory: basePath,
            locale: 'en'
        });

        let line = await language.getLine('form.email');
        expect(line).toBeDefined();
        expect(line).toEqual('The input must be a valid email address.');

        line = await language.getLine('form.email', {}, 'de');
        expect(line).toEqual('Die Eingabe muss eine gültige E-Mail sein.');

        line = await language.getLine('form.maxLength', {max: 10});
        expect(line).toBeDefined();
        expect(line).toEqual('The length of the input must be less than 10.');

        line = await language.getLine('form.maxLength', {max: 5});
        expect(line).toBeDefined();
        expect(line).toEqual('The length of the input must be less than 5.');

        language.setOptions({
            locale: 'de'
        })

        line = await language.getLine('form.maxLength', {max: 5});
        expect(line).toBeDefined();
        expect(line).toEqual('Die Länge der Eingabe muss kleiner als 5 sein.');
    });

    it('should not translate async', async () => {
        const language = new Language({
            directory: basePath,
            locale: 'en'
        });

        let line = await language.getLine('form.maxLength', {max: 5}, 'ru');
        expect(line).toEqual('maxLength');

        line = await language.getLine('form.foo', {});
        expect(line).toEqual('foo');
    })

    // ------------------------------------------------

    it('should translate sync',  () => {
        const language = new Language();
        language.setOptions({
            directory: basePath,
            locale: 'en'
        });

        let line = language.getLineSync('form.email');
        expect(line).toBeDefined();
        expect(line).toEqual('The input must be a valid email address.');

        line = language.getLineSync('form.email', {}, 'de');
        expect(line).toEqual('Die Eingabe muss eine gültige E-Mail sein.');

        line = language.getLineSync('form.maxLength', {max: 10});
        expect(line).toBeDefined();
        expect(line).toEqual('The length of the input must be less than 10.');

        line = language.getLineSync('form.maxLength', {max: 5});
        expect(line).toBeDefined();
        expect(line).toEqual('The length of the input must be less than 5.');

        language.setOptions({
            locale: 'de'
        })

        line = language.getLineSync('form.maxLength', {max: 5});
        expect(line).toBeDefined();
        expect(line).toEqual('Die Länge der Eingabe muss kleiner als 5 sein.');
    });

    it('should not translate sync', () => {
        const language = new Language({
            directory: basePath,
            locale: 'en'
        });

        let line = language.getLineSync('form.maxLength', {max: 5}, 'ru');
        expect(line).toEqual('maxLength');

        line = language.getLineSync('form.foo', {});
        expect(line).toEqual('foo');
    })
})
