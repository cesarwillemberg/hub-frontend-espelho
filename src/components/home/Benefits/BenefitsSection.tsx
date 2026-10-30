"use client";

import { useTranslation } from "react-i18next";

import { Section } from "@/components/shared/Section";
import { benefits } from "@/lib/data/benefits";

import { BenefitItem } from "./BenefitItem";

function BenefitsChart() { return <div className="mh-benefits-chart" aria-hidden="true"><div className="mh-benefits-chart__bars"><i /><i /><i /><i /><i /><i /></div><svg viewBox="0 0 300 70" preserveAspectRatio="none"><polyline points="0,52 50,40 100,46 150,22 200,30 250,12 300,18" /><circle cx="50" cy="40" r="3.5" /><circle cx="150" cy="22" r="3.5" /><circle cx="250" cy="12" r="3.5" /></svg></div>; }

export function BenefitsSection() {
  const { t } = useTranslation();
  return <Section id="beneficios" className="mh-benefits"><div className="mh-container mh-benefits__grid"><div><h2 className="mh-section-title">{t("benefits.title")}</h2><ul className="mh-benefits__list">{benefits.map((benefit) => <BenefitItem key={benefit.id} benefit={benefit} />)}</ul></div><BenefitsChart /></div></Section>;
}
