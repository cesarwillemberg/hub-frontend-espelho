"use client";

import { Section } from "@/components/shared/Section";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { features } from "@/lib/data/features";

import { FeatureCard } from "./FeatureCard";

export function FeaturesSection() {
  return <Section id="recursos" className="mh-features"><div className="mh-container"><SectionHeading eyebrowKey="features.eyebrow" titleKey="features.title" className="mh-features__heading" /><div className="mh-features__grid">{features.map((feature) => <FeatureCard key={feature.id} feature={feature} />)}</div></div></Section>;
}
