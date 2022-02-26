/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbstractIlingo, useIlingo } from "../../../src/index.server";

describe('src/utils/singleton.ts', () => {
    it('should create instance', () => {
        let instance = useIlingo();

        expect(instance).toBeInstanceOf(AbstractIlingo);

        expect(instance).toEqual(useIlingo());
    })
})
