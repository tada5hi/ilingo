/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, it, expect } from 'vitest';
import { template, tokenize } from '../../../src';

describe('src/utils/template — string substitution', () => {
    it('should replace str in template', () => {
        let str = template('Hi {{name}}!', { name: 'Peter' });
        expect(str).toEqual('Hi Peter!');

        str = template('Hi {{name}}!', {});
        expect(str).toEqual('Hi {{name}}!');
    });
});

describe('src/utils/template — tokenize()', () => {
    it('returns a single text token for plain strings', () => {
        expect(tokenize('hello world')).toEqual([
            { kind: 'text', value: 'hello world' },
        ]);
    });

    it('returns an empty array for an empty string', () => {
        expect(tokenize('')).toEqual([]);
    });

    it('tokenises a single {{var}}', () => {
        expect(tokenize('Hi {{name}}!')).toEqual([
            { kind: 'text', value: 'Hi ' },
            { kind: 'var', name: 'name' },
            { kind: 'text', value: '!' },
        ]);
    });

    it('captures the modifier expression on a var token', () => {
        expect(tokenize('You owe {{amount, number(currency=EUR)}}')).toEqual([
            { kind: 'text', value: 'You owe ' },
            { kind: 'var', name: 'amount', modifierExpression: 'number(currency=EUR)' },
        ]);
    });

    it('tokenises a single {slot}', () => {
        expect(tokenize('Click {link} to continue')).toEqual([
            { kind: 'text', value: 'Click ' },
            { kind: 'slot', name: 'link' },
            { kind: 'text', value: ' to continue' },
        ]);
    });

    it('interleaves vars and slots', () => {
        expect(tokenize('Hi {{name}}, click {action} now')).toEqual([
            { kind: 'text', value: 'Hi ' },
            { kind: 'var', name: 'name' },
            { kind: 'text', value: ', click ' },
            { kind: 'slot', name: 'action' },
            { kind: 'text', value: ' now' },
        ]);
    });

    it('does not mistake {{var}} for {slot} (double braces win)', () => {
        const tokens = tokenize('{{count}}');
        expect(tokens).toEqual([{ kind: 'var', name: 'count' }]);
    });

    it('leaves malformed slot syntax as literal text', () => {
        // Not a valid identifier: contains spaces / starts with digit.
        expect(tokenize('See { not valid }')).toEqual([
            { kind: 'text', value: 'See { not valid }' },
        ]);
        expect(tokenize('See {1abc}')).toEqual([
            { kind: 'text', value: 'See {1abc}' },
        ]);
    });

    it('accepts kebab-case slot names', () => {
        expect(tokenize('Click {sign-up-link}!')).toEqual([
            { kind: 'text', value: 'Click ' },
            { kind: 'slot', name: 'sign-up-link' },
            { kind: 'text', value: '!' },
        ]);
    });
});
