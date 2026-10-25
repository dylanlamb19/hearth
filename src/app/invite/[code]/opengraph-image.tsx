import { ImageResponse } from "next/og";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { initialOf, resolveInvite } from "@/lib/invite";

export const alt = "An invite to Hearth";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 1200×630 cream card: amber initial + "{Name} saved you a seat." Never a photo or handle. */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const inv = await resolveInvite(await getSupabaseServerClient(), code || "");
  const name = inv.status === "ok" ? inv.displayName : null;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f9f7f2" }}>
        <div style={{ width: "55%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 72 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              background: "#e8731a",
              border: "6px solid #fdfcf9",
              color: "#fdfcf9",
              fontSize: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {name ? initialOf(name) : "H"}
          </div>
          <div style={{ marginTop: 36, fontSize: 56, color: "#1a1a18", fontFamily: "serif", lineHeight: 1.1 }}>
            {name ? `${name} saved you a seat.` : "Come on in."}
          </div>
          <div style={{ marginTop: 20, fontSize: 28, color: "#575751" }}>
            Hearth — a quieter place for the people you’d invite over.
          </div>
        </div>
        <div
          style={{
            width: "45%",
            display: "flex",
            background: "linear-gradient(135deg, #fdecd9 0%, #f5b478 100%)",
          }}
        />
      </div>
    ),
    size,
  );
}
