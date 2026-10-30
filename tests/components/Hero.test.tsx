import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Hero } from "@/components/home/Hero/Hero";
import i18n from "@/lib/i18n/config";
import { TestProviders } from "../test-utils";

describe("Hero", () => { beforeEach(() => { void i18n.changeLanguage("pt-BR"); }); it("renders translated copy and calls to action", () => { render(<TestProviders><Hero /></TestProviders>); expect(screen.getByRole("heading", { name: "Gestão inteligente para supermercados" })).toBeInTheDocument(); expect(screen.getByText("Criar conta grátis")).toBeInTheDocument(); expect(screen.getByText("Entrar no Hub")).toBeInTheDocument(); }); });
