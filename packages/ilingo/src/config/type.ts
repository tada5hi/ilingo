import type { IStore } from '../store';
import type { Fallback, MissingKeyHandler } from '../types';
import type { Formatter } from '../utils/formatters';

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
    /**
     * Custom formatters to register on the instance's `FormatterRegistry` at
     * construction time. Equivalent to calling
     * `ilingo.registerFormatter(name, fn)` for each entry afterwards — kept
     * as constructor sugar so a fully-configured instance can be defined in
     * one expression.
     *
     * Built-in formatters (`number`, `date`, `list`) are registered by the
     * registry; entries here can override them by re-registering the same name.
     */
    formatters: Record<string, Formatter>,
};

export type ConfigInput = Partial<Config>;
