"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/card";
import type { Feature } from "@/lib/types/home";

export function FeatureCard({ feature }: { feature: Feature }) {
  const { t } = useTranslation();
  return <Card className={`mh-feature-card mh-feature-card--${feature.id}${feature.highlight ? " mh-feature-card--highlight" : ""}`}><FontAwesomeIcon className="mh-feature-card__icon" icon={feature.icon} /><h3>{t(feature.titleKey)}</h3><p>{t(feature.descriptionKey)}</p>{feature.highlight ? <span className="mh-feature-card__tag">{t("features.audit")}</span> : null}</Card>;
}
