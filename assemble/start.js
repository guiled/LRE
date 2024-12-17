let context;
let errExclFirstLine, errExclLastLine;
try {
  null();
} catch (e) {
  errExclFirstLine = e.trace[0].loc.start.line;
}

function instanceOf(a, b) {
  return a instanceof b;
}

function def(args, idx, val) {
  return args.length < idx + 1 || typeof args[idx] === "undefined"
    ? val : args[idx];
}

function ct(name) {
  return {
    name: name,
  };
}
