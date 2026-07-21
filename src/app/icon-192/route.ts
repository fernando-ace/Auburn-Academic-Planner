import { createElement } from "react";
import { ImageResponse } from "next/og";

import { AppIconArtwork } from "@/components/app-icon-artwork";

const size = 192;

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(createElement(AppIconArtwork, { canvasSize: size }), {
    height: size,
    width: size,
  });
}
