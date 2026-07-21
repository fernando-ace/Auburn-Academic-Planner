import type { Metadata } from "next";

export const SITE_NAME = "Auburn Academic Planner";
export const SITE_DESCRIPTION =
  "Degree Works-native planning and source-grounded Auburn academic guidance for advisor preparation.";
export const DEFAULT_SITE_ORIGIN =
  "https://auburn-academic-planner.vercel.app";
export const SOCIAL_IMAGE_ALT =
  "Auburn Academic Planner, an independent student-built planning pilot";

export function getSiteUrl(rawSiteUrl = process.env.SITE_URL): URL {
  if (rawSiteUrl?.trim()) {
    try {
      const candidate = new URL(rawSiteUrl.trim());
      if (
        candidate.protocol === "https:" &&
        !candidate.username &&
        !candidate.password
      ) {
        candidate.pathname = "/";
        candidate.search = "";
        candidate.hash = "";
        return candidate;
      }
    } catch {
      // Fall through to the canonical public pilot origin.
    }
  }

  return new URL(DEFAULT_SITE_ORIGIN);
}

export const SITE_URL = getSiteUrl();

export function buildPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: `/${string}`;
}): Metadata {
  const socialTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: SOCIAL_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: ["/opengraph-image"],
    },
  };
}
