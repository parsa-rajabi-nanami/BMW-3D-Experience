import { useEffect, useRef, useState, type ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${shown ? "revealed" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

export function ActionButton({
  children,
  onClick,
  variant = "solid",
  href,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "outline" | "ghost";
  href?: string;
  className?: string;
}) {
  const base =
    "group relative inline-flex cursor-pointer items-center gap-3 px-7 py-4 text-[10px] font-semibold tracking-[0.3em] uppercase transition-[color,background-color,border-color] duration-300";
  const styles = {
    solid:
      "bg-foreground text-background hover:bg-primary hover:text-primary-foreground",
    outline:
      "border border-border-strong text-foreground hover:border-primary hover:text-primary",
    ghost: "text-muted-foreground hover:text-foreground",
  }[variant];

  if (href) {
    return (
      <a href={href} className={`${base} ${styles} ${className}`}>
        {children}
        <span
          aria-hidden="true"
          className="h-px w-6 bg-current transition-[width] duration-500 group-hover:w-9"
        />
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${styles} ${className}`}
    >
      {children}
      <span
        aria-hidden="true"
        className="h-px w-6 bg-current transition-[width] duration-500 group-hover:w-9"
      />
    </button>
  );
}
