/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { setIlingo, useIlingo } from "../../../src/server";
import { Ilingo} from "../../../src/server";
import { AbstractIlingo,  } from "../../../src";

describe('src/utils/singleton.ts', () => {
    it('should create instance', () => {
        let instance = useIlingo();

        expect(instance).toBeInstanceOf(AbstractIlingo);

        expect(instance).toEqual(useIlingo());
    });

    it('should overwrite instance', () => {
        const instance =  useIlingo();
        instance.setDirectory('foo');
        expect(instance.getDirectory()).toEqual(['foo'])

        setIlingo(new Ilingo({directory: []}));

        const instanceTwo = useIlingo();
        expect(instanceTwo.getDirectory()).toEqual([])
    })
})
