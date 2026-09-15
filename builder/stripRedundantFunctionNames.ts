type StripOptions = {
  stripAllNamedExpressions?: boolean;
};

const DECLARATOR_PATTERN =
  /\b(var|let|const)\s+(\w+)\s*=\s*function\s+\2\s*\(/g;

const ASSIGNMENT_PATTERN = /\b(\w+)\s*=\s*function\s+\1\s*\(/g;

const OBJECT_METHOD_PATTERN = /\b(\w+)\s*:\s*function\s+\1\s*\(/g;

const ANY_OBJECT_METHOD_PATTERN = /:\s*function\s+\w+\s*\(/g;

const ANY_ASSIGNMENT_PATTERN = /=\s*function\s+\w+\s*\(/g;

export function stripRedundantFunctionNames(
  code: string,
  options: StripOptions = {},
): string {
  const stripped = code
    .replace(DECLARATOR_PATTERN, "$1 $2 = function(")
    .replace(ASSIGNMENT_PATTERN, "$1 = function(")
    .replace(OBJECT_METHOD_PATTERN, "$1: function(");

  if (!options.stripAllNamedExpressions) {
    return stripped;
  }

  return stripped
    .replace(ANY_OBJECT_METHOD_PATTERN, ": function(")
    .replace(ANY_ASSIGNMENT_PATTERN, "= function(");
}
