import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { Header } from "@/components/home/Header/Header";
import i18n from "@/lib/i18n/config";
import { TestProviders } from "../test-utils";

describe("Header", () => {
  beforeEach(() => { void i18n.changeLanguage("pt-BR"); });
  it("renders brand and navigation links", () => {
    const { container } = render(<TestProviders><Header /></TestProviders>);
    expect(screen.getByText("Marvi Hub")).toBeInTheDocument();
    expect(container.querySelector("img")?.getAttribute("src")).toContain("flagsapi.com");
    ["Recursos", "Benefícios", "Segurança"].forEach((label) => expect(screen.getAllByText(label).length).toBeGreaterThan(0));
  });
  it("opens and closes the mobile menu", () => {
    render(<TestProviders><Header /></TestProviders>);
    const menu = screen.getByRole("button", { name: "Abrir menu" });
    fireEvent.click(menu);
    expect(screen.getAllByRole("navigation", { name: "Abrir menu" })).toHaveLength(2);
    fireEvent.click(menu);
    expect(screen.queryAllByRole("navigation", { name: "Abrir menu" })).toHaveLength(1);
  });
});
