import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Planning Hub",
  description:
    "Check Degree Works Current Progress, compare a planned path, and prepare advisor-ready questions.",
};

export default function PlanCheckLayout({ children }: { children: ReactNode }) {
  return children;
}
