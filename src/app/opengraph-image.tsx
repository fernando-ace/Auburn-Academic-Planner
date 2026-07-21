import { ImageResponse } from "next/og";

export const alt =
  "Auburn Academic Planner, an independent student-built planning pilot";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f4f7fb",
          color: "#03244d",
          padding: "64px 72px 54px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              background: "#03244d",
              color: "#ffffff",
              fontSize: 34,
            }}
          >
            <svg
              fill="none"
              height="36"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              width="36"
            >
              <rect height="4" rx="1" width="8" x="8" y="2" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="m9 14 2 2 4-4" />
            </svg>
          </div>
          Independent student-built pilot
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 74,
            maxWidth: 980,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 72,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: "-0.035em",
            }}
          >
            Auburn Academic Planner
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 30,
              maxWidth: 930,
              color: "#35516f",
              fontSize: 33,
              lineHeight: 1.35,
            }}
          >
            Degree Works-native planning and source-grounded guidance for
            better advisor conversations.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 30,
            borderTop: "2px solid #d9e2ec",
            fontSize: 23,
            color: "#35516f",
          }}
        >
          <div style={{ display: "flex" }}>Advisor preparation, not an official audit</div>
          <div
            style={{
              display: "flex",
              borderRadius: 999,
              background: "#dd550c",
              color: "#ffffff",
              padding: "12px 20px",
              fontWeight: 700,
            }}
          >
            Auburn-focused • student-built
          </div>
        </div>
      </div>
    ),
    size,
  );
}
