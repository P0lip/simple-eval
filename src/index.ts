import jsep from 'jsep';
import type { Expression, Program } from 'estree';
import reduce from './reduce.ts';
import type { Context } from './types.ts';

function parse(expr: string): Expression {
  try {
    return jsep(expr) as Expression;
  } catch (ex) {
    throw SyntaxError((ex as Error).message);
  }
}

export default (
  expr: string | Expression | Program,
  ctx?: Context,
): unknown => {
  const tree = typeof expr === 'object' ? expr : parse(expr);
  return reduce(tree, Object.freeze(ctx));
};
