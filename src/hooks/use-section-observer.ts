import { useEffect } from "react";
import { SECTION_VIEWS, type SectionId } from "@/lib/experience";

function isSectionId(value: string | null | undefined): value is SectionId {
  return typeof value === "string" && value in SECTION_VIEWS;
}

export function useSectionObserver(onChange: (id: SectionId) => void) {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section]"),
    );
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute("data-section");
        if (isSectionId(id)) onChange(id);
      },
      { threshold: [0.35, 0.6], rootMargin: "-10% 0px -30% 0px" },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [onChange]);
}
