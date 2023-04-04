/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildConfig } from "../../../src";

describe('src/config', function () {
    it('should build config', () => {
        let config = buildConfig();
        expect(config).toBeDefined();
        expect(config.locale).toEqual('en');
        expect(config.data).toEqual({});
        expect(config.directory).toEqual([]);

        config = buildConfig({
            directory: 'test/data'
        });
        expect(config).toBeDefined();
        expect(config.directory).toEqual(['test/data']);
    });
});
