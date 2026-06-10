/* eslint-disable no-eval,@typescript-eslint/no-explicit-any */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import process from 'node:process';

import * as espree from 'espree';
import type {
  BinaryExpression,
  LogicalExpression,
  NewExpression,
  Program,
  UnaryExpression,
} from 'estree';

import simpleEval from '../index.ts';

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
    assert.strictEqual(simpleEval(parse(expr)), eval(expr));
  },
);

runTestForEach(
  [
    'null ?? "default"',
    'undefined ?? "default"',
    '"value" ?? "default"',
    '0 ?? "default"',
    'false ?? "default"',
    'null ?? undefined ?? "default"',
  ],
  'evaluates nullish coalescing expression: %s',
  (expr) => {
    const ctx = expr.includes('undefined') ? { undefined: void 0 } : void 0;
    const expected = eval(expr.replace('undefined', 'ctx.undefined'));
    assert.strictEqual(simpleEval(expr, ctx), expected);
  },
);

runTestForEach(['[1, 2, 3]'], 'evaluates expression "%s"', (expr) => {
  assert.deepStrictEqual(simpleEval(expr), eval(expr));
  assert.deepStrictEqual(simpleEval(parse(expr)), eval(expr));
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
    assert.strictEqual(simpleEval(parse(expr), ctx), eval(expr));
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
  assert.ok(simpleEval(parse('new Date()'), { Date }) instanceof Date);

  const result = simpleEval(parse('new Foo(bar, baz)'), {
    Foo: class {
      result: number;
      constructor(a: number, b: number) {
        this.result = a + b;
      }
    },
    bar: 1,
    baz: 2,
  });
  assert.strictEqual((result as { result: number }).result, 3);
});

const syntaxErrorExpressions = ['var a = 2', '++c', 'a = b', 'a += b', 'a;b;'];

