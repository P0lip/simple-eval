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

export default function reduce(node: Node, ctx?: Context): unknown {
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
  const value = reduce(node.object, ctx) as Record<string | number, any>;
  const key =
    node.property.type === 'Identifier'
      ? node.property.name
      : (reduce(node.property, ctx) as string | number);

  if (typeof value[key] === 'function') {
    return value[key].bind(value);
  }

  return value[key];
}

function reduceCallExpr(node: CallExpression, ctx?: Context): unknown {
  return Reflect.apply(
    reduce(node.callee, ctx) as Function,
    null,
    node.arguments.map((arg) => reduce(arg, ctx)),
  );
}

function reduceNewExpr(node: NewExpression, ctx?: Context): unknown {
  return Reflect.construct(
    reduce(node.callee, ctx) as Function,
    node.arguments.map((arg) => reduce(arg, ctx)),
  );
}

function reduceUnExpr(node: UnaryExpression, ctx?: Context): unknown {
  if (!node.prefix || node.argument.type === 'UnaryExpression') {
    // node.argument.type === 'UnaryExpression' condition is jsep specific, as it doesn't support UpdateExpression(s) and produce double UnaryExpression(s)
    throw SyntaxError('Unexpected operator');
  }

  return Function('v', `return ${node.operator}v`)(reduce(node.argument, ctx));
}

function reduceConExpr(node: ConditionalExpression, ctx?: Context): unknown {
  return Function('t, c, a', `return t ? c : a`)(
    reduce(node.test, ctx),
    reduce(node.consequent, ctx),
    reduce(node.alternate, ctx),
  );
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
  return Function('lhs, rhs', `return lhs ${node.operator} rhs`)(
    reduce(node.left, ctx),
    reduce(node.right, ctx),
  );
}

function resolveIdentifier(name: string, ctx?: Context): unknown {
  if (ctx === void 0 || !(name in ctx)) {
    throw ReferenceError(`${name} is not defined`);
  }

  return Reflect.get(ctx, name, ctx);
}
