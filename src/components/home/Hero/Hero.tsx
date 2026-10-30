"use client";

import { useTranslation } from "react-i18next";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/Section";

function MarketIllustration() {
  const { t } = useTranslation();
  return <div className="mh-market-art mh-market-art--svg"><Image src="/imgs/public/home/logistics_8vri.svg" alt={t("hero.title")} width={662} height={646} priority /></div>;
}

export function Hero() {
  const { t } = useTranslation();
  return <Section className="mh-hero"><div className="mh-container mh-hero__grid"><div className="mh-hero__content"><p className="mh-hero__eyebrow">{t("hero.eyebrow")}</p><h1 aria-label={t("hero.title")}><span className="mh-hero__title-main">{t("hero.titleMain")}</span><span className="mh-hero__title-highlight">{t("hero.titleHighlight")}</span>{" "}<span className="mh-hero__title-connector">{t("hero.titleConnector")}</span><span className="mh-hero__title-suffix">{t("hero.titleSuffix")}</span></h1><p className="mh-hero__description">{t("hero.subtitle")}</p><div className="mh-hero__actions"><Button asChild><a href="#">{t("hero.primaryCta")}</a></Button><Button asChild variant="outline"><Link href="/login">{t("hero.secondaryCta")}</Link></Button></div></div><MarketIllustration /></div></Section>;
}
