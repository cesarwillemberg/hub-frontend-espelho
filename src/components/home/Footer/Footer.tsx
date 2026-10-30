"use client";

import { useTranslation } from "react-i18next";

import { footerColumns } from "@/lib/data/footer";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return <footer className="mh-footer"><div className="mh-container mh-footer__grid"><div className="mh-footer__brand"><strong>Marvi Hub</strong><p>{t("footer.copyright", { year })}</p></div><div className="mh-footer__columns">{footerColumns.map((column) => <div key={column.id}><h2>{t(column.headingKey)}</h2>{column.links.map((link) => <a key={link.id} href={link.href}>{t(link.labelKey)}</a>)}</div>)}</div></div></footer>;
}
