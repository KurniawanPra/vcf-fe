"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

/**
 * PageTransition — wraps page content with a morph-build animation.
 *
 * On every route change the wrapper:
 *  1. Fades/scales in (page-level)
 *  2. Observes children with `.morph-in` class and staggers their reveal
 *     via IntersectionObserver so elements "build themselves" as they enter
 *     the viewport.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"enter" | "done">("enter");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Kick off enter
    setPhase("enter");
    const raf = requestAnimationFrame(() => {
      setPhase("done");
    });

    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  // Observe `.morph-in` children and stagger-reveal them
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // Short delay so the DOM is painted before we start observing
    const timer = setTimeout(() => {
      const targets = el.querySelectorAll<HTMLElement>(".morph-in");
      if (targets.length === 0) return;

      let idx = 0;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const target = entry.target as HTMLElement;
              // Stagger delay based on DOM order
              target.style.transitionDelay = `${idx * 60}ms`;
              target.classList.add("morph-visible");
              idx++;
              observer.unobserve(target);
            }
          });
        },
        { root: null, rootMargin: "0px 0px 40px 0px", threshold: 0.05 }
      );

      targets.forEach((t) => observer.observe(t));

      // Cleanup
      return () => observer.disconnect();
    }, 30);

    return () => clearTimeout(timer);
  }, [pathname, phase]);

  return (
    <div
      key={pathname}
      ref={wrapperRef}
      className={`page-transition-wrapper ${phase === "done" ? "page-enter-done" : "page-enter"}`}
    >
      {children}
    </div>
  );
}

/**
 * FormMorph — wraps a form/tab panel so it morphs-in when mounted.
 *
 * Each direct child `.glass-card` (or any element) is stagger-animated
 * with a morph build effect: scale + blur + slide from below → normal.
 *
 * Usage:
 *   <FormMorph key={activeTab}>
 *     <div className="glass-card ...">...</div>
 *   </FormMorph>
 */
export function FormMorph({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Give the DOM a frame to paint
    const raf = requestAnimationFrame(() => {
      const items = el.querySelectorAll<HTMLElement>(":scope > *");
      items.forEach((child, i) => {
        child.classList.add("form-morph-child");
        child.style.setProperty("--morph-delay", `${i * 80}ms`);
        // Force reflow then trigger
        void child.offsetHeight;
        child.classList.add("form-morph-visible");
      });
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={containerRef} className={`form-morph-container ${className}`}>
      {children}
    </div>
  );
}
