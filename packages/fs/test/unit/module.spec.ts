/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from "node:path";
import {Ilingo} from "ilingo";
import {FileSystemStore} from "../../src";

const basePath = path.join(__dirname, '..', '..', 'data', 'language');

describe('src/store/file-system', function () {
    let store : FileSystemStore;

    beforeAll(() => {
        store = new FileSystemStore(basePath);
    })

    it('should set/get store', () => {
        const language = new Ilingo();

        expect(language.getStore()).not.toEqual(store);

        language.setStore(store);

        expect(language.getStore()).toEqual(store);
    })

    it('should work with nested input', async () => {
        const language = new Ilingo({ store });

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
        const language = new Ilingo({ store });

        let line = await language.get('form.email');
        expect(line).toBeDefined();
        expect(line).toEqual('The input must be a valid email address.');

        line = await language.get('form.email', 'de');
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
        const language = new Ilingo({ store });

        let line = await language.get('form.maxLength', {max: 5}, 'ru');
        expect(line).toEqual('maxLength');

        line = await language.get('form.foo', {});
        expect(line).toEqual('foo');
    })

    // ------------------------------------------------

    it('should translate sync',  () => {
        const language = new Ilingo({ store  });

        let line = language.getSync('form.email');
        expect(line).toBeDefined();
        expect(line).toEqual('The input must be a valid email address.');

        line = language.getSync('form.email', 'de');
        expect(line).toEqual('Die Eingabe muss eine gültige E-Mail sein.');

        line = language.getSync('form.maxLength', {max: 10});
        expect(line).toEqual('The length of the input must be less than 10.');

        line = language.getSync('form.maxLength', {max: 5});
        expect(line).toEqual('The length of the input must be less than 5.');

        language.setLocale('de');

        line = language.getSync('form.maxLength', {max: 5});
        expect(line).toEqual('Die Länge der Eingabe muss kleiner als 5 sein.');
    });

    it('should not translate sync', () => {
        const language = new Ilingo({ store });

        let line = language.getSync('form.maxLength', {max: 5}, 'ru');
        expect(line).toEqual('maxLength');

        line = language.getSync('form.foo', {});
        expect(line).toEqual('foo');
    });
});
