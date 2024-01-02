import { Expression, JSXMemberExpression, JSXNamespacedName, Pattern } from "@swc/core";

export type ExpressionWithSpan = Exclude<Expression, JSXMemberExpression | JSXNamespacedName>;
export type PatternWithSpan = Exclude<Pattern, JSXMemberExpression | JSXNamespacedName>