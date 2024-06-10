import {
  Argument,
  CallExpression,
  FunctionExpression,
  Span,
  Statement,
} from "@swc/core";
import member from "./member";
import identifier_ from "../identifier";

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
  binded?: Argument | null;
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
  binded = null,
}: FUNC_PARAM): FunctionExpression | CallExpression => {
  const fcn: FunctionExpression = {
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
  if (binded) {
    return {
      type: "CallExpression",
      span,
      callee: member({
        span,
        object: {
          type: "ParenthesisExpression",
          span,
          expression: fcn,
        },
        property: identifier_({ span, value: "bind" }),
      }),
      arguments: [binded],
    };
  }
  return fcn;
};
