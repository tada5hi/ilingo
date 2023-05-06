/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {Ilingo} from "../../src";

describe('src/module.ts', () => {
    it('should get/set directory + locale + groups', () => {
        const ilingo = new Ilingo({
            data: {
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

        expect(ilingo.getSync('foo.line', undefined, 'ru')).toEqual('bar-baz');
        expect(ilingo.getSync('foo.line', 'ru')).toEqual('bar-baz');
        expect(ilingo.getSync('foo.line')).toEqual('baz-boz')

        ilingo.setLocale('en');
        expect(ilingo.getLocale()).toEqual('en');
    });

    it('should set/unset locale', () => {
        const ilingo = new Ilingo();

        expect(ilingo.getLocale()).toEqual('en');

        ilingo.setLocale('ru');
        expect(ilingo.getLocale()).toEqual('ru');

        ilingo.resetLocale();

        expect(ilingo.getLocale()).toEqual('en');
    });

    it('should set/get locales record', () => {
        const language = new Ilingo();

        language.setSync({
            en: {
                group: {
                    foo: 'My name is {{name}}'
                }
            },
            de: {
                group: {
                    foo: 'Mein Name ist {{name}}'
                }
            }
        });

        // {{group.foo}}

        expect(language.getSync('group.foo')).toEqual('My name is {{name}}');
        expect(language.getSync('group.foo', 'de')).toEqual('Mein Name ist {{name}}');

        expect(language.getSync('group.foo', {name: 'Peter'})).toEqual('My name is Peter');
        expect(language.getSync('group.foo', {name: 'Peter'}, 'de')).toEqual('Mein Name ist Peter');
    });

    it('should set groups record', () => {
        const language = new Ilingo();

        language.setSync({
            group: {
                foo: 'My name is {{name}}'
            }
        }, 'en');

        language.setSync({
            group: {
                foo: 'Mein Name ist {{name}}'
            }
        }, {locale: 'de'});

        language.setSync({
            foo: 'Mon nom est {{name}}'
        }, { locale: 'fr', group: 'group'});

        expect(language.getSync('group.foo')).toEqual('My name is {{name}}');
        expect(language.getSync('foo', {group: 'group', locale: 'de'})).toEqual('Mein Name ist {{name}}');
        expect(language.getSync('group.foo', {locale: 'fr'})).toEqual('Mon nom est {{name}}');
    })

    it('should set on the fly', async () => {
        const language = new Ilingo();

        language.setSync('foo.bar', 'value on the fly');
        let value = language.getSync('foo.bar');
        expect(value).toEqual('value on the fly');

        language.setSync('foo.baz', 'value with param {{param}} on the fly');
        value = await language.get('foo.baz', {param: 'lorem'});
        expect(value).toEqual('value with param lorem on the fly');
    });

    it('should format input string', async () => {
        const language = new Ilingo();

        let output = language.format('{{foo}}', {foo: 'bar'});
        expect(output).toEqual('bar');
    });
})
