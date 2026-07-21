import { ImageResponse } from "next/og";
import { AppIconArtwork } from "@/components/app-icon-artwork";

export const size = {
  width: 512,
  height: 512,
};
export const contentType = "image/png";

export default function AppIcon() {
  return new ImageResponse(<AppIconArtwork canvasSize={size.width} />, size);
}
