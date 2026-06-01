/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IIlingo } from 'ilingo';
import type { Directive, Ref } from 'vue';
import { watchEffect } from 'vue';

/** Interpolation data passed through a `v-t` binding. */
export type VTBindingDataMap = Record<string, string | number>;

export type VTBindingPath = {
    path: string,
    data?: VTBindingDataMap,
    locale?: string,
    count?: number,
};

export type VTBindingGroupKey = {
    namespace: string,
    key: string,
    data?: VTBindingDataMap,
    locale?: string,
    count?: number,
};

/**
 * Binding accepted by the `v-t` directive.
 *
 * - `string` — shorthand for `{ path }`. Parsed as `"namespace.key"`.
 * - `{ path, data?, locale?, count? }` — explicit context.
 * - `{ namespace, key, data?, locale?, count? }` — alternative explicit form.
 */
export type VTBinding = string | VTBindingPath | VTBindingGroupKey;

type Resolved = {
    namespace: string,
    key: string,
    data?: Record<string, string | number>,
    locale?: string,
    count?: number,
};

function resolveBinding(value: VTBinding): Resolved {
    if (typeof value === 'string') {
        return splitPath(value);
    }
    if ('path' in value) {
        const { namespace, key } = splitPath(value.path);
        return {
            namespace,
            key,
            data: value.data,
            locale: value.locale,
            count: value.count,
        };
    }
    return value;
}

function splitPath(path: string): { namespace: string, key: string } {
    const index = path.indexOf('.');
    // Reject missing dot, leading dot (empty namespace), and trailing dot (empty key).
    if (index <= 0 || index >= path.length - 1) {
        throw new SyntaxError(
            `[ilingo] v-t="${path}" requires a "namespace.key" path.`,
        );
    }
    return { namespace: path.slice(0, index), key: path.slice(index + 1) };
}

/**
 * Factory for the `v-t` directive. Bound to the install-time `Ilingo`
 * instance and locale ref so the directive can run outside of a component
 * setup context.
 *
 * The element's `textContent` is updated reactively when the locale
 * changes or the binding value changes — no remount required.
 *
 * Marker symbol on the element holds the watchEffect's stop handle so it
 * can be cancelled on unmount or re-bound on update.
 */
const STOP_KEY = Symbol.for('ilingo.v-t.stop');

type ElementWithStop = HTMLElement & { [STOP_KEY]?: () => void };

export function createVTDirective(
    instance: IIlingo,
    localeRef: Ref<string>,
): Directive<HTMLElement, VTBinding> {
    function apply(el: ElementWithStop, value: VTBinding) {
        el[STOP_KEY]?.();
        const ctx = resolveBinding(value);
        el[STOP_KEY] = watchEffect((onCleanup) => {
            // Track the locale Ref synchronously so the watcher's dependency
            // set is established BEFORE the async hop. Reading it later (after
            // await) wouldn't be tracked.
            const localeOverride = ctx.locale ?? localeRef.value;

            // Cancel-on-stale: if `apply()` re-runs (binding change, locale
            // change, unmount) while a prior `instance.get(...)` is still
            // in-flight, mark it cancelled so its eventual resolution can't
            // clobber a newer translation.
            let cancelled = false;
            onCleanup(() => { cancelled = true; });

            (async () => {
                try {
                    const text = await instance.get({
                        namespace: ctx.namespace,
                        key: ctx.key,
                        data: ctx.data,
                        count: ctx.count,
                        locale: localeOverride,
                    });
                    if (cancelled) return;
                    el.textContent = text ?? `${ctx.namespace}.${ctx.key}`;
                } catch {
                    // A rejected store / formatter shouldn't propagate as an
                    // unhandled promise rejection. Degrade to the same
                    // namespace.key fallback we use when get() returns undefined.
                    if (cancelled) return;
                    el.textContent = `${ctx.namespace}.${ctx.key}`;
                }
            })();
        });
    }

    return {
        mounted(el, binding) {
            apply(el as ElementWithStop, binding.value);
        },
        updated(el, binding) {
            apply(el as ElementWithStop, binding.value);
        },
        unmounted(el) {
            (el as ElementWithStop)[STOP_KEY]?.();
        },
    };
}
