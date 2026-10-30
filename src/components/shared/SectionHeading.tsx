import { useTranslation } from "react-i18next";

interface SectionHeadingProps {
  eyebrowKey?: string;
  titleKey: string;
  className?: string;
}

export function SectionHeading({ eyebrowKey, titleKey, className }: SectionHeadingProps) {
  const { t } = useTranslation();
  return (
    <div className={className}>
      {eyebrowKey ? <p className="mh-eyebrow">{t(eyebrowKey)}</p> : null}
      <h2 className="mh-section-title">{t(titleKey)}</h2>
    </div>
  );
}
