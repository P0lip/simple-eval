import jsep from 'jsep'; // any ESTree compliant parser could be used. I picked this one, cause it's one of the smallest for what we need
import reduce from './reduce.mjs';

export default (expr, ctx) => reduce(jsep(expr), Object.freeze(ctx));
