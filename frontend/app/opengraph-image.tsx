import { ImageResponse } from "next/og";

// Branded social share card (LinkedIn / X / Facebook). Generated at the edge —
// no external image asset needed.
export const alt = "VOUCH — Find open-source tools you can trust";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #312e81 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background: "#6366f1",
            }}
          />
          <div style={{ fontSize: "44px", fontWeight: 800, letterSpacing: "-0.02em" }}>
            VOUCH
          </div>
        </div>

        <div
          style={{
            marginTop: "44px",
            fontSize: "68px",
            fontWeight: 800,
            lineHeight: 1.08,
            maxWidth: "960px",
          }}
        >
          Find open-source tools you can trust
        </div>

        <div
          style={{
            marginTop: "28px",
            fontSize: "30px",
            color: "#cbd5e1",
            maxWidth: "940px",
          }}
        >
          Safety, maintenance, popularity &amp; footprint scores — plus AI compare &amp; recommend.
        </div>

        <div style={{ marginTop: "52px", fontSize: "24px", color: "#a5b4fc" }}>
          vouch-mauve-two.vercel.app
        </div>
      </div>
    ),
    { ...size },
  );
}
