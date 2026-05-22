/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * A formatter receives the raw `data` value, parsed options from the
 * placeholder, and the resolved locale. Return value is the substituted
 * string. Internal contract — Phase 6 (#906) will expose this for user
 * registration.
 */
export type Formatter = (
    value: unknown,
    options: Record<string, unknown>,
    locale: string,
) => string;

export type FormatterOptions = Record<string, unknown>;

/**
 * Parse the options-string segment of a template modifier.
 *
 * `currency=EUR, style=currency, minimumFractionDigits=2`
 *   → `{ currency: 'EUR', style: 'currency', minimumFractionDigits: 2 }`
 *
 * Numbers and booleans are auto-coerced; everything else stays a string.
 */
export function parseFormatterOptions(input: string | undefined): FormatterOptions {
    if (!input) return {};
    const result: FormatterOptions = {};
    for (const segment of input.split(',')) {
        const eq = segment.indexOf('=');
        if (eq === -1) continue;
        const key = segment.slice(0, eq).trim();
        const rawValue = segment.slice(eq + 1).trim();
        if (!key || !rawValue) continue;
        if (rawValue === 'true') {
            result[key] = true;
        } else if (rawValue === 'false') {
            result[key] = false;
        } else if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
            result[key] = Number(rawValue);
        } else {
            result[key] = rawValue;
        }
    }
    return result;
}

/**
 * Split a modifier expression into `{ name, options }`.
 * `number(currency=EUR)` → `{ name: 'number', options: 'currency=EUR' }`.
 * `date`                  → `{ name: 'date', options: undefined }`.
 *
 * Returns `undefined` for malformed input (e.g. unbalanced parens).
 */
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function parseModifier(input: string): { name: string, options: string | undefined } | undefined {
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    const open = trimmed.indexOf('(');
    if (open === -1) {
        // Bare name. Must be a valid identifier — guards against malformed
        // input like 'number)' that has no opening paren but a stray closing one.
        return NAME_RE.test(trimmed) ? { name: trimmed, options: undefined } : undefined;
    }
    if (!trimmed.endsWith(')')) return undefined;
    const name = trimmed.slice(0, open).trim();
    if (!NAME_RE.test(name)) return undefined;
    const options = trimmed.slice(open + 1, -1).trim();
    return { name, options };
}

/**
 * Per-instance formatter registry. Caches `Intl.*Format` instances keyed by
 * `(formatter, locale, JSON-encoded options)` so repeated template renders
 * don't reallocate.
 */
export class FormatterRegistry {
    protected entries = new Map<string, Formatter>();

    protected cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.ListFormat>();

    constructor() {
        this.register('number', (value, options, locale) => {
            const numeric = typeof value === 'number' ? value : Number(value);
            if (Number.isNaN(numeric)) return String(value);
            const fmt = this.intl<Intl.NumberFormat>(
                'number', 
                locale, 
                options,
                () => new Intl.NumberFormat(locale, options as Intl.NumberFormatOptions),
            );
            return fmt.format(numeric);
        });

        this.register('date', (value, options, locale) => {
            let d: Date;
            if (value instanceof Date) {
                d = value;
            } else if (typeof value === 'number' || typeof value === 'string') {
                d = new Date(value);
            } else {
                return String(value);
            }
            if (Number.isNaN(d.getTime())) return String(value);
            const fmt = this.intl<Intl.DateTimeFormat>(
                'date', 
                locale, 
                options,
                () => new Intl.DateTimeFormat(locale, options as Intl.DateTimeFormatOptions),
            );
            return fmt.format(d);
        });

        this.register('list', (value, options, locale) => {
            if (!Array.isArray(value)) return String(value);
            const fmt = this.intl<Intl.ListFormat>(
                'list', 
                locale, 
                options,
                () => new Intl.ListFormat(locale, options as Intl.ListFormatOptions),
            );
            return fmt.format(value.map(String));
        });
    }

    register(name: string, formatter: Formatter): void {
        this.entries.set(name, formatter);
    }

    get(name: string): Formatter | undefined {
        return this.entries.get(name);
    }

    has(name: string): boolean {
        return this.entries.has(name);
    }

    protected intl<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.ListFormat>(
        kind: string,
        locale: string,
        options: FormatterOptions,
        create: () => T,
    ): T {
        const key = `${kind}|${locale}|${JSON.stringify(options)}`;
        let fmt = this.cache.get(key) as T | undefined;
        if (!fmt) {
            fmt = create();
            this.cache.set(key, fmt);
        }
        return fmt;
    }
}
