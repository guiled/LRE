// import { transformSync } from "@swc/core";
// //import transpileConf, { noVoid0Plugin } from "./transpile.conf";
// //import { diffChars, diffTrimmedLines } from "diff";
// import colors from "colors/safe";
// import colorize from "json-colorizer";
// import { noVoid0Plugin } from "../transpile.conf";

// const mutedConsole = (prefix: string) => {
//   const logs = [prefix];
//   const prevConsole = globalThis.console;
//   return {
//     ...globalThis.console,
//     getLogs: () => logs,
//     dump: () => {
//       logs.forEach((l) => {
//         try {
//           JSON.parse(l);
//           prevConsole.log(colorize(l));
//         } catch (e) {
//           prevConsole.log(l);
//         }
//       });
//     },
//     log: (...args: any[]) => logs.push.apply(logs, args),
//     error: (...args: any[]) => logs.push.apply(logs, args),
//     info: (...args: any[]) => logs.push.apply(logs, args),
//     warn: (...args: any[]) => logs.push.apply(logs, args),
//   };
// };

// type DiffPart = {
//   count: number;
//   value: string;
//   added?: boolean;
//   removed?: boolean;
// };
// const removeSpaceDifferences = (diffs: Array<DiffPart>) => {
//   let lastNoChange: DiffPart;
//   let foundValidChange: boolean = false;
//   return diffs.filter((diff) => {
//     if (!diff.added && !diff.removed) {
//       if (!foundValidChange && lastNoChange) {
//         lastNoChange.value += diff.value;
//         return false;
//       }
//       lastNoChange = diff;
//       foundValidChange = false;
//       return true;
//     }
//     if (diff.value.trim() !== "") {
//       foundValidChange = true;
//       return true;
//     } else {
//       lastNoChange.value += diff.value;
//       return false;
//     }
//   });
// };

[
  {
    input: "_ = a?.b;",
    output: "_ = a == null ? undefined : a.b;",
  },

  {
    input: "_ = a?.b.c;",
    output: "_ = a ? a.b.c : undefined;",
  },
  {
    input: "_ = a?.b.c.d;",
    output: "_ = a ? a.b.c.d : undefined;",
  },
  {
    input: "_ = a?.b?.c;",
    output: `_ = function() {
      var __tmp = a ? a.b : undefined;
      return __tmp ? __tmp.c : undefined;
    }();`,
  },
  {
    input: "_ = a?.b?.c?.d",
    output: `_ = function() {
      var __tmp = function() {
        var __tmp = a ? a.b : undefined;
        return __tmp ? __tmp.c : undefined;
      }();
      return __tmp ? __tmp.d : undefined;
    }();`,
  },
  {
    input: "_ = a?.();",
    output: "_ = a ? a() : undefined;",
  },
  {
    input: "_ = a?.().b;",
    output: "_ = a ? a().b : undefined;",
  },
  {
    input: "_ = a?.().b.c;",
    output: "_ = a ? a().b.c : undefined;",
  },
  {
    input: "_ = a?.().b.c.d;",
    output: "_ = a ? a().b.c.d : undefined;",
  },
  {
    input: "_ = a?.().b.c.d.e;",
    output: "_ = a ? a().b.c.d.e : undefined;",
  },
  {
    input: "_ = a?.b()",
    output: "_ = a ? a.b() : undefined;",
  },
  {
    input: "_ = a?.b.c()",
    output: "_ = a ? a.b.c() : undefined;",
  },
  {
    input: "_ = a?.b.c.d();",
    output: "_ = a ? a.b.c.d() : undefined;",
  },
  {
    input: "_ = a?.b.c.d.e();",
    output: "_ = a ? a.b.c.d.e() : undefined;",
  },
  {
    input: "_ = a?.['b']",
    output: '_ = a ? a["b"] : undefined;',
  },
  {
    input: "_ = a?.['b']['c'].d.e['f']",
    output: '_ = a ? a["b"]["c"].d.e["f"] : undefined;',
  },
  {
    input: "_ = function () { return this.a?.b;}();",
    output: `_ = function () {return this.a ? this.a.b : undefined;}();`,
  },
  {
    input: "_ = function () { return this.a?.b.c.d.e;}();",
    output: `_ = function () {return this.a ? this.a.b.c.d.e : undefined;}();`,
  },
  {
    input: "_ = a.b?.c",
    output: `_ = a.b ? a.b.c : undefined;`,
  },
  {
    input: "_ = a.b?.c.d.e;",
    output: `_ = a.b ? a.b.c.d.e : undefined;`,
  },
  {
    input: "_ = a?.b['c'];",
    output: `_ = a ? a.b["c"] : undefined;`,
  },
  {
    input: "_ = a.b?.()",
    output: `_ = a.b && a.b.call ? a.b() : undefined;`,
  },
  {
    input: "_ = a.b?.().c.d.e",
    output: `_ = a.b && a.b.call ? a.b().c.d.e : undefined;`,
  },
  {
    input: "_ = a.b.c();",
    output: `_ = a.b.c();`,
  },
  {
    input: "_ = a.b?.c()",
    output: `_ = a.b ? a.b.c() : undefined;`,
  },
  {
    input: "_ = a.b?.c().d.e;",
    output: `_ = a.b ? a.b.c().d.e : undefined;`,
  },
  {
    input: "_ = a['b'].c?.d;",
    output: `_ = function () {
      var __tmp = a["b"].c;
      return __tmp ? __tmp.d : undefined;
    }();`,
  },
  {
    input: "_ = a['b'].c?.d.e.f.g;",
    output: `_ = function () {
      var __tmp = a["b"].c;
      return __tmp ? __tmp.d.e.f.g : undefined;
    }();`,
  },
  {
     input: "const {a = 2} = toto;",
     output: `var a = typeof toto.a !== "undefined" ? toto.a : 2;`
  },
].forEach(() => {
  // var oldConsole = console;
  // let res;
  // try {
  //   var logger = mutedConsole(`Test ${i} ${input}`);
  //   globalThis.console = logger;
  //   res = transformSync(input, transpileConf);
  //   res = transformSync(res.code, noVoid0Plugin)
  //   const diff = removeSpaceDifferences(diffChars(output, res.code.trim()));
  //   if (diff.length > 1) {
  //     const logs = console.getLogs();
  //     globalThis.console = oldConsole;
  //     console.error(colors.red.bold(`Test ${i} failed`));
  //     let diffStr = "";
  //     diff.forEach((part) => {
  //       // green for additions, red for deletions
  //       // grey for common parts
  //       const color = part.added
  //         ? colors.green.bold
  //         : part.removed
  //         ? colors.red.bold
  //         : colors.gray;
  //       diffStr += color(part.value);
  //     });
  //     console.error(diffStr);
  //     logger.dump();
  //   }
  //   globalThis.console = oldConsole;
  // } catch (e) {
  //   const logs = console.getLogs();
  //   globalThis.console = oldConsole;
  //   console.error(colors.red.bold(`Test ${i} failed with errors`));
  //   console.error(e);
  //   logger.dump();
  // }
});
