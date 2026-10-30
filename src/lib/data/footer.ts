import type { FooterColumn } from "@/lib/types/home";

export const footerColumns: FooterColumn[] = [
  { id: "legal", headingKey: "footer.columns.legal.title", links: [{ id: "privacy", href: "#", labelKey: "footer.columns.legal.privacy" }, { id: "terms", href: "#", labelKey: "footer.columns.legal.terms" }] },
  { id: "support", headingKey: "footer.columns.support.title", links: [{ id: "support", href: "#", labelKey: "footer.columns.support.support" }, { id: "status", href: "#", labelKey: "footer.columns.support.status" }] },
  { id: "company", headingKey: "footer.columns.company.title", links: [{ id: "careers", href: "#", labelKey: "footer.columns.company.careers" }, { id: "blog", href: "#", labelKey: "footer.columns.company.blog" }] },
  { id: "resources", headingKey: "footer.columns.resources.title", links: [{ id: "docs", href: "#recursos", labelKey: "footer.columns.resources.docs" }, { id: "api", href: "#", labelKey: "footer.columns.resources.api" }] },
];
