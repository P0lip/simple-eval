# simple-eval

Simple JavaScript expression evaluator.

## Install

```sh
yarn add simple-eval
```

or if npm is package manager of your choice

```sh
npm install simple-eval --save
```

## Usage

```js
import simpleEval from 'simple-eval';

simpleEval('2 + 4 * 10 + -4'); //  38
simpleEval('Math.floor(Math.PI * 10)'); // exception 
simpleEval('Math.floor(Math.PI * 10)', { Math }); // 31, works because we provided Math
simpleEval('foo.bar.baz ? 10 : Math.random()', {
  Math,
  foo: {
    bar: {
      baz: false,
    }
  }
}); // some random number, as returned by Math.random()
```

By default, `simple-eval` uses [`jsep`](https://www.npmjs.com/package/jsep),
but you're free to use any ESTree compliant parser such as [`acorn`](https://www.npmjs.com/package/acorn), [`@babel/parser`](https://www.npmjs.com/package/@babel/parser), or [`esprima`](https://www.npmjs.com/package/esprima).

## Security

> [!WARNING]
> **`simple-eval` is not a sandbox.** Do not use it to evaluate untrusted input.

The library supports a deliberately limited subset of JavaScript expressions — all declarations and assignments are prohibited, and access to `constructor`, `__proto__`, and `prototype` is blocked to prevent the classic `(1).constructor.constructor("…")()` escape to the `Function` constructor.

These restrictions make it safer than a bare `eval`, but they are **best-effort hardening, not a security boundary**. Anything you pass in via the context object is fully reachable by the evaluated expression, and the JavaScript engine offers many other avenues for escape. If you need to run untrusted code, use a real sandbox (a separate process, a VM/isolate, or a WebAssembly boundary) — not this library.

## Caveats

This library does not aim to be a drop-in replacement for `eval`; it intentionally supports only a small set of instructions.

## LICENSE

[MIT](https://github.com/P0lip/simple-eval/blob/master/LICENSE)
