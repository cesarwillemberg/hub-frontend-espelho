"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

export function AppControls() {
  const { i18n, t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  // No SSR, resolvedTheme é undefined. Só considera o tema real após a montagem
  // no cliente, garantindo que server e cliente hidratem o mesmo ícone.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const languages = [
    { code: "pt-BR", shortLabel: "PT", countryCode: "BR" },
    { code: "en", shortLabel: "EN", countryCode: "US" },
    { code: "es", shortLabel: "ES", countryCode: "ES" },
  ];
  const activeLanguage = languages.find(({ code }) => code === i18n.language) ?? languages[0];

  function changeLanguage(language: string) {
    void i18n.changeLanguage(language);
    setIsLanguageMenuOpen(false);
  }

  return <div className="mh-header-controls">
    <div className="mh-language-picker">
      <button type="button" className="mh-language-trigger" aria-label={t("navigation.language")} aria-expanded={isLanguageMenuOpen} onClick={() => setIsLanguageMenuOpen((isOpen) => !isOpen)}>
        <Image src={`https://flagsapi.com/${activeLanguage.countryCode}/flat/32.png`} alt="" width="20" height="15" />
        <span>{activeLanguage.shortLabel}</span><FontAwesomeIcon className="mh-language-trigger__chevron" icon={faChevronDown} />
      </button>
      {isLanguageMenuOpen ? <div className="mh-language-menu" role="menu">
        {languages.map((language) => <button key={language.code} type="button" role="menuitem" onClick={() => changeLanguage(language.code)}>
          <Image src={`https://flagsapi.com/${language.countryCode}/flat/32.png`} alt="" width="20" height="15" />
          <span>{language.shortLabel}</span>
        </button>)}
      </div> : null}
    </div>
    <Button type="button" variant="ghost" size="icon" aria-label={t("navigation.theme")} onClick={() => setTheme(isDark ? "light" : "dark")}>
      <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
    </Button>
  </div>;
}
