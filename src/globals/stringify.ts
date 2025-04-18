const _stringify = function <T>(
  obj: T,
  indent: string | boolean = "",
  treatedObject: Array<unknown> = [],
): string | undefined {
  if (typeof obj === "undefined") return undefined;
  const indent_ =
    indent === false ? "" : (indent === true ? "" : indent) + "  ";
  const newLine = typeof indent === "string" || indent === true ? "\n" : "";

  const recursive = function (obj: unknown): string | undefined {
    return _stringify(obj, indent === false ? false : indent_, treatedObject);
  };

  if (
    typeof obj !== "object" ||
    obj === null ||
    Array.isArray(obj) ||
    obj instanceof Date
  ) {
    if (typeof obj === "function") {
      return '"function(){}"';
    } else if (typeof obj === "string") {
      return (
        '"' +
        obj.replace(/\\/g, "\\\\").replace('"', '\\"').replace("\n", "\\n") +
        '"'
      );
    } else if (typeof obj === "number" || typeof obj === "boolean") {
      return "" + obj;
    } else if (typeof obj === "object") {
      if (obj instanceof Date) return '"' + obj.toISOString() + '"';

      if (Array.isArray(obj)) {
        if (treatedObject.some((o) => o === obj)) {
          return '"[recursive]"';
        }

        treatedObject.push(obj);
        let result = "[" + newLine + indent_;
        result += obj
          .map((v: unknown) => {
            //if (("" + indent).length > 8) return "nope"
            const r = recursive(v);

            if (typeof r === "undefined") {
              return "null";
            }

            return r;
          })
          .join("," + newLine + indent_);
        result +=
          newLine + (indent === false || indent === true ? "" : indent) + "]";
        treatedObject.pop();
        return result;
      }

      if (obj === null) return "null";
    }
  }

  if (treatedObject.some((o) => o === obj)) {
    return '"{recursive}"';
  }

  treatedObject.push(obj);
  const strArray: Array<string> = Object.keys(obj).map(function (k) {
    return (
      indent_ +
      '"' +
      k +
      '":' +
      (indent === false ? "" : " ") +
      recursive(obj[k as keyof T])
    );
  });
  const result: string =
    "{" +
    newLine +
    strArray.join("," + newLine) +
    newLine +
    (indent === true || indent === false ? "" : indent) +
    "}";
  treatedObject.pop();
  return result;
};

export const stringify = (obj: unknown, indent?: boolean): string | undefined =>
  _stringify(obj, indent ?? "");
