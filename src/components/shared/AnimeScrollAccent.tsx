"use client";

import { animate } from "animejs";
import { useEffect, useRef, type ReactNode } from "react";

export function AnimeScrollAccent({ children }: { children: ReactNode }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.style.opacity = "1";
      element.style.transform = "none";
      return;
    }

    const reveal = () => animate(element, { opacity: [0, 1], translateY: [28, 0], duration: 700, ease: "outExpo" });
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      reveal();
      observer?.disconnect();
    }, { threshold: 0.2 });

    if (observer) observer.observe(element);
    else reveal();
    return () => observer?.disconnect();
  }, []);

  return <div ref={elementRef} style={{ opacity: 0, transform: "translateY(28px)" }}>{children}</div>;
}
