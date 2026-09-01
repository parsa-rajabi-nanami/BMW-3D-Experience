import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useExperience } from "@/hooks/use-experience";
import type { SectionId } from "@/lib/experience";

const LINKS: { id: SectionId; label: string }[] = [
  { id: "hero", label: "Experience" },
  { id: "performance", label: "Performance" },
  { id: "configure", label: "Configure" },
  { id: "engineering", label: "Engineering" },
];

export function Nav() {
  const { section } = useExperience();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const go = () => setOpen(false);

  const activeKey: SectionId =
    section === "explore"
      ? "performance"
      : section === "modes"
        ? "engineering"
        : section === "summary" || section === "closing"
          ? "configure"
          : section;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,padding] duration-500 ${
        scrolled ? "panel pb-3" : "border-transparent pb-6"
      }`}
      style={{
        paddingTop: scrolled
          ? "max(0.75rem, env(safe-area-inset-top))"
          : "max(1.5rem, env(safe-area-inset-top))",
      }}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-[1600px] items-center justify-between px-6 sm:px-10"
      >
        <a href="#hero" className="flex items-baseline gap-3">
          <span className="display text-lg tracking-[0.2em]">
            BMW Experience
          </span>
          <span className="hidden text-[9px] tracking-[0.3em] text-muted-foreground sm:inline">
            CONCEPT
          </span>
        </a>

        <ul className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                onClick={go}
                aria-current={activeKey === l.id ? "location" : undefined}
                className={`relative cursor-pointer py-2 text-[10px] font-semibold tracking-[0.3em] uppercase transition-colors ${
                  activeKey === l.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
                <span
                  className={`absolute -bottom-0.5 left-0 h-px bg-primary transition-[width] duration-500 ${
                    activeKey === l.id ? "w-full" : "w-0"
                  }`}
                />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <a
            href="#configure"
            onClick={go}
            className="hidden cursor-pointer border border-border-strong px-5 py-3 text-[10px] font-semibold tracking-[0.3em] uppercase transition-colors hover:border-primary hover:text-primary sm:inline-block"
          >
            Build yours
          </a>
          <button
            type="button"
            ref={menuButtonRef}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((v) => !v)}
            className="cursor-pointer p-1 md:hidden"
          >
            {open ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </nav>

      {open && (
        <ul
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="mt-4 grid gap-1 border-t border-border bg-background/95 px-6 py-4 backdrop-blur-xl md:hidden"
        >
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                onClick={go}
                className="block w-full cursor-pointer border-b border-border py-4 text-left text-xs font-semibold tracking-[0.3em] uppercase transition-colors hover:text-primary"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
