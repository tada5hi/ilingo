import type { IStore } from '../store';
import type { Fallback, MissingKeyHandler } from '../types';
import type { Formatter } from '../utils/formatters';

/**
 * Configuration accepted by the `Ilingo` constructor and `Ilingo.clone()`.
 *
 * Every field is optional: the constructor applies a runtime default for
 * each absent entry, so `new Ilingo()` (no argument) yields a usable
 * instance. Consumers that prefer the "input vs resolved" naming should
 * use [[ConfigInput]] (a back-compat alias of this type).
 *
 * Adding a new field is non-breaking only when it is optional **and** has
 * a default that preserves existing behaviour — keep this contract before
 * touching this file.
 */
export type Config = {
    /**
     * Initial store added to the instance's `stores` set. Additional stores
     * can be added later via `Ilingo.merge()`. When omitted, the instance
     * resolves every key through `onMissingKey` (or the default warn-once).
     */
    store?: IStore,

    /**
     * Active locale used when `get()` is called without an explicit `locale`.
     * Defaults to `LOCALE_DEFAULT` (`'en'`).
     */
    locale?: string,

    /**
     * Fallback locale chain for `Ilingo.get()`.
     *
     * - `string`        → tried after the requested locale, before the default.
     * - `string[]`      → same as above with multiple entries, applied in order.
     * - `(locale) => string[]` → computed per call.
     * - `false` / `[]`  → opt out of fallback entirely.
     * - `undefined`     → derived from BCP-47 parents of the requested locale.
     */
    fallback?: Fallback,

    /**
     * Called when no store yields a value for the key after the fallback
     * chain is exhausted. Returning a string makes that string the result
     * of `get()`; returning `undefined` (or nothing) keeps `get()`'s
     * result `undefined`. When omitted, the runtime warns once per
     * `(locale, group, key)` triple in non-production environments.
     */
    onMissingKey?: MissingKeyHandler,

    /**
     * Custom formatters to register on the instance's `FormatterRegistry`
     * at construction time. Equivalent to calling
     * `ilingo.registerFormatter(name, fn)` for each entry afterwards —
     * kept as constructor sugar so a fully-configured instance can be
     * defined in one expression.
     *
     * Built-in formatters (`number`, `date`, `list`) are registered by
     * the registry; entries here can override them by re-registering
     * the same name.
     */
    formatters?: Record<string, Formatter>,
};

/**
 * Back-compat alias of [[Config]]. Historically `ConfigInput` was the
 * `Partial<Config>` "what you pass" shape paired with a fully-required
 * resolved `Config`; the two have now converged because every `Config`
 * field is optional at the type level.
 *
 * Kept as a named export so existing imports — and the sibling pattern in
 * `@ilingo/fs`, where the split *is* still meaningful — continue to work.
 */
export type ConfigInput = Config;
