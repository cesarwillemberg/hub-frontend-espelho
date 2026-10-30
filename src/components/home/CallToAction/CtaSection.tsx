"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/Section";

export function CtaSection() {
  const { t } = useTranslation();
  return <Section className="mh-cta-section"><div className="mh-container"><div className="mh-cta"><h2>{t("cta.title")}</h2><div className="mh-cta__actions"><Button asChild variant="inverse"><a href="#">{t("cta.primary")}</a></Button><Button asChild variant="outline" className="mh-cta__outline"><Link href="/login">{t("cta.secondary")}</Link></Button></div></div></div></Section>;
}
