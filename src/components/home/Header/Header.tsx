"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCartShopping, faXmark } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppControls } from "@/components/shared/AppControls";
import { Button } from "@/components/ui/button";
import { navLinks } from "@/lib/data/nav-links";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();
  const closeMenu = () => setIsMenuOpen(false);

  return <header className="mh-header" id="top">
    <div className="mh-container mh-header__inner">
      <a className="mh-brand" href="#top" aria-label="Marvi Hub"><span className="mh-brand__icon"><FontAwesomeIcon icon={faCartShopping} /></span><span>Marvi Hub</span></a>
      <nav className="mh-nav" aria-label={t("navigation.menu")}>
        {navLinks.map((link) => <a key={link.id} href={link.href}>{t(link.labelKey)}</a>)}
      </nav>
      <div className="mh-header__actions"><AppControls /><Button asChild variant="outline" size="compact"><Link href="/login">{t("navigation.enter")}</Link></Button><Button asChild size="compact"><Link href="/criar-conta">{t("navigation.createAccount")}</Link></Button></div>
      <Button type="button" variant="ghost" size="icon" className="mh-menu-button" aria-label={t("navigation.menu")} aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((value) => !value)}><FontAwesomeIcon icon={isMenuOpen ? faXmark : faBars} /></Button>
    </div>
    {isMenuOpen ? <div className="mh-mobile-menu"><nav aria-label={t("navigation.menu")}>{navLinks.map((link) => <a key={link.id} href={link.href} onClick={closeMenu}>{t(link.labelKey)}</a>)}</nav><div className="mh-mobile-menu__controls"><AppControls /><Button asChild variant="outline"><Link href="/login" onClick={closeMenu}>{t("navigation.enter")}</Link></Button><Button asChild><Link href="/criar-conta" onClick={closeMenu}>{t("navigation.createAccount")}</Link></Button></div></div> : null}
  </header>;
}
