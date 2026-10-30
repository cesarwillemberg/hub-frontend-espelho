import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export interface NavigationLink {
  id: string;
  href: string;
  labelKey: string;
}

export interface Feature {
  id: string;
  icon: IconDefinition;
  titleKey: string;
  descriptionKey: string;
  highlight?: boolean;
}

export interface Benefit {
  id: string;
  titleKey: string;
  descriptionKey: string;
}

export interface FooterColumn {
  id: string;
  headingKey: string;
  links: Array<{ id: string; href: string; labelKey: string }>;
}
