import { Span, NullLiteral } from "@swc/core"

type Null_Param = {
    span: Span,
}

export default ({span} : Null_Param): NullLiteral => {
    return {
        type: "NullLiteral",
        span,
    };
}