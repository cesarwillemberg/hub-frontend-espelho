"use client";

import { useTranslation } from "react-i18next";

import type { Benefit } from "@/lib/types/home";

export function BenefitItem({ benefit }: { benefit: Benefit }) {
  const { t } = useTranslation();
  return <li className="mh-benefit-item"><h3>{t(benefit.titleKey)}</h3><p>{t(benefit.descriptionKey)}</p></li>;
}
