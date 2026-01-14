/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, it, expect } from "vitest";
import {template} from "../../../src";

describe('src/utils/template', () => {
    it('should replace str in template', () => {
        let str = template('Hi {{name}}!', {name: 'Peter'});
        expect(str).toEqual('Hi Peter!');

        str = template('Hi {{name}}!', {});
        expect(str).toEqual('Hi {{name}}!');
    })
})
