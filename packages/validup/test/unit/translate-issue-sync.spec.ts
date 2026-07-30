/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo, LoaderStore } from 'ilingo';
import type { Issue } from 'validup';
import { IssueCode, defineIssueGroup, defineIssueItem } from 'validup';
import { describe, expect, it } from 'vitest';
import {
    translateIssue,
    translateIssueGroupsSync,
    translateIssueSync,
    translateIssuesSync,
} from '../../src';
import { Store } from '../../src/store/memory';

function setupIlingo(locale = 'en'): Ilingo {
    const ilingo = new Ilingo({ locale });
    ilingo.registerStore(new Store());
    return ilingo;
}

const invalid = defineIssueItem({
    path: ['email'],
    message: 'The value is invalid',
    code: IssueCode.VALUE_INVALID,
});

describe('translateIssueSync (#988)', () => {
    it('resolves a built-in code synchronously', () => {
        expect(translateIssueSync(invalid, setupIlingo('en'))).toBe('The value is invalid');
        expect(translateIssueSync(invalid, setupIlingo('de'))).toBe('Der Wert ist ungültig');
    });

    it('agrees with the async helper', async () => {
        const ilingo = setupIlingo('de');
        expect(translateIssueSync(invalid, ilingo)).toBe(await translateIssue(invalid, ilingo));
    });

    it('falls back to issue.message for an untranslated code, exactly like the async path', async () => {
        const ilingo = setupIlingo('en');
        const issue = defineIssueItem({
            path: ['email'],
            message: 'Email already taken',
            code: 'email_taken',
        });

        // Possible only because a missing key is `undefined` while a store that
        // needs I/O throws — the two no longer share one channel.
        expect(translateIssueSync(issue, ilingo)).toBe('Email already taken');
        expect(translateIssueSync(issue, ilingo)).toBe(await translateIssue(issue, ilingo));
    });

    it('answers a codeless issue from its message', () => {
        // `defineIssueItem` always defaults a code, so build the raw shape —
        // an adapter can hand over an issue with no code at all.
        const issue = { path: ['email'], message: 'Plain message' } as unknown as Issue;

        expect(translateIssueSync(issue, setupIlingo())).toBe('Plain message');
    });

    it('returns undefined when a store needs I/O', () => {
        const ilingo = new Ilingo();
        ilingo.registerStore(new LoaderStore({ loader: () => undefined }));

        // Declines rather than falling back: the async pass is about to resolve
        // a real translation, and a fallback now would flip a tick later.
        expect(translateIssueSync(invalid, ilingo)).toBeUndefined();
    });

    it('propagates an unexpected store fault instead of masking it as unavailable', () => {
        const ilingo = setupIlingo('en');
        ilingo.getSync = () => { throw new TypeError('broken store'); };

        expect(() => translateIssueSync(invalid, ilingo)).toThrow(TypeError);
    });

    it('does not mask a store fault as unavailable', () => {
        // `getSync` is a required member now, so a missing/broken one is a
        // genuine fault — surfaced, not translated into "ask me later".
        const ilingo = setupIlingo('en');
        ilingo.getSync = undefined as unknown as typeof ilingo.getSync;

        expect(() => translateIssueSync(invalid, ilingo)).toThrow(TypeError);
    });
});

describe('translateIssuesSync (#988)', () => {
    it('translates a flattened batch', () => {
        const out = translateIssuesSync([
            invalid,
            defineIssueItem({ path: ['name'], message: 'is required', code: IssueCode.REQUIRED }),
        ], setupIlingo('en'));

        expect(out?.map((entry) => entry.message)).toEqual([
            'The value is invalid',
            'The value is required',
        ]);
    });

    it('keeps an untranslated code in the batch, using its own message', () => {
        const out = translateIssuesSync([
            invalid,
            defineIssueItem({ path: ['email'], message: 'Email already taken', code: 'email_taken' }),
        ], setupIlingo('en'));

        expect(out?.map((entry) => entry.message)).toEqual([
            'The value is invalid',
            'Email already taken',
        ]);
    });

    it('is all-or-nothing — a store that needs I/O drops the whole batch', () => {
        const ilingo = new Ilingo({ locale: 'en' });
        ilingo.registerStore(new LoaderStore({ loader: () => undefined }));

        const out = translateIssuesSync([invalid], ilingo);

        expect(out).toBeUndefined();
    });

    it('returns an empty batch for an empty input', () => {
        expect(translateIssuesSync([], setupIlingo())).toEqual([]);
    });
});

describe('translateIssueGroupsSync (#988)', () => {
    const group = defineIssueGroup({
        path: [],
        message: 'None of the alternatives matched',
        code: IssueCode.ONE_OF_FAILED,
        children: [invalid],
    });

    it('translates groups by their own code, without descending', () => {
        const out = translateIssueGroupsSync([group], setupIlingo('en'));

        expect(out).toHaveLength(1);
        expect(out?.[0]?.issue).toBe(group);
        expect(typeof out?.[0]?.message).toBe('string');
    });

    it('falls back to a group\'s own message when its code is untranslated', () => {
        const untranslated = defineIssueGroup({
            path: [],
            message: 'custom group failure',
            code: 'custom_group',
            children: [],
        });

        const out = translateIssueGroupsSync([group, untranslated], setupIlingo('en'));

        expect(out?.[1]?.message).toBe('custom group failure');
    });

    it('is all-or-nothing when a store needs I/O', () => {
        const ilingo = new Ilingo({ locale: 'en' });
        ilingo.registerStore(new LoaderStore({ loader: () => undefined }));

        expect(translateIssueGroupsSync([group], ilingo)).toBeUndefined();
    });
});
