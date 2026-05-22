/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FormatterRegistry } from './formatters';
import { parseFormatterOptions, parseModifier } from './formatters';

export interface TemplateContext {
    locale: string;
    formatters: FormatterRegistry;
    onUnknownFormatter?: (name: string) => void;
}

const DEFAULT_REGEX = /\{\{\s*([^,}]+?)(?:\s*,\s*([^}]+?))?\s*\}\}/g;

/**
 * Substitute `{{var}}` placeholders. With a `TemplateContext`, also supports
 * modifier syntax: `{{var, modifier}}` and `{{var, modifier(opts)}}`.
 *
 * - Unknown data key → placeholder left in place (unchanged from prior behaviour).
 * - Unknown modifier → raw value substituted, `onUnknownFormatter` invoked.
 * - Malformed modifier expression (e.g. unbalanced parens) → raw value substituted.
 *
 * The third parameter accepts either a `TemplateContext` (modern, with
 * formatter support) or a `RegExp` (legacy escape-hatch for custom
 * placeholder delimiters). Passing a `RegExp` disables modifier dispatch,
 * matching the pre-formatter behaviour for callers that supplied their own
 * delimiter.
 */
export function template(
    str: string,
    data: Record<string, any>,
    ctxOrRegex?: TemplateContext | RegExp,
): string {
    let regex: RegExp;
    let ctx: TemplateContext | undefined;
    if (ctxOrRegex instanceof RegExp) {
        regex = ctxOrRegex;
        ctx = undefined;
    } else {
        regex = DEFAULT_REGEX;
        ctx = ctxOrRegex;
    }

    return str.replace(regex, (match, rawKey: string, modExpr: string | undefined) => {
        const key = rawKey.trim();
        if (typeof data[key] === 'undefined') return match;

        const value = data[key];

        if (!modExpr || !ctx) {
            return String(value);
        }

        const modifier = parseModifier(modExpr);
        if (!modifier) return String(value);

        const formatter = ctx.formatters.get(modifier.name);
        if (!formatter) {
            ctx.onUnknownFormatter?.(modifier.name);
            return String(value);
        }

        const options = parseFormatterOptions(modifier.options);
        return formatter(value, options, ctx.locale);
    });
}
