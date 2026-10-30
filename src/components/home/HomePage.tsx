"use client";

import { BenefitsSection } from "@/components/home/Benefits/BenefitsSection";
import { CtaSection } from "@/components/home/CallToAction/CtaSection";
import { FeaturesSection } from "@/components/home/Features/FeaturesSection";
import { Footer } from "@/components/home/Footer/Footer";
import { Header } from "@/components/home/Header/Header";
import { Hero } from "@/components/home/Hero/Hero";
import { SecuritySection } from "@/components/home/Security/SecuritySection";
import { AnimeScrollAccent } from "@/components/shared/AnimeScrollAccent";
import { ScrollReveal } from "@/components/shared/ScrollReveal";

export function HomePage() {
  return <div className="mh-page"><Header /><main><ScrollReveal eager><Hero /></ScrollReveal><ScrollReveal delay={0.05}><FeaturesSection /></ScrollReveal><AnimeScrollAccent><BenefitsSection /></AnimeScrollAccent><ScrollReveal><SecuritySection /></ScrollReveal><ScrollReveal><CtaSection /></ScrollReveal></main><ScrollReveal><Footer /></ScrollReveal></div>;
}
