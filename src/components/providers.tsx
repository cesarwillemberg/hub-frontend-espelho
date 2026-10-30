"use client";

import "@/lib/fontawesome";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { ThemeProvider } from "next-themes";

import { AuthProvider } from "@/lib/auth/auth-context";
import i18n, { defaultLanguage } from "@/lib/i18n/config";

const LANGUAGE_STORAGE_KEY = "marvi-hub-language";
const supportedLanguages = ["pt-BR", "en", "es"];

function detectLanguage() {
  const browserLanguage = window.navigator.language;
  return supportedLanguages.find((language) =>
    browserLanguage.toLowerCase().startsWith(language.toLowerCase().split("-")[0]),
  ) ?? defaultLanguage;
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (!savedLanguage) window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "auto");
    const initialLanguage = savedLanguage === "auto"
      ? detectLanguage()
      : savedLanguage ?? detectLanguage();
    void i18n.changeLanguage(initialLanguage);
    document.documentElement.lang = initialLanguage;

    const handleLanguageChange = (language: string) => {
      document.documentElement.lang = language;
      if (window.localStorage.getItem(LANGUAGE_STORAGE_KEY) !== "auto") {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      }
    };
    i18n.on("languageChanged", handleLanguageChange);
    return () => i18n.off("languageChanged", handleLanguageChange);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>{children}</AuthProvider>
      </I18nextProvider>
    </ThemeProvider>
  );
}

export { defaultLanguage };
