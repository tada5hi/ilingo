/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from 'ilingo';
import { IssueCode, ValidupError, defineIssueGroup, defineIssueItem } from 'validup';
import { describe, expect, it } from 'vitest';
import { translateIssue, translateIssueGroups, translateIssues } from '../../src';
import { Store } from '../../src/store/memory';

function setupIlingo(locale = 'en'): Ilingo {
    const ilingo = new Ilingo({ locale });
    ilingo.registerStore(new Store());
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
        const namespace = defineIssueGroup({
            code: IssueCode.ONE_OF_FAILED,
            message: 'None of the branches succeeded',
            path: [],
            issues: [],
        });

        const out = await translateIssue(namespace, ilingo);
        expect(out).toBe('None of the alternatives was successful');
    });

    it('interpolates parameterized codes (min_length) from issue.data', async () => {
        const ilingo = setupIlingo('en');
        const issue = defineIssueItem({
            path: ['name'],
            message: 'min',
            code: IssueCode.MIN_LENGTH,
            data: { min: 3 },
        });

        const out = await translateIssue(issue, ilingo);
        expect(out).toBe('The minimum length allowed is 3');
    });

    it('interpolates between with both min and max placeholders', async () => {
        const ilingo = setupIlingo('en');
        const issue = defineIssueItem({
            path: ['age'],
            message: 'range',
            code: IssueCode.BETWEEN,
            data: { min: 18, max: 120 },
        });

        const out = await translateIssue(issue, ilingo);
        expect(out).toBe('The value must be between 18 and 120');
    });

    it('interpolates same_as with the other-field placeholder', async () => {
        const ilingo = setupIlingo('en');
        const issue = defineIssueItem({
            path: ['passwordConfirm'],
            message: 'mismatch',
            code: IssueCode.SAME_AS,
            data: { other: 'password' },
        });

        const out = await translateIssue(issue, ilingo);
        expect(out).toBe('The value must equal password');
    });

    it('translates parameterized codes under a non-default locale', async () => {
        const ilingo = setupIlingo('de');
        const issue = defineIssueItem({
            path: ['age'],
            message: 'range',
            code: IssueCode.BETWEEN,
            data: { min: 18, max: 120 },
        });

        const out = await translateIssue(issue, ilingo);
        expect(out).toBe('Der Wert muss zwischen 18 und 120 liegen');
    });

    it('translates bare format codes (uuid, base64, json) without data', async () => {
        const ilingo = setupIlingo('en');
        for (const [code, expected] of [
            [IssueCode.UUID, 'The value is not a valid UUID'],
            [IssueCode.BASE64, 'The value is not valid base64'],
            [IssueCode.JSON, 'The value is not valid JSON'],
            [IssueCode.STRONG_PASSWORD, 'The value does not meet the password strength requirements'],
        ] as const) {
            const issue = defineIssueItem({ path: ['x'], message: 'm', code });
            const out = await translateIssue(issue, ilingo);
            expect(out).toBe(expected);
        }
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

describe('translateIssueGroups', () => {
    it('translates each group by its own code, without descending into children', async () => {
        const ilingo = setupIlingo('en');
        const group = defineIssueGroup({
            code: IssueCode.ONE_OF_FAILED,
            message: 'None of the branches succeeded',
            path: [],
            issues: [
                defineIssueItem({
                    path: ['email'],
                    message: 'The value is invalid',
                    code: IssueCode.VALUE_INVALID,
                }),
            ],
        });

        const out = await translateIssueGroups([group], ilingo);
        // One entry for the group — the child leaf is NOT flattened in.
        expect(out).toHaveLength(1);
        expect(out[0]?.message).toBe('None of the alternatives was successful');
        expect(out[0]?.issue).toBe(group);
    });

    it('respects the injected locale', async () => {
        const ilingo = setupIlingo('de');
        const group = defineIssueGroup({
            code: IssueCode.ONE_OF_FAILED,
            message: 'None of the branches succeeded',
            path: [],
            issues: [],
        });

        const out = await translateIssueGroups([group], ilingo);
        expect(out[0]?.message).toBe('Keine der Alternativen war erfolgreich');
    });

    it('returns an empty list for an empty input', async () => {
        const ilingo = setupIlingo('en');
        const out = await translateIssueGroups([], ilingo);
        expect(out).toEqual([]);
    });
});
