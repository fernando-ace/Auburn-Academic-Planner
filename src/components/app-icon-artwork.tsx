export function AppIconArtwork({ canvasSize }: { canvasSize: number }) {
  const scale = canvasSize / 512;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 108 * scale,
        background: "#03244d",
      }}
    >
      <div
        style={{
          width: 296 * scale,
          height: 340 * scale,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `${28 * scale}px solid #ffffff`,
          borderRadius: 52 * scale,
        }}
      >
        <svg
          fill="none"
          height={204 * scale}
          stroke="#dd550c"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          viewBox="0 0 24 24"
          width={204 * scale}
        >
          <rect height="4" rx="1" width="8" x="8" y="2" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      </div>
    </div>
  );
}
