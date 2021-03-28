/* eslint-disable sort-keys */
import simpleEval from '../index.mjs';
import each from 'mocha-each';

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
});

each(['[1, 2, 3]']).it('evaluates expression "%s"', (expr) => {
  expect(simpleEval(expr)).to.deep.eq(eval(expr));
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
    expect(simpleEval(expr, { Math, Number, process })).to.eq(eval(expr));
  },
);

each(['this.bar()', 'foo.bar.baz']).it(
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
