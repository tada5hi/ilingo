/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Store } from '@ilingo/validup';
import { install as installIlingoVue } from '@ilingo/vue';
import { Ilingo } from 'ilingo';
import { Container, IssueCode, defineIssueItem } from 'validup';
import type { Validator } from 'validup';
import { useValidup } from '@validup/vue';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, reactive, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import {
    install,
    useTranslationsForComposable,
    useTranslationsForField,
    useTranslationsForIssues,
} from '../../src';

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

        const stores = Array.from(ilingo.stores).filter((s) => s instanceof Store);
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
