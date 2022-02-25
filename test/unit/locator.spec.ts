/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */


import path from "path";
import {locateFile, locateFileSync} from "../../src";
import {LocatorInfo} from "../../src/locator/type";

const basePath = path.join(__dirname, '..', 'data', 'language');

describe('src/locator.ts', () => {
    it('should locate file async', async () => {
        let languageDir = path.join(basePath, 'de');
        let locatorInfo = await locateFile(languageDir, 'form');

        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: languageDir,
            fileName: 'form',
            fileExtension: '.ts'
        } as LocatorInfo);

        languageDir = path.join(basePath, 'en');
        locatorInfo = await locateFile(languageDir, 'form');

        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: languageDir,
            fileName: 'form',
            fileExtension: '.js'
        } as LocatorInfo);
    });

    it('should not locate file async', async () => {
        let languageDir = path.join(basePath, 'ru');
        let locatorInfo = await locateFile(languageDir, 'form');

        expect(locatorInfo).toBeUndefined();
    });

    // -----------------------------------------------------

    it('should locate file sync',  () => {
        let languageDir = path.join(basePath, 'de');
        let locatorInfo = locateFileSync(languageDir, 'form');

        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: languageDir,
            fileName: 'form',
            fileExtension: '.ts'
        } as LocatorInfo);

        languageDir = path.join(basePath, 'en');
        locatorInfo = locateFileSync(languageDir, 'form');

        expect(locatorInfo).toBeDefined();
        expect(locatorInfo).toEqual({
            path: languageDir,
            fileName: 'form',
            fileExtension: '.js'
        } as LocatorInfo);
    });

    it('should not locate file sync', async () => {
        let languageDir = path.join(basePath, 'ru');
        let locatorInfo = locateFileSync(languageDir, 'form');

        expect(locatorInfo).toBeUndefined();
    });
});
