/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useIlingo } from './singleton';
import type { DotKey, GroupContext, LocaleContext } from './type';

export async function lang(keyWithGroup: DotKey, locale?: string) : Promise<string | undefined>;

export async function lang(keyWithGroup: DotKey, context?: LocaleContext) : Promise<string | undefined>;

export async function lang(keyWithGroup: DotKey, data?: Record<string, any>) : Promise<string | undefined>;

export async function lang(keyWithGroup: DotKey, data?: Record<string, any>, locale?: string) : Promise<string | undefined>;

export async function lang(key: string, context: GroupContext & Partial<LocaleContext>) : Promise<string | undefined>;

export async function lang(key: string, data: Record<string, any>, context: GroupContext & Partial<LocaleContext>) : Promise<string | undefined>;
export async function lang(...input: any[]): Promise<string | undefined> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return useIlingo().get(...input);
}
