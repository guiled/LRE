import { MemberExpression, Span } from "@swc/core";

type Member_Type = {
    span: Span,
    object: MemberExpression["object"],
    property: MemberExpression["property"]
}

export default function member({span, object, property}: Member_Type): MemberExpression {
    return {
        type: "MemberExpression",
        span,
        object,
        property
    }
};