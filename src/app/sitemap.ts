import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-metadata";

const publicRoutes = [
  { path: "/plan-check", changeFrequency: "weekly", priority: 1 },
  { path: "/chat", changeFrequency: "weekly", priority: 0.9 },
  { path: "/feedback", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.6 },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.6 },
  { path: "/accessibility", changeFrequency: "monthly", priority: 0.6 },
  { path: "/limitations", changeFrequency: "monthly", priority: 0.6 },
  { path: "/pilot-review", changeFrequency: "monthly", priority: 0.5 },
  {
    path: "/pilot-review/template",
    changeFrequency: "monthly",
    priority: 0.4,
  },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, SITE_URL).toString(),
    changeFrequency,
    priority,
  }));
}
