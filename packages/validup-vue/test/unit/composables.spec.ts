/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Store } from '@ilingo/validup/store/memory';
import { install as installIlingoVue, provideLocale } from '@ilingo/vue';
import { Ilingo } from 'ilingo';
import { Container, IssueCode, defineIssueGroup, defineIssueItem } from 'validup';
import type { IssueGroup, IssueItem, Validator } from 'validup';
import type { Composable } from '@validup/vue';
import { useValidup } from '@validup/vue';
import { mount } from '@vue/test-utils';
import { computed, defineComponent, nextTick, reactive, ref } from 'vue';
import type { Ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import {
    install,
    useFieldValidation,
    useTranslationsForComposable,
    useTranslationsForField,
    useTranslationsForGroupErrors,
    useTranslationsForIssues,
} from '../../src';

/**
 * Minimal fake `Composable` exposing only the reactive error channels
 * the bridge reads. Producing real `$groupErrors` would mean driving
 * validup's full `oneOf` runtime; a fake that satisfies the read
 * contract keeps these tests scoped to the translation wiring (the
 * bridge), not validup itself.
 */
function fakeComposable(parts: {
    errors?: IssueItem[];
    crossCutting?: IssueItem[];
    groups?: Ref<IssueGroup[]> | IssueGroup[];
}): Composable {
    return {
        $errors: computed(() => parts.errors ?? []),
        $crossCuttingErrors: computed(() => parts.crossCutting ?? []),
        $groupErrors: computed(() => (Array.isArray(parts.groups) ? parts.groups : parts.groups?.value) ?? []),
    } as unknown as Composable;
}

/**
 * Bundle the two-step install (`@ilingo/vue` then `@ilingo/validup-vue`)
 * into a single Vue plugin so test mounts express the wiring contract
 * — vue-first, then validup-vue — without each test repeating it.
 */
function ilingoTestPlugin(ilingo: Ilingo) {
    return {
        install(app: import('vue').App) {
            installIlingoVue(app, ilingo);
            install(app);
        },
    };
}

const isString: Validator = (ctx) => {
    if (typeof ctx.value !== 'string') {
        throw new Error('Value is not a string');
    }
    return ctx.value;
};

async function flush(): Promise<void> {
    await nextTick();
    await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
    await nextTick();
}

describe('install', () => {
    it('adds the default Store exactly once when called twice on the same app', () => {
        const ilingo = new Ilingo();
        const app = mount(defineComponent({ template: '<div />' }), {
            global: {
                plugins: [
                    { install: (a) => installIlingoVue(a, ilingo) },
                    // Second call should be a no-op for the Store add.
                    { install: (a) => install(a) },
                    { install: (a) => install(a) },
                ],
            },
        });

        const stores = Array.from(ilingo.stores.values()).filter((s) => s instanceof Store);
        expect(stores).toHaveLength(1);
        app.unmount();
    });

    it('throws a pointed error when @ilingo/vue is not installed first', () => {
        const wrapper = () => mount(defineComponent({ template: '<div />' }), {
            global: {
                plugins: [{ install: (a) => install(a) }],
            },
        });

        expect(wrapper).toThrowError(/install @ilingo\/vue first/i);
    });
});

describe('useTranslationsForIssues', () => {
    it('returns a reactive list of translations and re-runs when issues change', async () => {
        const issuesRef = ref([
            defineIssueItem({
                path: ['email'],
                message: 'The value is invalid',
                code: IssueCode.VALUE_INVALID,
            }),
        ]);

        const ilingo = new Ilingo({ locale: 'de' });
        const wrapper = mount(defineComponent({
            setup: () => ({ translations: useTranslationsForIssues(issuesRef) }),
            template: '<div>{{ translations.map((t) => t.message).join(",") }}</div>',
        }), {
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        expect(wrapper.text()).toBe('Der Wert ist ungültig');

        // Mutate the source; the composable must re-translate.
        issuesRef.value = [
            defineIssueItem({
                path: ['email'],
                message: 'Email already taken',
                code: 'email_taken',
            }),
        ];
        await flush();
        // Custom code with no catalog entry falls back to the issue's own
        // message — the consumer's UI still renders.
        expect(wrapper.text()).toBe('Email already taken');
    });
});

describe('useTranslationsForField + useTranslationsForComposable', () => {
    it('translates a field\'s $errors after the field becomes dirty', async () => {
        const container = new Container<{ email: string }>();
        container.mount('email', isString);

        const formState = reactive({ email: 42 as unknown as string });

        const ilingo = new Ilingo({ locale: 'en' });
        const wrapper = mount(defineComponent({
            setup() {
                const $v = useValidup(container, formState);
                const fieldTranslations = useTranslationsForField($v.fields.email);
                const formTranslations = useTranslationsForComposable($v);
                $v.fields.email.$touch();
                return { fieldTranslations, formTranslations };
            },
            template: '<div><span class="field">{{ fieldTranslations.map((t) => t.message).join(",") }}</span><span class="form">{{ formTranslations.map((t) => t.message).join(",") }}</span></div>',
        }), {
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        // The validator threw a plain Error — recordMountError synthesizes an
        // IssueItem with the default VALUE_INVALID code and the validator's
        // message as the fallback. Translation picks the catalog entry.
        expect(wrapper.find('.field').text()).toBe('The value is invalid');
        expect(wrapper.find('.form').text()).toBe('The value is invalid');
    });
});

describe('useTranslationsForGroupErrors', () => {
    it('translates each group by its own code and re-runs on locale flip', async () => {
        const groups = ref<IssueGroup[]>([
            defineIssueGroup({
                code: IssueCode.ONE_OF_FAILED,
                message: 'None of the branches succeeded',
                path: [],
                issues: [
                    // A child leaf that must NOT be flattened into the output.
                    defineIssueItem({
                        path: ['email'],
                        message: 'The value is invalid',
                        code: IssueCode.VALUE_INVALID,
                    }),
                ],
            }),
        ]);
        const $v = fakeComposable({ groups });

        // Provide our own locale Ref so the test can flip it — the
        // composables track the injected locale Ref, not ilingo.setLocale().
        const localeRef = ref('en');
        const ilingo = new Ilingo({ locale: 'en' });
        const wrapper = mount(defineComponent({
            setup: () => ({ groupTranslations: useTranslationsForGroupErrors($v) }),
            template: '<div><span class="count">{{ groupTranslations.length }}</span><span class="msg">{{ groupTranslations.map((t) => t.message).join(",") }}</span></div>',
        }), {
            global: {
                plugins: [{
                    install(app: import('vue').App) {
                        provideLocale(localeRef, app);
                        installIlingoVue(app, ilingo);
                        install(app);
                    },
                }],
            },
        });

        await flush();
        // One entry for the group — the child VALUE_INVALID leaf is not pulled in.
        expect(wrapper.find('.count').text()).toBe('1');
        expect(wrapper.find('.msg').text()).toBe('None of the alternatives was successful');

        localeRef.value = 'de';
        await flush();
        expect(wrapper.find('.msg').text()).toBe('Keine der Alternativen war erfolgreich');
    });
});

describe('useFieldValidation', () => {
    it('bundles severity + reshaped messages + the raw issues escape hatch', async () => {
        const container = new Container<{ email: string }>();
        container.mount('email', isString);

        const formState = reactive({ email: 42 as unknown as string });

        const ilingo = new Ilingo({ locale: 'en' });
        const wrapper = mount(defineComponent({
            setup() {
                const $v = useValidup(container, formState);
                const feedback = useFieldValidation($v.fields.email);
                $v.fields.email.$touch();
                return { feedback };
            },
            template: '<div>'
                + '<span class="severity">{{ feedback.severity }}</span>'
                + '<span class="keys">{{ feedback.messages.map((m) => m.key).join(",") }}</span>'
                + '<span class="values">{{ feedback.messages.map((m) => m.value).join(",") }}</span>'
                + '<span class="issues">{{ feedback.issues.length }}</span>'
                + '</div>',
        }), {
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        // A required field with a hard failure → 'error'.
        expect(wrapper.find('.severity').text()).toBe('error');
        // Messages reshaped to { key: issue.code, value: message }.
        expect(wrapper.find('.keys').text()).toBe(IssueCode.VALUE_INVALID);
        expect(wrapper.find('.values').text()).toBe('The value is invalid');
        // Escape hatch carries the raw translation list.
        expect(wrapper.find('.issues').text()).toBe('1');
    });

    it('reports undefined severity while the field is pristine', async () => {
        const container = new Container<{ email: string }>();
        container.mount('email', isString);
        const formState = reactive({ email: 'ok' });

        const ilingo = new Ilingo({ locale: 'en' });
        const wrapper = mount(defineComponent({
            setup() {
                const $v = useValidup(container, formState, { lazy: true });
                const feedback = useFieldValidation($v.fields.email);
                return { severity: feedback.severity };
            },
            template: '<div class="severity">{{ severity === undefined ? "none" : severity }}</div>',
        }), {
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        expect(wrapper.find('.severity').text()).toBe('none');
    });

    // Called from setup() the composable's watcher lives in the component
    // scope, so unmount disposes it. We observe liveness through `ilingo.get`
    // (which `translateIssues` calls): a locale flip re-translates only while
    // a live watcher is subscribed; after unmount it must go quiet. (The
    // template-only ergonomic is the renderless <IFieldValidation>, which owns
    // the same lifecycle — see component spec — rather than an inline call,
    // which would leak a watcher per render, #965.)
    it('disposes the field watcher on unmount when used in setup()', async () => {
        const container = new Container<{ email: string }>();
        container.mount('email', isString);
        const formState = reactive({ email: 42 as unknown as string });

        const localeRef = ref('en');
        const ilingo = new Ilingo({ locale: 'en' });

        const wrapper = mount(defineComponent({
            setup() {
                const $v = useValidup(container, formState);
                const feedback = useFieldValidation($v.fields.email);
                $v.fields.email.$touch();
                return { feedback };
            },
            template: '<div>{{ feedback.messages.map((m) => m.value).join(",") }}</div>',
        }), {
            global: {
                plugins: [{
                    install(app: import('vue').App) {
                        provideLocale(localeRef, app);
                        installIlingoVue(app, ilingo);
                        install(app);
                    },
                }],
            },
        });

        await flush();

        const getSpy = vi.spyOn(ilingo, 'get');

        // While mounted, a locale flip drives a re-translation → the watcher
        // is alive and calls through to the instance.
        localeRef.value = 'de';
        await flush();
        expect(getSpy.mock.calls.length).toBeGreaterThan(0);

        // After unmount, the component scope is stopped: a further locale flip
        // must trigger no work at all.
        getSpy.mockClear();
        wrapper.unmount();
        localeRef.value = 'fr';
        await flush();
        expect(getSpy).not.toHaveBeenCalled();

        getSpy.mockRestore();
    });
});
