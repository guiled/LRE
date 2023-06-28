import { Expression, JSXMemberExpression, JSXNamespacedName } from "@swc/core";

export type ExpressionWithSpan = Exclude<Expression, JSXMemberExpression | JSXNamespacedName>;
