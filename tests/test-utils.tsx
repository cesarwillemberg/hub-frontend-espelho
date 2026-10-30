import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { ThemeProvider } from "next-themes";

import i18n from "@/lib/i18n/config";

export function TestProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="light"><I18nextProvider i18n={i18n}>{children}</I18nextProvider></ThemeProvider>;
}
