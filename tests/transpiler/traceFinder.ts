const getTraceLine = (tr: LetsRole.ErrorTrace): number | undefined => {
  return tr.loc?.start.line;
};

const getCalleeName = (tr: LetsRole.ErrorTrace): string | undefined => {
  return tr.callee?.name;
};

const isTestRunnerCall = (calleeName: string | undefined): boolean => {
  return (
    calleeName === "runTestCase" ||
    calleeName === "callback" ||
    /^run\d*$/.test(calleeName ?? "")
  );
};

const isInternalTraceFrame = (tr: LetsRole.ErrorTrace): boolean => {
  const calleeName = getCalleeName(tr);

  return calleeName === "throwError" || /^lreExpect\d*$/.test(calleeName ?? "");
};

const findTestLineBounds = (
  trace: Array<LetsRole.ErrorTrace>,
  runIdx: number,
  runTestCaseLine: number,
): { min: number; max: number } | undefined => {
  const threshold = runTestCaseLine + 50;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < runIdx; i++) {
    const tr = trace[i];
    const line = getTraceLine(tr);

    if (line === undefined || line <= threshold) {
      continue;
    }

    min = Math.min(min, line);
    max = Math.max(max, tr.loc!.end.line);
  }

  if (!Number.isFinite(min)) {
    return undefined;
  }

  return { min, max };
};

export const findTestFailureLocation = (
  trace: Array<LetsRole.ErrorTrace>,
  runIdx: number,
): LetsRole.ErrorTrace | undefined => {
  const runTestCaseLine = getTraceLine(trace[runIdx]) ?? 0;
  const bounds = findTestLineBounds(trace, runIdx, runTestCaseLine);

  if (!bounds) {
    return undefined;
  }

  let best: LetsRole.ErrorTrace | undefined;
  let bestLine = -1;

  for (let i = runIdx - 1; i >= 0; i--) {
    const tr = trace[i];
    const line = getTraceLine(tr);

    if (line === undefined || line < bounds.min || line > bounds.max) {
      continue;
    }

    if (isInternalTraceFrame(tr)) {
      continue;
    }

    if (line >= bestLine) {
      bestLine = line;
      best = tr;
    }
  }

  return best;
};

export const findTestTraceLocation = (
  trace: LetsRole.Error["trace"],
): LetsRole.ErrorTrace | undefined => {
  if (!trace?.length) {
    return undefined;
  }

  const runIdx = trace.findIndex(
    (tr) =>
      tr.type === "CallExpression" && isTestRunnerCall(getCalleeName(tr)),
  );

  if (runIdx > 0) {
    const result = findTestFailureLocation(trace, runIdx);

    if (result) {
      return result;
    }
  }

  for (let i = trace.length - 1; i >= 0; i--) {
    const tr = trace[i];

    if (!tr.loc || isInternalTraceFrame(tr)) {
      continue;
    }

    if (tr.type === "CallExpression" && isTestRunnerCall(getCalleeName(tr))) {
      continue;
    }

    return tr;
  }

  return undefined;
};
