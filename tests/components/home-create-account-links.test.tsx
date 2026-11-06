import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { CtaSection } from "@/components/home/CallToAction/CtaSection";
import { Header } from "@/components/home/Header/Header";
import { Hero } from "@/components/home/Hero/Hero";
import i18n from "@/lib/i18n/config";
import { TestProviders } from "../test-utils";

describe("home create account links", () => {
  beforeEach(() => {
    void i18n.changeLanguage("pt-BR");
  });

  it("points every Criar conta link to /criar-conta", () => {
    render(
      <TestProviders>
        <Header />
        <Hero />
        <CtaSection />
      </TestProviders>,
    );

    const desktopAndCta = screen.getAllByRole("link", { name: "Criar conta" });
    const hero = screen.getByRole("link", { name: "Criar conta grátis" });
    expect(desktopAndCta).toHaveLength(2);
    [...desktopAndCta, hero].forEach((link) => {
      expect(link).toHaveAttribute("href", "/criar-conta");
    });

    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    const withMobile = screen.getAllByRole("link", { name: "Criar conta" });
    expect(withMobile).toHaveLength(3);
    withMobile.forEach((link) => {
      expect(link).toHaveAttribute("href", "/criar-conta");
    });

    const mobileLink = withMobile.find((link) => link.closest(".mh-mobile-menu"));
    expect(mobileLink).toBeTruthy();
    fireEvent.click(mobileLink!);
    expect(screen.getAllByRole("navigation", { name: "Abrir menu" })).toHaveLength(1);
  });
});
