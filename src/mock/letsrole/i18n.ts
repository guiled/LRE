let currentLang: string = "en";

export function setLang(lang: string): void {
  currentLang = lang;
}

export function i18n(
  data: LetsRoleMock.SystemDefinitions["i18n"],
): LetsRole.i18n {
  currentLang = "en";

  if (!data) {
    return (text: string): string => text;
  }

  return (text: string): string => {
    let lang = currentLang;
    const defaultLang = data.defaultLang;

    if (!data.translations[lang]) {
      lang = defaultLang;
    } else if (!data.translations[lang][text]) {
      lang = defaultLang;
    }

    if (lang === defaultLang) {
      return text;
    }

    return data.translations[lang][text] || text;
  };
}
