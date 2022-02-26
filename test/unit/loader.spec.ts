/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */


import path from "path";
import {locateFile, locateFileSync} from "../../src/locator";
import {load, loadSync} from "../../src/loader";
import {isLineRecord} from "../../src/utils";

const basePath = path.join(__dirname, '..', 'data', 'language');

describe('src/loader/**', () => {
    it('should load .js file', async () => {
        let locatorInfo = await locateFile( 'form', {paths: basePath});
        let loaderContent = await load(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(isLineRecord(loaderContent)).toBeTruthy();

        locatorInfo = locateFileSync( 'form', {paths: basePath});
        loaderContent = loadSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(isLineRecord(loaderContent)).toBeTruthy();
    });

    it('should load .ts file', async () => {
        let locatorInfo = await locateFile( 'form', {paths: basePath, locale: 'de'});
        let loaderContent = await load(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(isLineRecord(loaderContent)).toBeTruthy();

        locatorInfo = locateFileSync( 'form', {paths: basePath, locale: 'de'});
        loaderContent = loadSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(isLineRecord(loaderContent)).toBeTruthy();
    });

    it('should load .json file',  async () => {
        let locatorInfo = await locateFile( 'form', {paths: basePath, locale: 'fr'});
        let loaderContent = await load(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(isLineRecord(loaderContent)).toBeTruthy();

        locatorInfo = locateFileSync( 'form', {paths: basePath, locale: 'fr'});
        loaderContent = loadSync(locatorInfo);
        expect(loaderContent).toBeDefined();
        expect(isLineRecord(loaderContent)).toBeTruthy();
    });

    it('should not load file', async () => {
        let locatorInfo = await locateFile( 'form', {paths: basePath, locale: 'ru'});
        let loaderContent = await load(locatorInfo);
        expect(loaderContent).toBeUndefined();

        locatorInfo = locateFileSync( 'form', {paths: basePath, locale: 'ru'});
        loaderContent = loadSync(locatorInfo);
        expect(loaderContent).toBeUndefined();
    });
});
