import { FunctionExpression, Span, Statement } from "@swc/core";

type FUNC_PARAM = {
  span: Span;
  stmts: Statement[];
  identifier?: FunctionExpression["identifier"];
  params?: FunctionExpression["params"];
  decorators?: FunctionExpression["decorators"];
  generator?: FunctionExpression["generator"];
  async?: FunctionExpression["async"];
  typeParameters?: FunctionExpression["typeParameters"];
  returnType?: FunctionExpression["returnType"];
};

export default ({
  span,
  identifier = undefined,
  params = [],
  decorators = [],
  stmts = [],
  generator = false,
  async = false,
  typeParameters = undefined,
  returnType = undefined,
}: FUNC_PARAM): FunctionExpression => {
  return {
    type: "FunctionExpression",
    identifier,
    params,
    decorators,
    span: span,
    body: {
      type: "BlockStatement",
      span: span,
      stmts,
    },
    generator,
    async,
    typeParameters,
    returnType,
  };
};
