import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPageMetadata,
  DEFAULT_SITE_ORIGIN,
  getSiteUrl,
  SITE_NAME,
} from "../src/lib/site-metadata.ts";

test("site URLs accept only credential-free HTTPS origins", () => {
  assert.equal(
    getSiteUrl("https://planner.example.edu/review?draft=1#section").toString(),
    "https://planner.example.edu/",
  );
  assert.equal(getSiteUrl("http://planner.example.edu").origin, DEFAULT_SITE_ORIGIN);
  assert.equal(
    getSiteUrl("https://user:secret@planner.example.edu").origin,
    DEFAULT_SITE_ORIGIN,
  );
  assert.equal(getSiteUrl("not a URL").origin, DEFAULT_SITE_ORIGIN);
});

test("page metadata keeps canonical and social URLs route-specific", () => {
  const metadata = buildPageMetadata({
    title: "Feedback",
    description: "Prepare non-sensitive feedback.",
    path: "/feedback",
  });
  const openGraph = metadata.openGraph as {
    title: string;
    url: string;
    images: Array<{ url: string; alt: string }>;
  };
  const twitter = metadata.twitter as {
    card: string;
    title: string;
    images: string[];
  };

  assert.equal(metadata.alternates?.canonical, "/feedback");
  assert.equal(openGraph.title, `Feedback | ${SITE_NAME}`);
  assert.equal(openGraph.url, "/feedback");
  assert.equal(openGraph.images[0].url, "/opengraph-image");
  assert.match(openGraph.images[0].alt, /independent student-built/i);
  assert.equal(twitter.card, "summary_large_image");
  assert.equal(twitter.title, `Feedback | ${SITE_NAME}`);
  assert.deepEqual(twitter.images, ["/opengraph-image"]);
});
