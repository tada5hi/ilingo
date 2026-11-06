/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * A formatter receives the raw `data` value, parsed options from the
 * placeholder, and the resolved locale, and returns the substituted string.
 * Register one via `Ilingo.registerFormatter(name, fn)` or the
 * `Options.formatters` constructor option; the built-ins are `number`,
 * `date`, and `list`.
 */
import type { FormatterRegistry } from './formatters';

import type { PluralNode } from '../types';

export type Formatter = (
    value: unknown,
    options: Record<string, unknown>,
    locale: string,
) => string;

export type FormatterOptions = Record<string, unknown>;

export type TemplateContext = {
    locale: string;
    formatters: FormatterRegistry;
    onUnknownFormatter?: (name: string) => void;
};

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

export type TranslationsRecordParsed = {
    key: string,
    value: string | PluralNode
};
