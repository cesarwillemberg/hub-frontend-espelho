import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { FeatureCard } from "@/components/home/Features/FeatureCard";
import { features } from "@/lib/data/features";
import i18n from "@/lib/i18n/config";
import { TestProviders } from "../test-utils";

describe("FeatureCard", () => { beforeEach(() => { void i18n.changeLanguage("pt-BR"); }); it("renders highlighted feature content", () => { const feature = features.find(({ id }) => id === "users")!; const { container } = render(<TestProviders><FeatureCard feature={feature} /></TestProviders>); expect(screen.getByText("Usuários")).toBeInTheDocument(); expect(container.querySelector(".mh-feature-card--highlight")).toBeInTheDocument(); }); });
