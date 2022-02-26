/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */


import path from "path";
import {locateFile, locateFileSync} from "../../src/locator";
import {LocatorInfo} from "../../src/locator";

const basePath = path.join(__dirname, '..', 'data', 'language');

describe('src/locator.ts', () => {
    it('should not locate .js file', async () => {
        const languageDir = path.join(basePath, 'en');

        let locatorInfo = await locateFile( 'form', {paths: basePath});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: languageDir,
            fileName: 'form',
            fileExtension: '.js'
        } as LocatorInfo);

        locatorInfo = locateFileSync( 'form', {paths: basePath});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: languageDir,
            fileName: 'form',
            fileExtension: '.js'
        } as LocatorInfo);
    });

    it('should locate .ts file', async () => {
        const languageDir = path.join(basePath, 'de');

        let locatorInfo = await locateFile( 'form', {paths: basePath, locale: 'de'});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: languageDir,
            fileName: 'form',
            fileExtension: '.ts'
        } as LocatorInfo);

        locatorInfo = locateFileSync( 'form', {paths: basePath, locale: 'de'});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: languageDir,
            fileName: 'form',
            fileExtension: '.ts'
        } as LocatorInfo);
    });

    it('should locate .json file', async () => {
        const languageDir = path.join(basePath, 'fr');

        let locatorInfo = await locateFile( 'form', {paths: basePath, locale: 'fr'});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: languageDir,
            fileName: 'form',
            fileExtension: '.json'
        } as LocatorInfo);

        locatorInfo = locateFileSync('form', {paths: basePath, locale: 'fr'});
        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: languageDir,
            fileName: 'form',
            fileExtension: '.json'
        } as LocatorInfo);
    });

    it('should not locate file async', async () => {
        let locatorInfo = await locateFile( 'form', {paths: basePath, locale: 'ru'});
        expect(locatorInfo).toBeUndefined();

        locatorInfo = locateFileSync( 'form', {paths: basePath, locale: 'ru'});
        expect(locatorInfo).toBeUndefined();
    });
});
