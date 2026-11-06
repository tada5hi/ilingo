/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export * from './env';
export * from './formatters';
export type { Formatter, FormatterOptions } from './types';
export * from './identify';
export * from './language';
export * from './translations-record';
export type { TranslationsRecordParsed } from './types';
export * from './locale';
export * from './negotiate';
export * from './template';
export type {
    TemplateContext,
    TextToken,
    VarToken,
    SlotToken,
    TemplateToken,
} from './types';
