/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {useIlingo, Ilingo, unsetIlingo,} from "../../../src";

describe('src/utils/singleton.ts', () => {
    it('should create instance', () => {
        let instance = useIlingo();

        expect(instance).toBeInstanceOf(Ilingo);

        expect(instance).toEqual(useIlingo());
    });

    it('should overwrite instance', () => {
        const instance =  useIlingo();
        instance.setLocale('de');
        expect(instance.getLocale()).toEqual('de')

        unsetIlingo();

        const instanceTwo = useIlingo();
        expect(instanceTwo.getLocale()).toEqual('en');
    })
})
