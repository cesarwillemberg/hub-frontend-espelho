import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Footer } from "@/components/home/Footer/Footer";
import i18n from "@/lib/i18n/config";
import { TestProviders } from "../test-utils";

describe("Footer", () => { beforeEach(() => { void i18n.changeLanguage("pt-BR"); }); it("renders the current year", () => { render(<TestProviders><Footer /></TestProviders>); expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument(); }); });
