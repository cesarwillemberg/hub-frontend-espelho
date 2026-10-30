import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/lib/i18n/locales/en.json";
import es from "@/lib/i18n/locales/es.json";
import ptBR from "@/lib/i18n/locales/pt-br.json";

export const defaultLanguage = "pt-BR";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { "pt-BR": { translation: ptBR }, en: { translation: en }, es: { translation: es } },
    lng: defaultLanguage,
    fallbackLng: defaultLanguage,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
