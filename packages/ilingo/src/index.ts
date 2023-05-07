/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useIlingo } from './singleton';

const ilingo = useIlingo();

export * from './config';
export * from './helper';
export * from './module';
export * from './singleton';
export * from './store';
export * from './utils';
export * from './type';

export default ilingo;
