import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Planning Hub",
  description:
    "Check Degree Works Current Progress, compare a planned path, and prepare advisor-ready questions.",
  path: "/plan-check",
});

export default function PlanCheckLayout({ children }: { children: ReactNode }) {
  return children;
}
