import jsep from 'jsep'; // any ESTree compliant parser could be used. I picked this one, cause it's one of the smallest for what we need
import reduce from './reduce.mjs';

export default (expr, ctx) => {
  let tree;
  try {
    tree = jsep(expr);
  } catch (ex) {
    throw SyntaxError(ex.message);
  }

  return reduce(tree, Object.freeze(ctx));
};
