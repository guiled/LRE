import Sheet from "./sheet";
var lre;
(() => {
  lre = function (callback: LetsRole.InitCallback) {
    return (rawsheet: LetsRole.Sheet) => {
      const s = new Sheet(rawsheet);

      callback(s);
    };
  };
})();