let context;
let errExclFirstLine, errExclLastLine;
try {
  null();
} catch (e) {
  errExclFirstLine = e.trace[0].loc.start.line;
}

function iOf(a, b) {
  return a instanceof b;
}

function def(args, idx, val) {
  return args.length < idx + 1 || tpo(args[idx], 1) ? val : args[idx];
}

function ct(name) {
  return {
    name: name,
  };
}

function la() {
  return Array.from(arguments).at(-1);
}

const types = [
  "",
  "undefined",
  "string",
  "object",
  "function",
  "number",
  "boolean",
];
function tpo(val, idx) {
  if (idx > 0) {
    return typeof val === types[idx];
  }
  return typeof val !== types[-idx];
}
