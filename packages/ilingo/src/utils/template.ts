/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FormatterRegistry } from './formatters';
import { parseFormatterOptions, parseModifier } from './formatters';

export type TemplateContext = {
    locale: string;
    formatters: FormatterRegistry;
    onUnknownFormatter?: (name: string) => void;
};

const DEFAULT_REGEX = /\{\{\s*([^,}]+?)(?:\s*,\s*([^}]+?))?\s*\}\}/g;

/**
 * Tokens emitted by `tokenize()` for slot-aware rendering (e.g. Vue's
 * `<ITranslateT>` component).
 *
 * - `text`: literal substring between placeholders.
 * - `var`:  `{{name}}` or `{{name, modifier(opts)}}`. The orchestrator
 *           replaces these with `data[name]` (optionally piped through
 *           a formatter); slot renderers do the same.
 * - `slot`: `{slot-name}` (single curly braces). Slot renderers fill
 *           these from a named scoped slot; plain `template()` leaves
 *           them as literal text (no slot-aware substitution).
 */
export type TextToken = { kind: 'text', value: string };
export type VarToken = {
    kind: 'var',
    name: string,
    modifierExpression?: string,
};
export type SlotToken = { kind: 'slot', name: string };
export type TemplateToken = TextToken | VarToken | SlotToken;

// `{{...}}` for vars (with optional modifier) OR `{ident}` for slots.
// Slot identifier is restricted to a JS-ish identifier so an inline JSON
// snippet or hand-written `{` in prose doesn't get hijacked.
const TOKEN_REGEX =    /\{\{\s*([^,}]+?)(?:\s*,\s*([^}]+?))?\s*\}\}|\{\s*([A-Za-z_][A-Za-z0-9_-]*)\s*\}/g;

/**
 * Parse `str` into an interleaved sequence of text / var / slot tokens.
 *
 * Designed for renderers that produce VNodes (or other non-string
 * structures): the plain `template()` function still returns a string
 * for the common case.
 */
export function tokenize(str: string): TemplateToken[] {
    const tokens: TemplateToken[] = [];
    let lastIndex = 0;
    // `replace()` exposes match index via the named-callback signature.
    // `matchAll` is cleaner here.
    for (const match of str.matchAll(TOKEN_REGEX)) {
        const start = match.index ?? 0;
        if (start > lastIndex) {
            tokens.push({ kind: 'text', value: str.slice(lastIndex, start) });
        }

        const [, varName, modifierExpression, slotName] = match;
        if (typeof slotName === 'string') {
            tokens.push({ kind: 'slot', name: slotName });
        } else if (typeof varName === 'string') {
            const token: TemplateToken = { kind: 'var', name: varName.trim() };
            if (typeof modifierExpression === 'string') {
                token.modifierExpression = modifierExpression.trim();
            }
            tokens.push(token);
        }

        lastIndex = start + match[0].length;
    }
    if (lastIndex < str.length) {
        tokens.push({ kind: 'text', value: str.slice(lastIndex) });
    }
    return tokens;
}

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
