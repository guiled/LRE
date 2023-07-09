import { Expression, Param, Span, Statement, TsParameterProperty, VariableDeclarator } from "@swc/core";

export const CONSTRUCTOR_ARG_NAME = '__lrargs__';

const UndefinedIdentifier = (span: Span): Expression => {
  return {
    type: "Identifier",
    span: span,
    value: "undefined",
    optional: false,
  };
};

export function paramToVariableDeclarator(
  param: Param | TsParameterProperty,
  order: number
): VariableDeclarator {
  let defaultValue = UndefinedIdentifier(param.span);
  let pat = (param as Param).pat;
  if ("right" in pat && pat.type === "AssignmentPattern") {
    defaultValue = { ...pat.right };
    pat = pat.left;
  }
  return {
    type: "VariableDeclarator",
    span: param.span,
    id: pat,
    init: {
      type: "CallExpression",
      span: param.span,
      callee: {
        type: "Identifier",
        span: param.span,
        value: "paramToVariable",
        optional: false,
      },
      arguments: [
        {
          spread: undefined,
          expression: {
            type: "Identifier",
            span: param.span,
            value: CONSTRUCTOR_ARG_NAME,
            optional: false,
          },
        },
        {
          spread: undefined,
          expression: {
            type: "NumericLiteral",
            span: param.span,
            value: order,
            raw: "" + order,
          },
        },
        {
          spread: undefined,
          expression: defaultValue,
        },
      ],
      typeArguments: undefined,
    },
    definite: false,
  };
}

export function getParamToVariableAST(): Statement {
    return {
      type: "FunctionDeclaration",
      identifier: {
        type: "Identifier",
        span: {
          start: 13,
          end: 28,
          ctxt: 0,
        },
        value: "paramToVariable",
        optional: false,
      },
      declare: false,
      params: [
        {
          type: "Parameter",
          span: {
            start: 29,
            end: 35,
            ctxt: 0,
          },
          decorators: [],
          pat: {
            type: "Identifier",
            span: {
              start: 29,
              end: 35,
              ctxt: 0,
            },
            value: "params",
            optional: false,
            typeAnnotation: undefined,
          },
        },
        {
          type: "Parameter",
          span: {
            start: 37,
            end: 42,
            ctxt: 0,
          },
          decorators: [],
          pat: {
            type: "Identifier",
            span: {
              start: 37,
              end: 42,
              ctxt: 0,
            },
            value: "index",
            optional: false,
            typeAnnotation: undefined,
          },
        },
        {
          type: "Parameter",
          span: {
            start: 44,
            end: 56,
            ctxt: 0,
          },
          decorators: [],
          pat: {
            type: "Identifier",
            span: {
              start: 44,
              end: 56,
              ctxt: 0,
            },
            value: "defaultValue",
            optional: false,
            typeAnnotation: undefined,
          },
        },
      ],
      decorators: [],
      span: {
        start: 4,
        end: 133,
        ctxt: 0,
      },
      body: {
        type: "BlockStatement",
        span: {
          start: 58,
          end: 133,
          ctxt: 0,
        },
        stmts: [
          {
            type: "ReturnStatement",
            span: {
              start: 64,
              end: 129,
              ctxt: 0,
            },
            argument: {
              type: "ParenthesisExpression",
              span: {
                start: 71,
                end: 128,
                ctxt: 0,
              },
              expression: {
                type: "ConditionalExpression",
                span: {
                  start: 72,
                  end: 127,
                  ctxt: 0,
                },
                test: {
                  type: "BinaryExpression",
                  span: {
                    start: 72,
                    end: 97,
                    ctxt: 0,
                  },
                  operator: ">",
                  left: {
                    type: "MemberExpression",
                    span: {
                      start: 72,
                      end: 85,
                      ctxt: 0,
                    },
                    object: {
                      type: "Identifier",
                      span: {
                        start: 72,
                        end: 78,
                        ctxt: 0,
                      },
                      value: "params",
                      optional: false,
                    },
                    property: {
                      type: "Identifier",
                      span: {
                        start: 79,
                        end: 85,
                        ctxt: 0,
                      },
                      value: "length",
                      optional: false,
                    },
                  },
                  right: {
                    type: "Identifier",
                    span: {
                      start: 88,
                      end: 93,
                      ctxt: 0,
                    },
                    value: "index",
                    optional: false,
                  },
                },
                consequent: {
                  type: "MemberExpression",
                  span: {
                    start: 100,
                    end: 113,
                    ctxt: 0,
                  },
                  object: {
                    type: "Identifier",
                    span: {
                      start: 100,
                      end: 106,
                      ctxt: 0,
                    },
                    value: "params",
                    optional: false,
                  },
                  property: {
                    type: "Computed",
                    span: {
                      start: 106,
                      end: 113,
                      ctxt: 0,
                    },
                    expression: {
                      type: "Identifier",
                      span: {
                        start: 107,
                        end: 112,
                        ctxt: 0,
                      },
                      value: "index",
                      optional: false,
                    },
                  },
                },
                alternate: {
                  type: "Identifier",
                  span: {
                    start: 116,
                    end: 127,
                    ctxt: 0,
                  },
                  value: "defaultValue",
                  optional: false,
                },
              },
            },
          },
        ],
      },
      generator: false,
      async: false,
      typeParameters: undefined,
      returnType: undefined,
    };
  }