import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isConstructable, isCallable, printValue } from '../utils.ts';

test('isConstructable identifies constructable functions', () => {
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  class TestClass {}
  function TestConstructor() {}

  assert.strictEqual(isConstructable(TestClass), true);
  assert.strictEqual(isConstructable(TestConstructor), true);
  assert.strictEqual(isConstructable(Object), true);
  assert.strictEqual(isConstructable(Array), true);
});

test('isConstructable identifies non-constructable values', () => {
  // Arrow functions, methods, and primitives should not be constructable
  const arrowFn = () => {};
  const methodFn = {}.toString;

  assert.strictEqual(isConstructable(arrowFn), false);
  assert.strictEqual(isConstructable(methodFn), false);
  assert.strictEqual(isConstructable(null), false);
  assert.strictEqual(isConstructable(void 0), false);
  assert.strictEqual(isConstructable(42), false);
  assert.strictEqual(isConstructable('string'), false);
  assert.strictEqual(isConstructable({}), false);
});

test('isCallable identifies callable values', () => {
  function testFn() {}
  const arrowFn = () => {};
  const methodFn = {}.toString;

  assert.strictEqual(isCallable(testFn), true);
  assert.strictEqual(isCallable(arrowFn), true);
  assert.strictEqual(isCallable(methodFn), true);
  assert.strictEqual(isCallable(Function), true);
});

test('isCallable identifies non-callable values', () => {
  assert.strictEqual(isCallable(null), false);
  assert.strictEqual(isCallable(void 0), false);
  assert.strictEqual(isCallable(42), false);
  assert.strictEqual(isCallable('string'), false);
  assert.strictEqual(isCallable({}), false);
  assert.strictEqual(isCallable([]), false);
});

test('printValue handles primitive values', () => {
  assert.strictEqual(printValue('test'), 'test');
  assert.strictEqual(printValue(42), '42');
  assert.strictEqual(printValue(true), 'true');
  assert.strictEqual(printValue(false), 'false');
  assert.strictEqual(printValue(void 0), 'undefined');
  assert.strictEqual(printValue(null), 'null');
  assert.strictEqual(printValue(42n), '42');

  const sym = Symbol('test');
  assert.strictEqual(printValue(sym), sym.toString());
});

test('printValue handles functions', () => {
  function testFn() {}
  const fnString = Function.toString.call(testFn);
  assert.strictEqual(printValue(testFn), fnString);

  const arrowFn = () => {};
  const arrowFnString = Function.toString.call(arrowFn);
  assert.strictEqual(printValue(arrowFn), arrowFnString);
});

test('printValue handles objects', () => {
  assert.strictEqual(printValue({}), '#<Object>');
  assert.strictEqual(printValue([]), '#<Array>');
  assert.strictEqual(printValue(new Date()), '#<Date>');
  assert.strictEqual(printValue(new Map()), '#<Map>');
  assert.strictEqual(printValue(new Set()), '#<Set>');

  const customObj = {
    [Symbol.toStringTag]: 'CustomObject',
  };
  assert.strictEqual(printValue(customObj), '#<CustomObject>');
});
