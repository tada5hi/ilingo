/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from 'ilingo';
import { Container, IssueCode, defineIssueItem } from 'validup';
import type { Validator } from 'validup';
import { useValidup } from '@validup/vue';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, reactive, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import {
    Store,
    install,
    useTranslationsForComposable,
    useTranslationsForField,
    useTranslationsForIssues,
} from '../../src';

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
    it('adds the default Store exactly once', () => {
        const ilingo = new Ilingo();
        const app = { use(plugin: any) { plugin.install(this); }, config: {}, provide() {} } as any;

        // Install twice — second call should be a no-op for the Store add.
        install(app, ilingo);
        install(app, ilingo);

        const stores = Array.from(ilingo.stores).filter((s) => s instanceof Store);
        expect(stores).toHaveLength(1);
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

        const wrapper = mount(defineComponent({
            setup() {
                install(undefined as any, new Ilingo({ locale: 'de' }));
                return { translations: useTranslationsForIssues(issuesRef) };
            },
            template: '<div>{{ translations.map((t) => t.message).join(",") }}</div>',
        }), {
            global: {
                plugins: [{
                    install(app) {
                        install(app, new Ilingo({ locale: 'de' }));
                    },
                }],
            },
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
            global: {
                plugins: [{
                    install(app) {
                        install(app, new Ilingo({ locale: 'en' }));
                    },
                }],
            },
        });

        await flush();
        // The validator threw a plain Error — recordMountError synthesizes an
        // IssueItem with the default VALUE_INVALID code and the validator's
        // message as the fallback. Translation picks the catalog entry.
        expect(wrapper.find('.field').text()).toBe('The value is invalid');
        expect(wrapper.find('.form').text()).toBe('The value is invalid');
    });
});
