export function isConstructable(
  fn: unknown,
): fn is new (...args: unknown[]) => unknown {
  try {
    // @ts-expect-error: constructor check with Proxy
    new new Proxy(fn, { construct: () => ({}) })();
    return true;
  } catch {
    return false;
  }
}

export function isCallable(
  value: unknown,
): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function fnToString(fn: Function): string {
  return Function.toString.call(fn);
}

function toString(value: object): string {
  // @ts-expect-error: Symbol.toStringTag may not exist on value, which is fine
  const stringTag = value[Symbol.toStringTag];
  if (typeof stringTag === 'string') {
    return stringTag;
  }

  return Object.prototype.toString.call(value).slice(8, -1);
}

export function printValue(value: unknown): string {
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'symbol':
    case 'undefined':
    case 'bigint':
      return String(value);
    case 'function':
      return fnToString(value);
    case 'object':
      if (value === null) {
        return 'null';
      }

      return `#<${toString(value)}>`;
  }
}