runTestForEach(
  syntaxErrorExpressions,
  'given "%s", throws SyntaxError',
  (expr) => {
    assert.throws(() => simpleEval(expr), { name: 'SyntaxError' });
    assert.throws(() => simpleEval(parse(expr)), {
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

test('handles sparse arrays', () => {
  assert.strictEqual(simpleEval('[,,,"entry"][3]'), 'entry');
  assert.strictEqual(simpleEval('["entry",,][0]'), 'entry');
});

// Test unary operators
runTestForEach(
  ['!true', '+42', '~5'],
  'evaluates unary operator: %s',
  (expr) => {
    const expected = eval(expr);
    assert.strictEqual(simpleEval(expr), expected);
    assert.strictEqual(simpleEval(parse(expr)), expected);
  },
);

test('evaluates typeof operator', () => {
  const typeofExpr = parse('typeof "hello"');
  assert.strictEqual(simpleEval(typeofExpr), 'string');
});

test('evaluates void operator', () => {
  const voidExpr = parse('void 0');
  assert.strictEqual(simpleEval(voidExpr), void 0);
});

test('evaluates delete operator', () => {
  const obj = { nested: { deep: true }, prop: 'value' };

  // Test delete on object property
  const deleteExpr = parse('delete obj.prop');
  assert.strictEqual(simpleEval(deleteExpr, { obj }), true);
  assert.strictEqual('prop' in obj, false);

  // Test delete on non-existent property (should return true)
  const deleteNonExistentExpr = parse('delete obj.nonExistent');
  assert.strictEqual(simpleEval(deleteNonExistentExpr, { obj }), true);

  // Test delete on non-MemberExpression (should return true)
  const deleteNonMemberExpr = parse('delete 42');
  assert.strictEqual(simpleEval(deleteNonMemberExpr), true);

  // Test delete on null object (should return true)
  const deleteNullExpr = parse('delete null.prop');
  assert.strictEqual(simpleEval(deleteNullExpr), true);

  // Test delete with computed property
  const objWithArray = { arr: [1, 2, 3] };
  const deleteComputedExpr = parse('delete objWithArray.arr[1]');
  assert.strictEqual(simpleEval(deleteComputedExpr, { objWithArray }), true);
});

runTestForEach(
  ['1 == "1"', '1 != "2"', '1 === 1', '1 !== "1"'],
  'evaluates equality operator: %s',
  (expr) => {
    assert.strictEqual(simpleEval(expr), eval(expr));
  },
);

runTestForEach(
  ['5 < 10', '5 <= 5', '10 > 5', '10 >= 10'],
  'evaluates comparison operator: %s',
  (expr) => {
    assert.strictEqual(simpleEval(expr), eval(expr));
  },
);

runTestForEach(
  ['8 << 2', '8 >> 2', '-8 >>> 2'],
  'evaluates bitwise shift operator: %s',
  (expr) => {
    assert.strictEqual(simpleEval(expr), eval(expr));
  },
);

runTestForEach(
  ['2 * 3', '6 / 2', '7 % 3', '2 ** 3'],
  'evaluates arithmetic operator: %s',
  (expr) => {
    assert.strictEqual(simpleEval(expr), eval(expr));
  },
);

runTestForEach(
  ['5 | 3', '5 ^ 3', '5 & 3'],
  'evaluates bitwise operator: %s',
  (expr) => {
    assert.strictEqual(simpleEval(expr), eval(expr));
  },
);

test('evaluates in and instanceof operators', () => {
  const obj = { prop: 'value' };
  const inExpr = parse('"prop" in obj');
  assert.strictEqual(simpleEval(inExpr, { obj }), true);

  const instanceofExpr = parse('obj instanceof Object');
  assert.strictEqual(simpleEval(instanceofExpr, { Object, obj }), true);
});

test('throws error for unsupported unary operators', () => {
  const unsupportedExpr: UnaryExpression = {
    argument: {
      type: 'Literal',
      value: true,
    },
    operator: '!',
    prefix: true,
    type: 'UnaryExpression',
  };
  assert.throws(
    () =>
      simpleEval({
        ...unsupportedExpr,
        operator: 'unsupported' as any,
      }),
    { name: 'SyntaxError' },
  );

  // Test non-prefix unary operator
  assert.throws(
    () =>
      simpleEval({
        ...unsupportedExpr,
        prefix: false as any,
      }),
    { name: 'SyntaxError' },
  );
});

test('throws error for unsupported binary expression operators', () => {
  const unsupportedBinExpr: BinaryExpression = {
    left: {
      type: 'Literal',
      value: 1,
    },
    operator: 'unsupported' as any,
    right: {
      type: 'Literal',
      value: 2,
    },
    type: 'BinaryExpression',
  };

  assert.throws(() => simpleEval(unsupportedBinExpr), { name: 'SyntaxError' });
});

test('throws error for unsupported logical expression operators', () => {
  const unsupportedLogicalExpr: LogicalExpression = {
    left: {
      type: 'Literal',
      value: false,
    },
    operator: 'unsupported' as any,
    right: {
      type: 'Literal',
      value: true,
    },
    type: 'LogicalExpression',
  };

  assert.throws(() => simpleEval(unsupportedLogicalExpr), {
    name: 'SyntaxError',
  });
});

test('throws error for non-constructable values', () => {
  const numberConstructExpr: NewExpression = {
    arguments: [],
    callee: {
      name: 42,
      type: 'Literal',
    } as any,
    type: 'NewExpression',
  };

  assert.throws(() => simpleEval(numberConstructExpr), { name: 'TypeError' });
});

runTestForEach(
  [
    '(1).constructor.constructor("return process")()',
    '(1)["constructor"]["constructor"]("return process")()',
    '("").constructor.constructor("return process")()',
    '[].constructor.constructor("return process")()',
    'foo.constructor.constructor("return process")()',
    'foo.__proto__',
    'foo["__proto__"]',
    'foo.constructor',
    'Math.constructor',
  ],
  'blocks sandbox escape via "%s"',
  (expr) => {
    assert.throws(() => simpleEval(expr, { Math, foo: {} }), {
      name: 'TypeError',
    });
  },
);

function runTestForEach(
  cases: string[],
  title: string,
  testFn: (arg: string) => void,
): void {
  for (const args of cases) {
    const testTitle = title.replace(/%s/g, args);
    test(testTitle, () => testFn(args));
  }
}

function parse(expression: string) {
  return espree.parse(expression) as Program;
}
