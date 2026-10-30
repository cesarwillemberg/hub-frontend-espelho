import { config } from "@fortawesome/fontawesome-svg-core";

// The stylesheet is loaded by the root layout, before the first paint.
// Keeping Font Awesome from injecting it after hydration avoids the SVG size flash.
config.autoAddCss = false;
