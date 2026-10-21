import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open reports", robots: { index: false } };

type ReportRow = {
  id: string;
  moment_id: string | null;
  reporter_id: string | null;
  reason: string;
  note: string | null;
  needs_account_review: boolean;
  created_at: string;
  moment: { body: string | null; author_id: string | null; hidden_pending_review: boolean | null } | null;
};

/** Admins only: ADMIN_USER_IDS is a comma-separated list of Supabase user ids (server env). */
function adminIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_USER_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export default async function AdminReportsPage() {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();
  if (!supabase || !admin) notFound();

  const { data: auth } = await supabase.auth.getUser();
  // Anyone who isn't an admin gets a plain 404, so the page's existence isn't revealed.
  if (!auth.user || !adminIds().has(auth.user.id)) notFound();

  const { data } = await admin
    .from("reports")
    .select(
      "id, moment_id, reporter_id, reason, note, needs_account_review, created_at, moment:moments(body, author_id, hidden_pending_review)",
    )
    .eq("status", "open")
    .order("needs_account_review", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  const reports = (data ?? []) as unknown as ReportRow[];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl text-ink-900">Open reports</h1>
      <p className="mt-1 text-sm text-ink-500">
        {reports.length} open · account-review reports first. Resolve them in Supabase (set status to resolved).
      </p>
      {reports.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-cream-100 px-4 py-6 text-center text-sm text-ink-600">Nothing open. All quiet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-ink-900">{r.reason}</span>
                {r.needs_account_review && (
                  <span className="rounded-full bg-ember-50 px-2 py-0.5 text-xs font-medium text-ember-800 ring-1 ring-ember-200">
                    Account review
                  </span>
                )}
                {r.moment?.hidden_pending_review && (
                  <span className="rounded-full bg-cream-200 px-2 py-0.5 text-xs text-ink-600">Hidden pending review</span>
                )}
                <span className="ml-auto text-xs text-ink-400">{new Date(r.created_at).toLocaleString("en-US")}</span>
              </div>
              {r.moment?.body && <p className="mt-2 text-sm text-ink-700">“{r.moment.body}”</p>}
              {r.note && <p className="mt-1 text-sm text-ink-500">Note: {r.note}</p>}
              <p className="mt-2 font-mono text-[11px] text-ink-400">
                moment {r.moment_id ?? "—"} · author {r.moment?.author_id ?? "—"} · reporter {r.reporter_id ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
