import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/adminGate";
import { ConfirmSubmit } from "./ConfirmSubmit";
import { removeComment, removeMoment, resolveFlaggedAccount, resolveUserReports, restoreComment, restoreMoment } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open reports", robots: { index: false } };

type ReportRow = {
  id: string;
  moment_id: string | null;
  reported_user_id: string | null;
  reported: { name: string | null; handle: string | null } | null;
  reporter_id: string | null;
  reason: string;
  note: string | null;
  needs_account_review: boolean;
  created_at: string;
  moment: { body: string | null; author_id: string | null; hidden_pending_review: boolean | null } | null;
  comment_id: string | null;
  comment: { body: string; author_id: string; hidden_pending_review: boolean; deleted_at: string | null } | null;
};

type FlaggedRow = {
  user_id: string;
  reason: string;
  last_flagged_at: string;
  profile: { name: string | null; handle: string | null } | null;
};

const when = (iso: string) => new Date(iso).toLocaleString("en-US");
const pill = "rounded-full px-3 py-1.5 text-xs font-medium transition";

export default async function AdminReportsPage() {
  // Not an admin (or no Supabase): plain 404 so the page's existence isn't revealed.
  const admin = await requireAdmin();
  if (!admin) notFound();

  const [{ data: reportData }, { data: flaggedData }] = await Promise.all([
    admin
      .from("reports")
      .select(
        "id, moment_id, reported_user_id, reported:profiles!reports_reported_user_id_fkey(name, handle), reporter_id, reason, note, needs_account_review, created_at, moment:moments!reports_moment_id_fkey(body, author_id, hidden_pending_review), comment_id, comment:comments(body, author_id, hidden_pending_review, deleted_at)",
      )
      .eq("status", "open")
      .eq("reporter_blocked", false)
      .order("needs_account_review", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("flagged_accounts")
      .select("user_id, reason, last_flagged_at")
      .eq("status", "open")
      .order("last_flagged_at", { ascending: true }),
  ]);
  const reports = (reportData ?? []) as unknown as ReportRow[];
  // flagged_accounts.user_id references auth.users, not profiles, so there's no FK to embed
  // through. Look the names up separately.
  const flaggedRaw = (flaggedData ?? []) as unknown as Omit<FlaggedRow, "profile">[];
  const { data: flaggedProfiles } = flaggedRaw.length
    ? await admin.from("profiles").select("id, name, handle").in("id", flaggedRaw.map((f) => f.user_id))
    : { data: [] as { id: string; name: string | null; handle: string | null }[] };
  const profileById = new Map((flaggedProfiles ?? []).map((p) => [p.id, { name: p.name, handle: p.handle }]));
  const flagged: FlaggedRow[] = flaggedRaw.map((f) => ({ ...f, profile: profileById.get(f.user_id) ?? null }));
  const flaggedIds = new Set(flagged.map((f) => f.user_id));

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-10">
      <section>
        <h1 className="font-display text-3xl text-ink-900">Flagged accounts</h1>
        <p className="mt-1 text-sm text-ink-500">From “Someone under 13” reports. Check the account, then mark it reviewed.</p>
        {flagged.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-cream-100 px-4 py-4 text-sm text-ink-600">No flagged accounts.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {flagged.map((f) => (
              <li key={f.user_id} id={`flag-${f.user_id}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ember-200 bg-white p-4 shadow-card">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-ink-900">
                    {f.profile?.name || "Unknown"} {f.profile?.handle ? <span className="text-ink-500">@{f.profile.handle}</span> : null}
                  </p>
                  <p className="text-xs text-ink-400">
                    {f.reason} · last flagged {when(f.last_flagged_at)} · <span className="font-mono">{f.user_id}</span>
                  </p>
                </div>
                <form action={resolveFlaggedAccount}>
                  <input type="hidden" name="userId" value={f.user_id} />
                  <button type="submit" className={`${pill} bg-cream-100 text-ink-700 hover:bg-cream-200`}>
                    Mark reviewed
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-3xl text-ink-900">Open reports</h2>
        <p className="mt-1 text-sm text-ink-500">{reports.length} open · account-review reports first.</p>
        {reports.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-cream-100 px-4 py-4 text-sm text-ink-600">Nothing open. All quiet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-ink-900">{r.reason}</span>
                  {r.needs_account_review && (
                    <span className="rounded-full bg-ember-50 px-2 py-0.5 text-xs font-medium text-ember-800 ring-1 ring-ember-200">
                      Account review
                    </span>
                  )}
                  {r.comment_id && (
                    <span className="rounded-full bg-cream-100 px-2 py-0.5 text-xs text-ink-600">Comment</span>
                  )}
                  {(r.comment_id ? r.comment?.hidden_pending_review : r.moment?.hidden_pending_review) && (
                    <span className="rounded-full bg-cream-200 px-2 py-0.5 text-xs text-ink-600">Hidden pending review</span>
                  )}
                  <span className="ml-auto text-xs text-ink-400">{when(r.created_at)}</span>
                </div>
                {r.comment_id ? (
                  <>
                    <p className="mt-2 text-sm text-ink-700">
                      “{r.comment?.body ?? "(comment unavailable)"}”{r.comment?.deleted_at && " · removed"}
                    </p>
                    {r.moment?.body && <p className="mt-1 text-xs text-ink-400">On: “{r.moment.body}”</p>}
                  </>
                ) : (
                  r.moment?.body && <p className="mt-2 text-sm text-ink-700">“{r.moment.body}”</p>
                )}
                {r.note && <p className="mt-1 text-sm text-ink-500">Note: {r.note}</p>}
                <p className="mt-2 font-mono text-[11px] text-ink-400">
                  {r.comment_id && <>comment {r.comment_id} · comment author {r.comment?.author_id ?? "—"} · </>}
                  moment {r.moment_id ?? "—"} · author {r.moment?.author_id ?? "—"} · reporter {r.reporter_id ?? "—"}
                </p>
                {r.comment_id ? (
                  <div className="mt-3 flex gap-2">
                    <form action={restoreComment}>
                      <input type="hidden" name="commentId" value={r.comment_id} />
                      <button type="submit" className={`${pill} bg-cream-100 text-ink-700 hover:bg-cream-200`}>
                        Restore
                      </button>
                    </form>
                    <form action={removeComment}>
                      <input type="hidden" name="commentId" value={r.comment_id} />
                      <ConfirmSubmit
                        message="Remove this comment? Replies stay, under “This comment was removed.”"
                        className={`${pill} text-ink-500 hover:bg-cream-100 hover:text-ink-800`}
                      >
                        Remove
                      </ConfirmSubmit>
                    </form>
                  </div>
                ) : r.moment_id && (
                  <div className="mt-3 flex gap-2">
                    <form action={restoreMoment}>
                      <input type="hidden" name="momentId" value={r.moment_id} />
                      <button type="submit" className={`${pill} bg-cream-100 text-ink-700 hover:bg-cream-200`}>
                        Restore
                      </button>
                    </form>
                    <form action={removeMoment}>
                      <input type="hidden" name="momentId" value={r.moment_id} />
                      <ConfirmSubmit
                        message="Remove this Moment and its photo for good?"
                        className={`${pill} text-ink-500 hover:bg-cream-100 hover:text-ink-800`}
                      >
                        Remove
                      </ConfirmSubmit>
                    </form>
                  </div>
                )}
                {!r.moment_id && r.reported_user_id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="text-sm text-ink-700">
                      Reported person: {r.reported?.name || "Unknown"}
                      {r.reported?.handle ? <span className="text-ink-500"> @{r.reported.handle}</span> : null}
                    </p>
                    {flaggedIds.has(r.reported_user_id) && (
                      <a href={`#flag-${r.reported_user_id}`} className="text-xs text-ember-700 underline underline-offset-2">
                        See account flag
                      </a>
                    )}
                    <form action={resolveUserReports} className="ml-auto">
                      <input type="hidden" name="userId" value={r.reported_user_id} />
                      <button type="submit" className={`${pill} bg-cream-100 text-ink-700 hover:bg-cream-200`}>
                        Resolve
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
