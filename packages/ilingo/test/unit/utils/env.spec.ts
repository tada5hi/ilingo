/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach, beforeEach, describe, expect, it,
} from 'vitest';
import { isProductionEnv } from '../../../src';

/**
 * `isProductionEnv()` is the single guard the library uses to decide
 * whether to emit dev-mode warnings (missing-key, unknown-formatter).
 * It runs on every Ilingo instance across every runtime the library
 * claims to support — Node, Bun, raw browser ESM, Cloudflare Workers,
 * Deno, plus the Vite / webpack prod-build paths where the
 * `process.env.NODE_ENV` literal is statically replaced.
 *
 * The guard is intentionally written as a literal `process.env.NODE_ENV`
 * reference (so bundlers' static substitution fires) wrapped in a
 * `typeof process !== 'undefined'` runtime check + a try/catch (for
 * sandboxes where reading `process.env` throws). These tests simulate
 * each runtime by manipulating the `process` global and verify the
 * guard never throws and never returns true outside production.
 */

describe('isProductionEnv() — cross-runtime guard', () => {
    type ProcessShape = NodeJS.Process | undefined;
    let originalProcess: ProcessShape;

    beforeEach(() => {
        // Capture so we can restore — `delete globalThis.process` and
        // re-assign mid-test would leave Node's own process gone for the
        // rest of the suite otherwise.
        originalProcess = (globalThis as unknown as { process: ProcessShape }).process;
    });

    afterEach(() => {
        if (originalProcess === undefined) {
            delete (globalThis as { process?: ProcessShape }).process;
        } else {
            (globalThis as { process?: ProcessShape }).process = originalProcess;
        }
    });

    it('returns true when process.env.NODE_ENV === "production" (Node prod)', () => {
        // The default Node case — prod bundle running on a Node server.
        (globalThis as { process: { env: { NODE_ENV: string } } }).process = {
            env: { NODE_ENV: 'production' },
        } as unknown as NodeJS.Process;

        expect(isProductionEnv()).toBe(true);
    });

    it('returns false when process.env.NODE_ENV === "development" (Node dev)', () => {
        (globalThis as { process: { env: { NODE_ENV: string } } }).process = {
            env: { NODE_ENV: 'development' },
        } as unknown as NodeJS.Process;

        expect(isProductionEnv()).toBe(false);
    });

    it('returns false when process.env.NODE_ENV is absent (Node, default env)', () => {
        // Node started without NODE_ENV — process.env is present but the
        // key is missing. Conservatively non-prod so warnings still fire.
        (globalThis as { process: { env: Record<string, string> } }).process = {
            env: {},
        } as unknown as NodeJS.Process;

        expect(isProductionEnv()).toBe(false);
    });

    it('returns false when process is undefined (raw browser ESM)', () => {
        // No bundler, no polyfill — just a <script type="module"> with the
        // library imported directly. The typeof guard short-circuits before
        // touching process.env, which would otherwise throw a ReferenceError.
        delete (globalThis as { process?: ProcessShape }).process;

        expect(() => isProductionEnv()).not.toThrow();
        expect(isProductionEnv()).toBe(false);
    });

    it('returns false when process exists but process.env is undefined (sparse polyfill)', () => {
        // Some browser polyfills define `process` as an empty object without
        // an `env` field. The `!= null` check on process.env catches this.
        (globalThis as { process: object }).process = {} as unknown as NodeJS.Process;

        expect(() => isProductionEnv()).not.toThrow();
        expect(isProductionEnv()).toBe(false);
    });

    it('returns false when process.env access throws (sandboxed runtime)', () => {
        // Some restricted runtimes (older Cloudflare Workers compat modes,
        // certain Edge sandboxes) expose `process` but define `env` as a
        // guarded property that throws on read. The try/catch wrapper in
        // `isProductionEnv` swallows that — without it we'd surface a
        // misleading `TypeError` from inside a dev-mode warn check.
        const guarded = Object.create(null) as { env?: unknown };
        Object.defineProperty(guarded, 'env', {
            configurable: true,
            get(): never {
                throw new Error('process.env is not exposed in this runtime');
            },
        });
        (globalThis as { process: typeof guarded }).process = guarded;

        expect(() => isProductionEnv()).not.toThrow();
        expect(isProductionEnv()).toBe(false);
    });

    it('returns true under a Bun-like environment (process exists, NODE_ENV=production)', () => {
        // Bun ships a Node-compatible `process` global with the same env
        // semantics, so the guard fires the same way it does in Node. The
        // smoke script (`packages/ilingo/test/smoke.mjs`) covers the actual
        // Bun runtime path in CI; this case confirms the guard works for
        // the shape Bun presents at runtime.
        (globalThis as { process: { env: { NODE_ENV: string } } }).process = {
            env: { NODE_ENV: 'production' },
        } as unknown as NodeJS.Process;

        expect(isProductionEnv()).toBe(true);
    });

    // Note: bundler-substitution scenarios (Vite / webpack DefinePlugin
    // replacing `process.env.NODE_ENV` with a literal at build time) are
    // intentionally not exercised here. Substitution happens pre-runtime
    // so any runtime test that re-imports the source module just runs
    // the original code, not the substituted form — the assertions
    // collapse to the Node-prod / browser cases above. The
    // post-substitution code is still safe because the `typeof process`
    // short-circuit fires before the replaced literal is reached in any
    // runtime that lacks a `process` global.
});
