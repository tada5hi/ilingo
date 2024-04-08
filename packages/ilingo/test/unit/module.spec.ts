/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {Ilingo, MemoryStore} from "../../src";

describe('src/module.ts', () => {
    it('should get/set directory + locale + groups', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
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
            })
        });

        expect(await ilingo.get('foo.line', undefined, 'ru')).toEqual('bar-baz');
        expect(await ilingo.get('foo.line', 'ru')).toEqual('bar-baz');
        expect(await ilingo.get('foo.line')).toEqual('baz-boz')

        ilingo.setLocale('en');
        expect(ilingo.getLocale()).toEqual('en');
    });

    it('should get locales', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
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
            })
        });

        expect(await ilingo.getLocales()).toEqual(['ru', 'en']);
    })

    it('should set/unset locale', () => {
        const ilingo = new Ilingo();

        expect(ilingo.getLocale()).toEqual('en');

        ilingo.setLocale('ru');
        expect(ilingo.getLocale()).toEqual('ru');

        ilingo.resetLocale();
        expect(ilingo.getLocale()).toEqual('en');
    });

    it('should set/get store', () => {
        const store = new MemoryStore();
        const ilingo = new Ilingo();

        ilingo.setStore(store);

        expect(ilingo.getStore()).toEqual(store);
    })

    it('should set/get locales record', async () => {
        const language = new Ilingo();

        await language.set({
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

        expect(await language.get('group.foo')).toEqual('My name is {{name}}');
        expect(await language.get('group.foo', 'de')).toEqual('Mein Name ist {{name}}');

        expect(await language.get('group.foo', {name: 'Peter'})).toEqual('My name is Peter');
        expect(await language.get('group.foo', {name: 'Peter'}, 'de')).toEqual('Mein Name ist Peter');
    });

    it('should set groups record', async () => {
        const language = new Ilingo();

        await language.set({
            group: {
                foo: 'My name is {{name}}'
            }
        }, 'en');

        await language.set({
            group: {
                foo: 'Mein Name ist {{name}}'
            }
        }, {locale: 'de'});

        await language.set({
            foo: 'Mon nom est {{name}}'
        }, { locale: 'fr', group: 'group'});

        expect(await language.get('group.foo')).toEqual('My name is {{name}}');
        expect(await language.get('foo', {group: 'group', locale: 'de'})).toEqual('Mein Name ist {{name}}');
        expect(await language.get('group.foo', {locale: 'fr'})).toEqual('Mon nom est {{name}}');
    })

    it('should set on the fly', async () => {
        const language = new Ilingo();

        await language.set('foo.bar', 'value on the fly');
        let value = await language.get('foo.bar');
        expect(value).toEqual('value on the fly');

        await language.set('foo.baz', 'value with param {{param}} on the fly');
        value = await language.get('foo.baz', {param: 'lorem'});
        expect(value).toEqual('value with param lorem on the fly');
    });

    it('should format input string', async () => {
        const language = new Ilingo();

        let output = language.format('{{foo}}', {foo: 'bar'});
        expect(output).toEqual('bar');
    });
})
