import * as acorn from "acorn";
import { simple } from "acorn-walk";

const STATEMENT_TYPES = [
  "ExpressionStatement",
  "ReturnStatement",
  "ThrowStatement",
  "BreakStatement",
  "ContinueStatement",
  "DebuggerStatement",
  "VariableDeclaration",
  "IfStatement",
  "SwitchStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "WithStatement",
  "TryStatement",
  "LabeledStatement",
  "FunctionDeclaration",
  "ClassDeclaration",
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "ExportAllDeclaration",
] as const;

function isRegionMarker(line: string): boolean {
  return /^\s*\/\/(?:region|endregion)\b/.test(line);
}

function isCommentLine(line: string): boolean {
  return /^\s*(?:\/\/|\/\*|\*)/.test(line);
}

export function shouldSkipTraceLine(line: string): boolean {
  if (!line.trim()) {
    return true;
  }

  return isRegionMarker(line) || isCommentLine(line);
}

function collectStatementLines(code: string): Set<number> {
  const ast = acorn.parse(code, {
    ecmaVersion: "latest",
    sourceType: "script",
    locations: true,
    allowReturnOutsideFunction: true,
  });

  const statementLines = new Set<number>();
  const visitors = Object.fromEntries(
    STATEMENT_TYPES.map((type) => [
      type,
      (node: acorn.Node) => {
        statementLines.add(node.loc!.start.line);
      },
    ]),
  ) as Record<string, (node: acorn.Node) => void>;

  simple(ast, visitors);

  return statementLines;
}

function instrumentLine(line: string, lineNumber: number): string {
  const indent = line.match(/^\s*/)?.[0] ?? "";
  const content = line.slice(indent.length);
  const elseMatch = content.match(/^else\b(\s*)/);

  if (elseMatch) {
    const rest = content.slice(elseMatch[0].length);

    return `${indent}else log(${lineNumber});${elseMatch[1]}${rest}`;
  }

  return `${indent}log(${lineNumber}); ${content}`;
}

export function instrumentTraceLog(code: string): string {
  const statementLines = collectStatementLines(code);
  const lines = code.split("\n");

  return lines
    .map((line, index) => {
      const lineNumber = index + 1;

      if (!statementLines.has(lineNumber) || shouldSkipTraceLine(line)) {
        return line;
      }

      return instrumentLine(line, lineNumber);
    })
    .join("\n");
}
