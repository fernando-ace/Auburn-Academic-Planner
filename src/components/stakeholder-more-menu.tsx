"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { KeyboardEvent, useState } from "react";

export const stakeholderLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/methodology", label: "Methodology" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/limitations", label: "Limitations" },
  { href: "/pilot-review", label: "Pilot Review" },
] as const;

export function StakeholderMoreMenu({ align = "right" }: { align?: "left" | "right" }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-[13px] font-semibold text-white/90 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/45"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        More
        <ChevronDown
          aria-hidden="true"
          className={`transition ${isOpen ? "rotate-180" : ""}`}
          size={15}
        />
      </button>
      {isOpen ? (
        <div
          aria-label="Stakeholder pages"
          className={`absolute top-12 z-30 w-52 rounded-md border border-slate-200 bg-white p-1.5 text-slate-800 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
          role="menu"
        >
          {stakeholderLinks.map((link) => (
            <Link
              className="block rounded-sm px-3 py-2 text-[13px] font-semibold leading-5 text-slate-700 transition hover:bg-slate-100 hover:text-[#03244d] focus:bg-slate-100 focus:outline-none"
              href={link.href}
              key={link.href}
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
