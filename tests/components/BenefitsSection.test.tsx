import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BenefitsSection } from "@/components/home/Benefits/BenefitsSection";
import { benefits } from "@/lib/data/benefits";
import i18n from "@/lib/i18n/config";
import { TestProviders } from "../test-utils";

describe("BenefitsSection", () => { beforeEach(() => { void i18n.changeLanguage("pt-BR"); }); it("renders every data item", () => { render(<TestProviders><BenefitsSection /></TestProviders>); expect(screen.getAllByRole("listitem")).toHaveLength(benefits.length); }); });
