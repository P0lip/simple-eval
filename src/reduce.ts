import type {
  Node,
  Program,
  MemberExpression,
  CallExpression,
  NewExpression,
  UnaryExpression,
  ConditionalExpression,
  BinaryExpression,
  LogicalExpression,
  ArrayExpression,
} from 'estree';
import type { Context } from './types.ts';
import { isCallable, isConstructable, printValue } from './utils.ts';

export default function reduce(node: Node, ctx?: Context): unknown {
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  switch (node.type) {
    case 'Program':
      return reduceProgram(node, ctx);
    case 'ExpressionStatement':
      return reduce(node.expression, ctx);
    case 'MemberExpression':
      return reduceMemExpr(node, ctx);
    case 'LogicalExpression':
      return reduceLogExpr(node, ctx);
    case 'ConditionalExpression':
      return reduceConExpr(node, ctx);
    case 'BinaryExpression':
      return reduceBinExpr(node, ctx);
    case 'UnaryExpression':
      return reduceUnExpr(node, ctx);
    case 'CallExpression':
      return reduceCallExpr(node, ctx);
    case 'NewExpression':
      return reduceNewExpr(node, ctx);
    case 'ArrayExpression':
      return reduceArrExpr(node, ctx);
    case 'ThisExpression':
      return ctx;
    case 'Identifier':
      return resolveIdentifier(node.name, ctx);
    case 'Literal':
      return node.value;
    default:
      throw SyntaxError('Unexpected node');
  }
}

function reduceProgram(node: Program, ctx?: Context): unknown {
  if (node.body.length !== 1) {
    throw SyntaxError('Too complex expression');
  }

  return reduce(node.body[0], ctx);
}

function reduceMemExpr(node: MemberExpression, ctx?: Context): unknown {
  const value = reduce(node.object, ctx);
  const key =
    node.property.type === 'Identifier'
      ? node.property.name
      : reduce(node.property, ctx);

  if (value === null || value === void 0) {
    throw TypeError(
      `Cannot read properties of ${String(value)} (reading '${printValue(value)}')`,
    );
  }

  // @ts-expect-error: this may throw and that's fine
  const accessedValue = value[key];
  return isCallable(accessedValue) ? accessedValue.bind(value) : accessedValue;
}

function reduceCallExpr(node: CallExpression, ctx?: Context): unknown {
  const maybeCallable = reduce(node.callee, ctx);
  if (!isCallable(maybeCallable)) {
    throw TypeError(`${maybeCallable} is not a function`);
  }

  return Reflect.apply(
    maybeCallable,
    null,
    node.arguments.map((arg) => reduce(arg, ctx)),
  );
}

function reduceNewExpr(node: NewExpression, ctx?: Context): unknown {
  const maybeConstructable = reduce(node.callee, ctx);
  if (!isConstructable(maybeConstructable)) {
    throw TypeError(`${printValue(maybeConstructable)} is not a constructor`);
  }

  return Reflect.construct(
    maybeConstructable,
    node.arguments.map((arg) => reduce(arg, ctx)),
  );
}

function reduceUnExpr(node: UnaryExpression, ctx?: Context): unknown {
  if (!node.prefix || node.argument.type === 'UnaryExpression') {
    // node.argument.type === 'UnaryExpression' condition is jsep specific, as it doesn't support UpdateExpression(s) and produce double UnaryExpression(s)
    throw SyntaxError('Unexpected operator');
  }

  switch (node.operator) {
    case '!':
      return !reduce(node.argument, ctx);
    case '-':
      // @ts-expect-error: might be anything, we want the coercion
      return -reduce(node.argument, ctx);
    case '+':
      // @ts-expect-error: might be anything, we want the coercion
      return +reduce(node.argument, ctx);
    case '~':
      // @ts-expect-error: might be anything, we want the coercion
      return ~reduce(node.argument, ctx);
    case 'typeof':
      return typeof reduce(node.argument, ctx);
    case 'void':
      return void reduce(node.argument, ctx);
    case 'delete': {
      if (node.argument.type !== 'MemberExpression') {
        return true;
      }

      const obj = reduce(node.argument.object, ctx);
      if (typeof obj !== 'object' || obj === null) {
        return true;
      }

      return Reflect.deleteProperty(
        obj,
        node.argument.property.type === 'Identifier'
          ? node.argument.property.name
          : (reduce(node.argument.property, ctx) as PropertyKey),
      );
    }
    default:
      throw SyntaxError(`Unsupported unary operator: ${node.operator}`);
  }
}

function reduceConExpr(node: ConditionalExpression, ctx?: Context): unknown {
  return reduce(node.test, ctx)
    ? reduce(node.consequent, ctx)
    : reduce(node.alternate, ctx);
}

function reduceBinExpr(node: BinaryExpression, ctx?: Context): unknown {
  return evalLhsRhs(node, ctx);
}

function reduceLogExpr(node: LogicalExpression, ctx?: Context): unknown {
  return evalLhsRhs(node, ctx);
}

function reduceArrExpr(node: ArrayExpression, ctx?: Context): unknown[] {
  return node.elements.map((el) => (el === null ? null : reduce(el, ctx)));
}

function evalLhsRhs(
  node: BinaryExpression | LogicalExpression,
  ctx?: Context,
): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const left = reduce(node.left, ctx) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const right = reduce(node.right, ctx) as any;
  const isLogicalExpression = node.type === 'LogicalExpression';

  switch (node.operator) {
    case '-':
      return left - right;
    case '+':
      return left + right;
    case '==':
      return left == right;
    case '!=':
      return left != right;
    case '===':
      return left === right;
    case '!==':
      return left !== right;
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    case '>':
      return left > right;
    case '>=':
      return left >= right;
    case '<<':
      return left << right;
    case '>>':
      return left >> right;
    case '>>>':
      return left >>> right;
    case '*':
      return left * right;
    case '/':
      return left / right;
    case '%':
      return left % right;
    case '**':
      return left ** right;
    case '|':
      return left | right;
    case '^':
      return left ^ right;
    case '&':
      return left & right;
    case 'in':
      return left in right;
    case 'instanceof':
      return left instanceof right;
    case '&&':
      return left && right;
    case '||':
      return left || right;
    case '??':
      return left ?? right;
    default:
      throw SyntaxError(
        `Unsupported ${isLogicalExpression ? 'logical' : 'binary'} operator: ${node['operator']}`,
      );
  }
}

function resolveIdentifier(name: string, ctx?: Context): unknown {
  if (ctx === void 0 || !(name in ctx)) {
    throw ReferenceError(`${name} is not defined`);
  }

  return Reflect.get(ctx, name, ctx);
}
