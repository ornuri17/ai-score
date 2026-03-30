import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from '../locales/en/translation.json';
import frTranslation from '../locales/fr/translation.json';
import deTranslation from '../locales/de/translation.json';
import esTranslation from '../locales/es/translation.json';
import heTranslation from '../locales/he/translation.json';
import ruTranslation from '../locales/ru/translation.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
    fr: { translation: frTranslation },
    de: { translation: deTranslation },
    es: { translation: esTranslation },
    he: { translation: heTranslation },
    ru: { translation: ruTranslation },
  },
  lng: localStorage.getItem('language') || navigator.language.split('-')[0] || 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
