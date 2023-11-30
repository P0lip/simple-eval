/* eslint-disable sort-keys */
import simpleEval from '../index.mjs';
import each from 'mocha-each';
import * as espree from 'espree';

each([
  '2',
  '"2"',
  '2 * 2',
  'null',
  '2 + -2',
  '(2 + 4) * 10 - 2 / 4',
  'false',
  'true',
  'true + 1',
]).it('evaluates expression "%s"', (expr) => {
  expect(simpleEval(expr)).to.eq(eval(expr));
  expect(simpleEval(espree.parse(expr))).to.eq(eval(expr));
});

each(['[1, 2, 3]']).it('evaluates expression "%s"', (expr) => {
  expect(simpleEval(expr)).to.deep.eq(eval(expr));
  expect(simpleEval(espree.parse(expr))).to.deep.eq(eval(expr));
});

it('"undefined" is considered an identifier', () => {
  expect(simpleEval('undefined', { undefined: 5 })).to.eq(5);
});

each([
  'Math.floor(Math.PI)',
  'Number.isNaN(Math.PI) ? 0 : 1',
  'Number.isFinite(Math.foo) ? 0 : 1',
  'process.env.NODE_ENV || false',
  'process.cwd() && false',
  'process.cwd()',
]).it(
  'given context, evaluates expression "%s" and resolves identifiers',
  (expr) => {
    const ctx = {
      Math,
      Number,
      process,
    };
    expect(simpleEval(expr, ctx)).to.eq(eval(expr));
    expect(simpleEval(espree.parse(expr), ctx)).to.eq(eval(expr));
  },
);

it('supports CallExpression on MemberExpression', () => {
  const expr =
    "path[1] + '-' + path[2].toUpperCase() + ' ' + path.slice(0, 1).join('').toUpperCase()";

  expect(
    simpleEval(expr, {
      path: ['foo', 'bar', '/a'],
    }),
  ).to.eq('bar-/A FOO');
});

it('supports NewExpressions', () => {
  expect(simpleEval(espree.parse('new Date()'), { Date })).to.be.instanceOf(
    Date,
  );

  expect(
    simpleEval(espree.parse('new Foo(bar, baz)'), {
      Foo: class {
        constructor(a, b) {
          this.result = a + b;
        }
      },
      bar: 1,
      baz: 2,
    }),
  ).to.deep.equal({
    result: 3,
  });
});

each(['var a = 2', '++c', 'a = b', 'a += b', 'a;b;']).it(
  'given "%s", throws SyntaxError',
  (expr) => {
    expect(simpleEval.bind(null, expr)).to.throw(SyntaxError);
    expect(simpleEval.bind(null, espree.parse(expr))).to.throw(SyntaxError);
  },
);

each(['this.bar()', 'this.foo()', 'foo.bar.baz']).it(
  'given "%s", throws TypeError',
  (expr) => {
    expect(simpleEval.bind(null, expr, { foo: {} })).to.throw(TypeError);
  },
);

each(['bar()', 'foo']).it('given "%s", throws ReferenceError', (expr) => {
  expect(simpleEval.bind(null, expr, {})).to.throw(ReferenceError);
});

it('"this" points at provided context', () => {
  const ctx = {
    Math,
    emptyArr: [],
  };

  expect(simpleEval('this', ctx)).to.eq(ctx);
  expect(simpleEval('this.Math', ctx)).to.eq(ctx.Math);
  expect(simpleEval('this.emptyArr', ctx)).to.eq(ctx.emptyArr);
});
