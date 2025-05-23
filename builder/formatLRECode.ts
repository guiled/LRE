import {
  FontCharSpace,
  FontCharUnderlineHeight,
  FontCharWidth,
  FontHeight,
  FontLineSpace,
  TextLineDefs,
  ascii,
  asciiWidth,
  logoLR,
  logoWidth,
} from "./characters";

function getPaddedCodeWithUselessCode(
  codeParts: Array<string>,
  length: number,
  previousWith = " ",
  semicolonFillerOk = true,
): string {
  const tmpResult = [...codeParts];

  if (tmpResult.length === 0) {
    tmpResult.push("");
  }

  let totalLength: number = tmpResult.reduce((acc, val) => acc + val.length, 0);

  while (totalLength < length) {
    let remainingLength = length - totalLength;

    // remainingLength < 5 for security because in the "else" part, we can need 5 characters to add a space + /**/
    if (remainingLength < 5) {
      let partIdsContainingSemiColon = tmpResult.map((part, index) =>
        part.includes(";") && !codeParts[index + 1]?.match(/\W*else\W*/)
          ? index
          : -1,
      );
      partIdsContainingSemiColon = partIdsContainingSemiColon.filter(
        (index) => index !== -1,
      );

      if (semicolonFillerOk && partIdsContainingSemiColon.length > 0) {
        tmpResult[
          partIdsContainingSemiColon[
            Math.floor(Math.random() * partIdsContainingSemiColon.length)
          ]
        ] += ";";
      } else {
        tmpResult[Math.floor(Math.random() * tmpResult.length)] += previousWith;
      }
    } else {
      let randomPartIndex: number;
      let cnt = 0;
      const maxTries = 10;

      // this part prevent to add a comment like /**/ just after a / (division operator)
      do {
        randomPartIndex = Math.floor(Math.random() * tmpResult.length);
        cnt++;
      } while (cnt < maxTries && tmpResult[randomPartIndex].match(/\//));

      if (cnt >= maxTries) {
        tmpResult[randomPartIndex] += " ";
        remainingLength--;
      }

      if (remainingLength === 4) {
        tmpResult[randomPartIndex] += "/**/";
      } else {
        const uselessCode =
          "/*" +
          Math.random()
            .toString(36)
            .substring(2, 2 + Math.min(5, remainingLength - 4)) +
          "*/";
        tmpResult[randomPartIndex] += uselessCode;
      }
    }

    totalLength = tmpResult.reduce((acc, val) => acc + val.length, 0);
  }

  return tmpResult.join("");
}

export const formatLRECode = (
  code: string,
  insertAsciiArts = false,
): string => {
  [
    /^\s*(.*)/gm, // remove spaces from line starts
    /\n+\s*(\n)/g, // remove multiple line breaks
    /([{[])\n+\s*/g, // remove spaces after opening brackets
    /\n+\s*([}\]]\)?;?)/g, // remove spaces before opening brackets
    /((?=^.*,)(?!^.+[:;]).+?)\n[\s\n]*/gm,
    /[ \t]*([^\s\w"'$]+)[ \t]*/g,
  ].forEach((e) => (code = code.replace(e, "$1")));

  const MAX_LINE_LENGTH = 131;
  const lines: Array<string> = [""];
  const compiledTextLines: TextLineDefs = [];

  if (insertAsciiArts) {
    const insertedAsciiLines: Array<string> = [
      "LRE",
      process.env.npm_package_version || "",
      "by",
      "Guile",
    ];
    insertedAsciiLines.forEach((text: string, index: number) => {
      if (text.length === 0) {
        return;
      }

      for (
        let i = 0;
        i < FontLineSpace - (index === 0 ? 0 : FontCharUnderlineHeight);
        i++
      ) {
        compiledTextLines.push([]);
      }

      const topTextPosition = compiledTextLines.length;
      let textWith = 0;
      text.split("").forEach((char: string) => {
        textWith += asciiWidth[char] || FontCharWidth;
      });
      const wordLeftMargin = Math.floor(
        (MAX_LINE_LENGTH - textWith - (text.length - 1) * FontCharSpace) / 2,
      );

      for (let i = 0; i < FontHeight + FontCharUnderlineHeight; i++) {
        compiledTextLines.push([wordLeftMargin]);
      }

      text.split("").forEach((char: string, index: number) => {
        const currentCharDef = ascii[char];

        if (!currentCharDef) {
          throw new Error(`Character ${char} not found in ascii`);
        }

        for (let i = 0; i < FontHeight + FontCharUnderlineHeight; i++) {
          const charLineDef = currentCharDef[i] || [];
          const totalCharLineLength = charLineDef.reduce(
            (acc: number, val: string | number) => {
              return acc + (typeof val === "string" ? val.length : val);
            },
            0,
          );
          const lastCompiledLine =
            compiledTextLines[topTextPosition + i][
              compiledTextLines[topTextPosition + i].length - 1
            ];
          const letterSpaceDef =
            index < text.length - 1
              ? [
                  (asciiWidth[char] || FontCharWidth) -
                    totalCharLineLength +
                    FontCharSpace,
                ]
              : [];

          if (
            typeof charLineDef[0] === "number" &&
            typeof lastCompiledLine === "number"
          ) {
            compiledTextLines[topTextPosition + i][
              compiledTextLines[topTextPosition + i].length - 1
            ] = (lastCompiledLine + charLineDef[0]) as number;
            compiledTextLines[topTextPosition + i] = compiledTextLines[
              topTextPosition + i
            ].concat(charLineDef.slice(1), letterSpaceDef);
          } else {
            compiledTextLines[topTextPosition + i] = compiledTextLines[
              topTextPosition + i
            ].concat(charLineDef, letterSpaceDef);
          }
        }
      });
    });

    for (let i = 0; i < 100; i++) {
      compiledTextLines.push([]);
    }

    const logoLeftMargin = Math.floor(MAX_LINE_LENGTH - logoWidth) / 2;

    logoLR.forEach((line: Array<number | string>) => {
      compiledTextLines.push(
        ([logoLeftMargin] as Array<number | string>).concat(line),
      );
    });

    compiledTextLines.forEach((line: Array<number | string>, idx: number) => {
      compiledTextLines[idx] = line.reduce(
        (acc: Array<number | string>, val: number | string) => {
          if (
            typeof val === "number" &&
            typeof acc[acc.length - 1] === "number"
          ) {
            acc[acc.length - 1] = (acc[acc.length - 1] as number) + val;
          } else {
            acc.push(val);
          }

          return acc;
        },
        [] as Array<number | string>,
      );
    });
  }

  const codeParts: Array<string> =
    code.match(
      /(?:return[\t [({;!-])?(?:\/(?:\\\/|[^/\n])+\/(?:[smudgy]|[iv])*|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[^`\\]*)*`|\/\/.*|\/\*[\s\S]*?\*\/|(?:\+=|-=|\*=|\/=|%=|===?|!==?|>=|<=|>|<|&&|\|\||\?:|&|\||\^|~|<<|>>|>>>|\?)|[\])](?:--|\+\+)?|[[{}(;,.:*+\-/%<>=!&|^~?]|[\w$]+(?:\+\+|--|\s*))/gm,
    ) || [];

  let largestPart = "";

  let currentLine = 0;
  let currentLinePart = 0;
  let awaitingSemicolon = 0;
  let foundSemicolon = 0;

  while (codeParts.length > 0) {
    let targetedLength = MAX_LINE_LENGTH - lines[currentLine].length;

    if (
      currentLine < compiledTextLines.length &&
      compiledTextLines[currentLine].length > 0
    ) {
      if (typeof compiledTextLines[currentLine][currentLinePart] === "string") {
        lines[currentLine] += compiledTextLines[currentLine][currentLinePart];
        currentLinePart++;
        continue;
      } else if (currentLinePart < compiledTextLines[currentLine].length) {
        targetedLength = compiledTextLines[currentLine][
          currentLinePart
        ] as number;
      }
    }

    let takeCodePart = true;
    const lineParts: Array<string> = [];
    let remainingLength = targetedLength;
    let match: Array<string> | null = [];

    while (codeParts.length > 0 && takeCodePart) {
      if (codeParts[0].match(/for/)) {
        awaitingSemicolon = 2;
        foundSemicolon = 0;
      } else if (codeParts[0].match(/;/)) {
        foundSemicolon++;
      }

      if (codeParts[0].length <= remainingLength) {
        remainingLength -= codeParts[0].length;
        lineParts.push(codeParts.shift()!);
        takeCodePart = remainingLength > 0;
      } else if (
        codeParts[0].match(/^["'`]/) &&
        remainingLength >= 3 &&
        !codeParts[0]
          .substring(remainingLength - 2, remainingLength)
          .match(/\\/)
      ) {
        const codePartToExtract = codeParts.shift()!;
        lineParts.push(
          codePartToExtract.substring(0, remainingLength - 1) +
            codePartToExtract[0],
        );
        codeParts.unshift(
          codePartToExtract[0] +
            codePartToExtract.substring(remainingLength - 1),
        );
        codeParts.unshift("+");
        takeCodePart = false;
      } else if (
        (match = codeParts[0].match(/^return (["'])/)) &&
        remainingLength >= 8
      ) {
        const codePartToExtract = codeParts.shift()!;
        lineParts.push(
          "return" +
            match[1] +
            codePartToExtract.substring(8, remainingLength) +
            match[1],
        );
        codeParts.unshift(
          match[1] + codePartToExtract.substring(remainingLength),
        );
        codeParts.unshift("+");
        takeCodePart = false;
      } else {
        takeCodePart = false;
      }
    }

    const nextPart = codeParts[0] || "";
    largestPart = lineParts.reduce((acc: string, value: string) => {
      if (value.length > acc.length) {
        return value;
      }

      return acc;
    }, largestPart);

    if (codeParts.length > 0 || remainingLength < 0.2 * MAX_LINE_LENGTH) {
      lines[currentLine] += getPaddedCodeWithUselessCode(
        lineParts,
        targetedLength,
        " ",
        awaitingSemicolon === 0 && !nextPart.match(/\W*else\W*/),
      );
    } else {
      lines[currentLine] += lineParts.join("");
    }

    if (foundSemicolon >= awaitingSemicolon) {
      awaitingSemicolon = 0;
    }

    currentLinePart++;

    if (currentLinePart > (compiledTextLines[currentLine]?.length || 0)) {
      currentLine++;
      currentLinePart = 0;
      lines.push("");
    }
  }

  return lines.join("\n");
};
