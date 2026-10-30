import type { Metadata } from "next";

import "@fortawesome/fontawesome-svg-core/styles.css";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Marvi Hub | Gestão inteligente para supermercados",
  description: "A plataforma que centraliza a gestão do seu supermercado.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning data-scroll-behavior="smooth" className="h-full antialiased"><body className="min-h-full"><Providers>{children}</Providers></body></html>;
}
