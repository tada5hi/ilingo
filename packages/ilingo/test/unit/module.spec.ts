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
            })
        });

        expect(await ilingo.get({group: 'foo', key: 'line', locale: 'ru'})).toEqual('bar-baz');
        expect(await ilingo.get({group: 'foo', key: 'line'})).toEqual('baz-boz')

        ilingo.setLocale('en');
        expect(ilingo.getLocale()).toEqual('en');
    });

    it('should get locales', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
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

    it('should set/get locales record', async () => {
        const language = new Ilingo({
            store: new MemoryStore({
                data: {
                    en: {
                        group: {
                            foo: 'My name is {{name}}'
                        }
                    },
                    de: {
                        group: {
                            foo: 'Mein Name ist {{name}}'
                        }
                    },
                    fr: {
                        group: {
                            foo: 'Mon nom est {{name}}'
                        }
                    }
                }
            })
        });

        expect(await language.get({group: 'group', key: 'foo'})).toEqual('My name is {{name}}');
        expect(await language.get({group: 'group', key: 'foo', locale: 'de'})).toEqual('Mein Name ist {{name}}');
        expect(await language.get({group: 'group', key: 'foo', locale: 'fr'})).toEqual('Mon nom est {{name}}');

        expect(await language.get({group: 'group', key: 'foo', data: {name: 'Peter'}})).toEqual('My name is Peter');
        expect(await language.get({group: 'group', key: 'foo', locale: 'de', data: {name: 'Peter'}})).toEqual('Mein Name ist Peter');
        expect(await language.get({group: 'group', key: 'foo', locale: 'fr', data: {name: 'Peter'}})).toEqual('Mon nom est Peter');
    });

    it('should format input string', async () => {
        const language = new Ilingo();

        let output = language.format('{{foo}}', {foo: 'bar'});
        expect(output).toEqual('bar');
    });

    it('should merge stores', async () => {
        const storeA = new MemoryStore({
            data: {
                en: {
                    app: {
                        foo: 'bar'
                    }
                }
            }
        });

        const storeB = new MemoryStore({
            data: {
                en: {
                    app: {
                        bar: 'boz'
                    }
                }
            }
        });

        const instanceA = new Ilingo({store: storeA});
        const instanceB = new Ilingo({store: storeB});

        instanceA.merge(instanceB);

        expect(await instanceA.get({group: 'app', key: 'foo'})).toEqual('bar');
        expect(await instanceA.get({group: 'app', key: 'bar'})).toEqual('boz');
    })
})
