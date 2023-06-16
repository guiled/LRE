export function handleError(e: LetsRole.Error, additionals?: unknown) {
  const trace = e?.trace || [];
  const last = trace.find(function (t) {
    return (
      t?.loc?.start?.line < errExclFirstLine ||
      t?.loc?.start?.line > errExclLastLine
    );
  });
  let start = 0,
    end = 0;
  if (last?.loc?.start && last?.loc?.end) {
    start = last.loc.start.line;
    end = last.loc.end.line;
  }
  let sMessage = "Error found ";
  if (start !== end) {
    sMessage += `between lines ${start} and ${end}`;
  } else {
    sMessage += `at line ${start}`;
  }
  sMessage += ` => ${e.name}: ${e.message}`;
  lre.error(sMessage);
  if (arguments.length > 1) {
    lre.error(`Additional information : ${additionals}`);
  }
}
