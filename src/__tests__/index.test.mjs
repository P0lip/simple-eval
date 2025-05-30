/* eslint-disable sort-keys */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import process from 'node:process';

import * as espree from 'espree';

import simpleEval from '../index.mjs';

function runTestForEach(cases, title, testFn) {
  for (const args of cases) {
    const testTitle = title.replace(/%s/g, args);
    test(testTitle, () => testFn(args));
  }
}

runTestForEach(
  [
    '2',
    '"2"',
    '2 * 2',
    'null',
    '2 + -2',
    '(2 + 4) * 10 - 2 / 4',
    'false',
    'true',
    'true + 1',
  ],
  'evaluates expression "%s"',
  (expr) => {
    assert.strictEqual(simpleEval(expr), eval(expr));
    assert.strictEqual(simpleEval(espree.parse(expr)), eval(expr));
  },
);

runTestForEach(['[1, 2, 3]'], 'evaluates expression "%s"', (expr) => {
  assert.deepStrictEqual(simpleEval(expr), eval(expr));
  assert.deepStrictEqual(simpleEval(espree.parse(expr)), eval(expr));
});

test('"undefined" is considered an identifier', () => {
  assert.strictEqual(simpleEval('undefined', { undefined: 5 }), 5);
});

runTestForEach(
  [
    'Math.floor(Math.PI)',
    'Number.isNaN(Math.PI) ? 0 : 1',
    'Number.isFinite(Math.foo) ? 0 : 1',
    'process.env.NODE_ENV || false',
    'process.cwd() && false',
    'process.cwd()',
  ],
  'given context, evaluates expression "%s" and resolves identifiers',
  (expr) => {
    const ctx = {
      Math,
      Number,
      process,
    };
    assert.strictEqual(simpleEval(expr, ctx), eval(expr));
    assert.strictEqual(simpleEval(espree.parse(expr), ctx), eval(expr));
  },
);

test('supports CallExpression on MemberExpression', () => {
  const expr =
    "path[1] + '-' + path[2].toUpperCase() + ' ' + path.slice(0, 1).join('').toUpperCase()";

  assert.strictEqual(
    simpleEval(expr, {
      path: ['foo', 'bar', '/a'],
    }),
    'bar-/A FOO',
  );
});

test('supports NewExpressions', () => {
  assert.ok(simpleEval(espree.parse('new Date()'), { Date }) instanceof Date);

  const result = simpleEval(espree.parse('new Foo(bar, baz)'), {
    Foo: class {
      constructor(a, b) {
        this.result = a + b;
      }
    },
    bar: 1,
    baz: 2,
  });
  assert.strictEqual(result.result, 3);
});

const syntaxErrorExpressions = ['var a = 2', '++c', 'a = b', 'a += b', 'a;b;'];

runTestForEach(
  syntaxErrorExpressions,
  'given "%s", throws SyntaxError',
  (expr) => {
    assert.throws(() => simpleEval(expr), { name: 'SyntaxError' });
    assert.throws(() => simpleEval(espree.parse(expr)), {
      name: 'SyntaxError',
    });
  },
);

const typeErrorExpressions = ['this.bar()', 'this.foo()', 'foo.bar.baz'];

runTestForEach(typeErrorExpressions, 'given "%s", throws TypeError', (expr) => {
  assert.throws(() => simpleEval(expr, { foo: {} }), { name: 'TypeError' });
});

const referenceErrorExpressions = ['bar()', 'foo'];

runTestForEach(
  referenceErrorExpressions,
  'given "%s", throws ReferenceError',
  (expr) => {
    assert.throws(() => simpleEval(expr, {}), { name: 'ReferenceError' });
  },
);

test('"this" points at provided context', () => {
  const ctx = {
    Math,
    emptyArr: [],
  };

  assert.strictEqual(simpleEval('this', ctx), ctx);
  assert.strictEqual(simpleEval('this.Math', ctx), ctx.Math);
  assert.strictEqual(simpleEval('this.emptyArr', ctx), ctx.emptyArr);
});
