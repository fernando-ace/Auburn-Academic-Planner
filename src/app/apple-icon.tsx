import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 38,
          background: "#03244d",
        }}
      >
        <div
          style={{
            width: 104,
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "10px solid #ffffff",
            borderRadius: 18,
            color: "#dd550c",
          }}
        >
          <svg
            fill="none"
            height="72"
            stroke="#dd550c"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            viewBox="0 0 24 24"
            width="72"
          >
            <rect height="4" rx="1" width="8" x="8" y="2" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="m9 14 2 2 4-4" />
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
