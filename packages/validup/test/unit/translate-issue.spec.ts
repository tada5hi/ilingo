/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from 'ilingo';
import { IssueCode, ValidupError, defineIssueGroup, defineIssueItem } from 'validup';
import { describe, expect, it } from 'vitest';
import { Store, translateIssue, translateIssues } from '../../src';

function setupIlingo(locale = 'en'): Ilingo {
    const ilingo = new Ilingo({ locale });
    ilingo.stores.add(new Store());
    return ilingo;
}

describe('translateIssue', () => {
    it('translates a built-in IssueCode via the default catalog', async () => {
        const ilingo = setupIlingo('en');
        const issue = defineIssueItem({
            path: ['email'],
            message: 'The value is invalid',
            code: IssueCode.VALUE_INVALID,
        });

        const out = await translateIssue(issue, ilingo);
        expect(out).toBe('The value is invalid');
    });

    it('respects the injected locale when translating', async () => {
        const ilingo = setupIlingo('de');
        const issue = defineIssueItem({
            path: ['email'],
            message: 'The value is invalid',
            code: IssueCode.VALUE_INVALID,
        });

        const out = await translateIssue(issue, ilingo);
        expect(out).toBe('Der Wert ist ungültig');
    });

    it('falls back to the issue.message when the code has no translation', async () => {
        const ilingo = setupIlingo('en');
        // Custom code not in the default catalog. The fallback path keeps the
        // consumer's UI rendering even when extension codes aren't translated yet.
        const issue = defineIssueItem({
            path: ['email'],
            message: 'Email already taken',
            code: 'email_taken',
        });

        const out = await translateIssue(issue, ilingo);
        expect(out).toBe('Email already taken');
    });

    it('translates an IssueGroup via its own code', async () => {
        const ilingo = setupIlingo('en');
        const group = defineIssueGroup({
            code: IssueCode.ONE_OF_FAILED,
            message: 'None of the branches succeeded',
            path: [],
            issues: [],
        });

        const out = await translateIssue(group, ilingo);
        expect(out).toBe('None of the alternatives was successful');
    });
});

describe('translateIssues', () => {
    it('flattens a tree and translates each leaf in order', async () => {
        const ilingo = setupIlingo('en');
        const error = new ValidupError([
            defineIssueGroup({
                code: IssueCode.ONE_OF_FAILED,
                message: 'None of the branches succeeded',
                path: [],
                issues: [
                    defineIssueItem({
                        path: ['email'],
                        message: 'The value is invalid',
                        code: IssueCode.VALUE_INVALID,
                    }),
                    defineIssueItem({
                        path: ['username'],
                        message: 'Username already taken',
                        code: 'username_taken',
                    }),
                ],
            }),
        ]);

        const out = await translateIssues(error.issues, ilingo);
        // Group is dropped, only leaves remain; second leaf falls back to its
        // own message because `username_taken` isn't in the default catalog.
        expect(out).toHaveLength(2);
        expect(out[0]?.message).toBe('The value is invalid');
        expect(out[0]?.issue.path).toEqual(['email']);
        expect(out[1]?.message).toBe('Username already taken');
        expect(out[1]?.issue.path).toEqual(['username']);
    });

    it('returns an empty list for an empty input', async () => {
        const ilingo = setupIlingo('en');
        const out = await translateIssues([], ilingo);
        expect(out).toEqual([]);
    });
});
