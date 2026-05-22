/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocalesRecord } from './types';

/**
 * Helper that returns its argument unchanged but captures it with `const`
 * type inference, so the catalog literal keeps its narrowest shape
 * (per-key string literals, structural plural leaves, etc.) without the
 * caller having to add `as const` everywhere.
 *
 * @example
 *     const catalog = defineCatalog({
 *         en: { app: { greeting: 'Hi {{name}}' } },
 *         de: { app: { greeting: 'Hallo {{name}}' } },
 *     });
 *     const ilingo = new Ilingo<typeof catalog>({
 *         store: new MemoryStore({ data: catalog }),
 *     });
 *     ilingo.get({ group: 'app', key: 'greeting' });  // OK
 *     ilingo.get({ group: 'app', key: 'unknown' });   // type error
 */
export function defineCatalog<const T extends LocalesRecord>(catalog: T): T {
    return catalog;
}
