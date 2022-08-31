import { Span, StringLiteral } from "@swc/core"

type String_Param = {
    span: Span,
    value: string,
    raw?: string,
}

export default ({span, value, raw} : String_Param): StringLiteral => {
    return {
        type: "StringLiteral",
        span,
        value,
        raw: raw ?? "'" + value + "'"
    };
}