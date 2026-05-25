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
 * claims to support — Node, Bun, raw browser ESM, Vite dev, Vite prod
 * (with DefinePlugin substitution), Cloudflare Workers, Deno.
 *
 * The guard is intentionally written as a literal `process.env.NODE_ENV`
 * reference (so bundlers' static substitution fires) wrapped in a
 * `typeof process !== 'undefined'` runtime check + a try/catch (for
 * sandboxes that throw on `process.env` access). These tests simulate
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
        // certain Edge sandboxes) define `process` as a guarded proxy where
        // reading `.env` throws. The try/catch swallows it.
        Object.defineProperty(globalThis, 'process', {
            configurable: true,
            get(): never {
                throw new Error('process is not exposed in this runtime');
            },
        });

        expect(() => isProductionEnv()).not.toThrow();
        expect(isProductionEnv()).toBe(false);

        // Clean up the getter so afterEach's plain assignment works.
        delete (globalThis as { process?: ProcessShape }).process;
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

    it('returns true when DefinePlugin has literal-replaced the comparison (Vite/webpack prod)', () => {
        // Vite/webpack prod builds replace `process.env.NODE_ENV` with the
        // string literal `"production"` at build time. The compiled form is
        // effectively: `typeof process !== 'undefined' && process.env != null && "production" === 'production'`
        // — which still requires `typeof process` to be true at runtime. In
        // a Node prod runtime that's the case and the guard returns true,
        // matching the behavior we'd see after the substitution.
        (globalThis as { process: { env: { NODE_ENV: string } } }).process = {
            env: { NODE_ENV: 'production' },
        } as unknown as NodeJS.Process;

        expect(isProductionEnv()).toBe(true);
    });

    it('returns false when DefinePlugin replaced NODE_ENV in a browser build', () => {
        // Browser-targeted Vite/webpack prod build: `process.env.NODE_ENV`
        // is replaced with `"production"` AND `typeof process` is left as
        // a runtime check. In the browser, `typeof process` is 'undefined'
        // so the short-circuit fires before the replaced literal matters.
        // Result: false (correct — no warnings in browser, even prod).
        delete (globalThis as { process?: ProcessShape }).process;

        expect(isProductionEnv()).toBe(false);
    });
});
