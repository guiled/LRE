import { Expression, ReturnStatement, Span } from "@swc/core"

type Return_Parameter = {
    span: Span,
    argument?: Expression,
};

export default ({span, argument = undefined} : Return_Parameter): ReturnStatement => {
    return {
        type: "ReturnStatement",
        span,
        argument,
    }
}