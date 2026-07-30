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

    it('returns undefined for an untranslated code instead of guessing', async () => {
        const ilingo = setupIlingo('en');
        const issue = defineIssueItem({
            path: ['email'],
            message: 'Email already taken',
            code: 'email_taken',
        });

        // The async path falls back to issue.message — but a sync `undefined`
        // cannot be told apart from "a store needs I/O", so no fallback is
        // invented here.
        expect(translateIssueSync(issue, ilingo)).toBeUndefined();
        expect(await translateIssue(issue, ilingo)).toBe('Email already taken');
    });

    it('answers a codeless issue from its message', () => {
        // `defineIssueItem` always defaults a code, so build the raw shape —
        // an adapter can hand over an issue with no code at all.
        const issue = { path: ['email'], message: 'Plain message' } as unknown as Issue;

        expect(translateIssueSync(issue, setupIlingo())).toBe('Plain message');
    });

    it('returns undefined when the instance cannot read synchronously', () => {
        const ilingo = new Ilingo();
        ilingo.registerStore(new LoaderStore({ loader: () => undefined }));

        expect(translateIssueSync(invalid, ilingo)).toBeUndefined();
    });

    it('returns undefined when the instance has no getSync at all', () => {
        // An IIlingo implementation from an older core / a partial test double.
        const ilingo = setupIlingo('en');
        const partial = { ...ilingo, getSync: undefined } as unknown as Ilingo;

        expect(translateIssueSync(invalid, partial)).toBeUndefined();
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

    it('is all-or-nothing — one unresolvable issue drops the whole batch', () => {
        const out = translateIssuesSync([
            invalid,
            defineIssueItem({ path: ['email'], message: 'Email already taken', code: 'email_taken' }),
        ], setupIlingo('en'));

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

    it('is all-or-nothing', () => {
        const untranslated = defineIssueGroup({
            path: [],
            message: 'custom group failure',
            code: 'custom_group',
            children: [],
        });

        expect(translateIssueGroupsSync([group, untranslated], setupIlingo('en'))).toBeUndefined();
    });
});
