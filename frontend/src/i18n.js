import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from './config';

import enTranslation from './locales/en.json';
import taTranslation from './locales/ta.json';

const resources = {
    en: {
        translation: enTranslation,
    },
    ta: {
        translation: taTranslation,
    }
};

// Get saved language from localStorage or use default
const getSavedLanguage = () => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        return saved;
    }
    return DEFAULT_LANGUAGE;
};

// Hook to persist language changes
const persistLanguageChange = (lng) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: getSavedLanguage(), // Load from localStorage
        fallbackLng: DEFAULT_LANGUAGE,
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    })
    .then(() => {
        // Listen for language changes and persist
        i18n.on('languageChanged', (lng) => {
            persistLanguageChange(lng);
        });
    });

export default i18n;
