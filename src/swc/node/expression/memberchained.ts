import { Identifier, MemberExpression, Span } from "@swc/core";
import identifier from "../identifier";
import member from "./member";

type Member_Type = {
    span: Span;
    properties: [Identifier["value"], Identifier["value"], ...Identifier["value"][]];
}

export default function memberchained({span, properties} : Member_Type): MemberExpression {
    let obj = member({
        span,
        object: identifier({span, value: properties[0]}),
        property: identifier({span, value: properties[1]}),
    });
    let index = 2;
    while (index < properties.length) {
        let p = properties[2];
        obj = member({
            span,
            object: obj,
            property: identifier({span, value: p}),
        });
    }
    return obj;
};