import type { IStore } from '../store';
import type { Fallback, MissingKeyHandler } from '../types';

export type Config = {
    store: IStore,
    // default: en
    locale: string,
    /**
     * Fallback locale chain for `Ilingo.get()`.
     *
     * - `string`        → tried after the requested locale, before the default.
     * - `string[]`      → same as above with multiple entries, applied in order.
     * - `(locale) => string[]` → computed per call.
     * - `undefined`     → derived from BCP-47 parents of the requested locale.
     */
    fallback: Fallback,
    /**
     * Called when no store yields a value for the key after the fallback chain
     * is exhausted. Returning a string makes that string the result of `get()`;
     * returning `undefined` (or nothing) keeps `get()`'s result `undefined`.
     */
    onMissingKey: MissingKeyHandler,
};

export type ConfigInput = Partial<Config>;
