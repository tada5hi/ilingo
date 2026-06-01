/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { install as installIlingoVue } from '@ilingo/vue';
import { Ilingo, MemoryStore } from 'ilingo';
import { IssueCode, defineIssueGroup, defineIssueItem } from 'validup';
import type { IssueGroup, IssueItem } from 'validup';
import type { Composable } from '@validup/vue';
import { mount } from '@vue/test-utils';
import { computed, defineComponent, h, nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import { IValidup, IValidupT, install } from '../../src';

function ilingoTestPlugin(ilingo: Ilingo) {
    return {
        install(app: import('vue').App) {
            installIlingoVue(app, ilingo);
            install(app);
        },
    };
}

async function flush(): Promise<void> {
    await nextTick();
    await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
    await nextTick();
}

function fakeComposable(parts: {
    errors?: IssueItem[];
    crossCutting?: IssueItem[];
    groups?: IssueGroup[];
}): Composable {
    return {
        $errors: computed(() => parts.errors ?? []),
        $crossCuttingErrors: computed(() => parts.crossCutting ?? []),
        $groupErrors: computed(() => parts.groups ?? []),
    } as unknown as Composable;
}

const leafIssue = defineIssueItem({
    path: ['email'],
    message: 'The value is invalid',
    code: IssueCode.VALUE_INVALID,
});

const crossCuttingIssue = defineIssueItem({
    path: [],
    message: 'rate limited',
    code: IssueCode.VALUE_INVALID,
});

const groupIssue = defineIssueGroup({
    code: IssueCode.ONE_OF_FAILED,
    message: 'None of the branches succeeded',
    path: [],
    issues: [],
});

describe('<IValidup> leaf mode (:issues)', () => {
    it('renders one text node per translated leaf without a slot', async () => {
        const ilingo = new Ilingo({ locale: 'en' });
        const wrapper = mount(IValidup, {
            props: { issues: [leafIssue] },
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        expect(wrapper.text()).toBe('The value is invalid');
    });

    it('hands the translations to the default slot when provided', async () => {
        const ilingo = new Ilingo({ locale: 'en' });
        const wrapper = mount(IValidup, {
            props: { issues: [leafIssue] },
            slots: {
                default: ({ translations }: any) => translations.map(
                    (t: any) => h('li', { class: 'err' }, t.message),
                ),
            },
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        expect(wrapper.findAll('li.err')).toHaveLength(1);
        expect(wrapper.find('li.err').text()).toBe('The value is invalid');
    });
});

describe('<IValidup> composable mode (:composable)', () => {
    it('renders cross-cutting, groups and fields in order without slots', async () => {
        const ilingo = new Ilingo({ locale: 'en' });
        const $v = fakeComposable({
            errors: [leafIssue],
            crossCutting: [crossCuttingIssue],
            groups: [groupIssue],
        });
        const wrapper = mount(IValidup, {
            props: { composable: $v },
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        // cross-cutting first, then group, then field — all VALUE_INVALID /
        // ONE_OF_FAILED catalog strings.
        expect(wrapper.text()).toBe(
            'The value is invalid'         // cross-cutting
            + 'None of the alternatives was successful' // group
            + 'The value is invalid',      // field
        );
    });

    it('routes each stream to its named slot', async () => {
        const ilingo = new Ilingo({ locale: 'en' });
        const $v = fakeComposable({
            errors: [leafIssue],
            crossCutting: [crossCuttingIssue],
            groups: [groupIssue],
        });
        const wrapper = mount(IValidup, {
            props: { composable: $v },
            slots: {
                'cross-cutting': ({ translations }: any) => h('div', { class: 'cc' }, String(translations.length)),
                'groups': ({ translations }: any) => h('div', { class: 'gr' }, translations.map((t: any) => t.message).join('|')),
                'fields': ({ translations }: any) => h('div', { class: 'fl' }, String(translations.length)),
            },
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        expect(wrapper.find('.cc').text()).toBe('1');
        expect(wrapper.find('.gr').text()).toBe('None of the alternatives was successful');
        expect(wrapper.find('.fl').text()).toBe('1');
    });

    it('prefers :composable over :issues when both are passed', async () => {
        const ilingo = new Ilingo({ locale: 'en' });
        const ignoredLeaf = defineIssueItem({
            path: ['ignored'],
            message: 'should not render',
            code: 'ignored_code',
        });
        const $v = fakeComposable({ groups: [groupIssue] });
        const wrapper = mount(IValidup, {
            props: { composable: $v, issues: [ignoredLeaf] },
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        // The :issues leaf is ignored; only the composable's group renders.
        expect(wrapper.text()).toBe('None of the alternatives was successful');
    });
});

describe('<IValidupT>', () => {
    it('renders plain text (like <IValidup>) when no placeholder slots are given', async () => {
        const ilingo = new Ilingo({ locale: 'en' });
        const wrapper = mount(IValidupT, {
            props: { issues: [leafIssue] },
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        expect(wrapper.text()).toBe('The value is invalid');
    });

    it('honours the locale prop on the text path (no slots), same as the slot path', async () => {
        const ilingo = new Ilingo({ locale: 'en' });
        const wrapper = mount(IValidupT, {
            props: { issues: [leafIssue], locale: 'de' },
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        // The `locale="de"` prop wins over the injected 'en' locale.
        expect(wrapper.text()).toBe('Der Wert ist ungültig');
    });

    it('renders each issue through <ITranslateT>, forwarding named slots with { issue, code } scope', async () => {
        const ilingo = new Ilingo({ locale: 'en' });
        // A catalog entry carrying a {slot} placeholder (single curly).
        ilingo.registerStore(new MemoryStore({
            data: { en: { validup: { custom_link: 'Click {action} now' } } },
        }));

        const issue = defineIssueItem({
            path: ['x'],
            message: 'fallback',
            code: 'custom_link',
        });

        const wrapper = mount(IValidupT, {
            props: { issues: [issue] },
            slots: {
                action: ({ issue: i, code }: any) => h('a', { class: 'act', 'data-code': code, 'data-path': i.path.join('.') }, 'go'),
            },
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        // The {action} placeholder is filled by the slot's <a>, wrapped in
        // the message text.
        expect(wrapper.text()).toBe('Click go now');
        const link = wrapper.find('a.act');
        expect(link.exists()).toBe(true);
        // The forwarded slot received the { issue, code } scope.
        expect(link.attributes('data-code')).toBe('custom_link');
        expect(link.attributes('data-path')).toBe('x');
    });

    it('falls back to the raw issue.message for an issue without a code', async () => {
        const ilingo = new Ilingo({ locale: 'en' });
        // `defineIssueItem` defaults a missing code to VALUE_INVALID, so build
        // a genuinely code-less issue by hand to exercise the defensive branch.
        const noCode = { type: 'item', path: ['y'], message: 'no code here' } as unknown as IssueItem;

        const wrapper = mount(IValidupT, {
            props: { issues: [noCode] },
            // A slot is present, so we're on the component path; the codeless
            // issue still renders its raw message.
            slots: { action: () => h('a', 'unused') },
            global: { plugins: [ilingoTestPlugin(ilingo)] },
        });

        await flush();
        expect(wrapper.text()).toBe('no code here');
    });
});
