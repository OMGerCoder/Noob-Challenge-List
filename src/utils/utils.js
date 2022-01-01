class Utilities {
    static getString(id, lang) {
        const i18n = require("./i18n.json");
        if (!i18n[lang]) throw new LocalisationError("[INVALID_LANG] An invalid language was provided.");
        if (!i18n[lang][id]) throw new LocalisationError("[INVALID_STRING] An invalid string ID was provided.");
        return i18n[lang][id];
    }
    static getLocale(lang) {
        const i18n = require("./i18n.json");
        if (!i18n[lang]) throw new LocalisationError("[INVALID_LANG] An invalid language was provided.");
        return i18n[lang];
    }
}

class LocalisationError extends Error {
    constructor(error) {
        super(error);
        this.name = "LocalisationError";
    }
}
module.exports = Utilities;
