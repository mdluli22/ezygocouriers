import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You’re offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      style={{
        alignItems: "center",
        background: "#f5f7f6",
        color: "#173d38",
        display: "flex",
        justifyContent: "center",
        minHeight: "100svh",
        padding: "24px",
      }}
    >
      <section
        style={{
          background: "white",
          border: "1px solid #dce5e2",
          borderRadius: "24px",
          boxShadow: "0 18px 50px rgba(23,61,56,0.12)",
          maxWidth: "460px",
          padding: "40px 32px",
          textAlign: "center",
          width: "100%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/EzyGoIcon.png"
          alt=""
          width="88"
          height="88"
          style={{ borderRadius: "22px", margin: "0 auto 20px" }}
        />
        <h1 style={{ fontSize: "28px", lineHeight: 1.2, margin: "0 0 12px" }}>
          You’re offline
        </h1>
        <p style={{ color: "#5f726e", lineHeight: 1.7, margin: "0 0 28px" }}>
          Reconnect to book a delivery, refresh tracking, or make a payment.
          EzyGo never shows cached account or payment information while offline.
        </p>
        <a
          href="/dashboard"
          style={{
            background: "#2f4f4f",
            borderRadius: "12px",
            color: "white",
            display: "inline-block",
            fontWeight: 700,
            padding: "12px 22px",
            textDecoration: "none",
          }}
        >
          Try again
        </a>
      </section>
    </main>
  );
}
