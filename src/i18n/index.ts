import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { useLanguageStore } from '@/store/languageStore';

// Import translation files
import en from './locales/en.json';
import fr from './locales/fr.json';

// Get saved language from store, or use device locale
const getInitialLanguage = () => {
  const savedLanguage = useLanguageStore.getState().language;
  if (savedLanguage) {
    return savedLanguage;
  }
  
  // Get device locale
  const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
  
  // Map to supported languages
  const supportedLanguages = ['en', 'fr'];
  return supportedLanguages.includes(deviceLocale) ? deviceLocale : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4', // For React Native compatibility
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

// Listen to language changes from store
useLanguageStore.subscribe((state) => {
  if (state.language && i18n.language !== state.language) {
    i18n.changeLanguage(state.language);
  }
});

export default i18n;



