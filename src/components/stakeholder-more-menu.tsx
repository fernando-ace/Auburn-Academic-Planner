"use client";

import Link from "next/link";
import { ChevronDown, Ellipsis } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

export const stakeholderLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/methodology", label: "Methodology" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/limitations", label: "Limitations" },
  { href: "/pilot-review", label: "Pilot Review" },
] as const;

export function StakeholderMoreMenu({ align = "right" }: { align?: "left" | "right" }) {
  const [isOpen, setIsOpen] = useState(false);
  const disclosureId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key === "Tab" &&
      !event.shiftKey &&
      isOpen &&
      document.activeElement === triggerRef.current
    ) {
      event.preventDefault();
      firstLinkRef.current?.focus();
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div
      className="relative"
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <button
        aria-controls={disclosureId}
        aria-expanded={isOpen}
        aria-label="More"
        className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-lg border border-white/20 text-[13px] font-semibold text-white/90 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/45 sm:w-auto sm:px-3"
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <Ellipsis aria-hidden="true" className="sm:hidden" size={18} />
        <span className="hidden sm:inline">More</span>
        <ChevronDown
          aria-hidden="true"
          className={`hidden transition sm:block ${isOpen ? "rotate-180" : ""}`}
          size={15}
        />
      </button>
      {isOpen ? (
        <div
          className={`absolute top-12 z-30 w-52 rounded-md border border-slate-200 bg-white p-1.5 text-slate-800 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
          id={disclosureId}
        >
          <ul aria-label="Stakeholder pages">
            {stakeholderLinks.map((link, index) => (
              <li key={link.href}>
                <Link
                  className="block rounded-sm px-3 py-2 text-[13px] font-semibold leading-5 text-slate-700 transition hover:bg-slate-100 hover:text-[#03244d] focus:bg-slate-100 focus:outline-none"
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  ref={index === 0 ? firstLinkRef : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
