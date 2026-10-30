"use client";

import { faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/shared/Section";
import { SectionHeading } from "@/components/shared/SectionHeading";

export function SecuritySection() {
  const { t } = useTranslation();
  return <Section id="seguranca" className="mh-security"><div className="mh-container mh-security__grid"><SectionHeading eyebrowKey="security.eyebrow" titleKey="security.title" /><p>{t("security.description")}</p><div className="mh-security__stamp" aria-hidden="true"><FontAwesomeIcon icon={faShieldHalved} /></div></div></Section>;
}
