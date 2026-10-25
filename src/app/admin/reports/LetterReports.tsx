import type { SupabaseClient } from "@supabase/supabase-js";
import { ConfirmSubmit } from "./ConfirmSubmit";
import { clearLetterReview, removeLetter, resolveLetterReport, suspendUser } from "./letterActions";

type SnapshotItem = { id: string; sender_id: string; body: string; at: string };
type LetterReport = {
  id: string;
  reporter_id: string | null;
  reported_user_id: string | null;
  message_id: string | null;
  snapshot: SnapshotItem[];
  reason: string;
  note: string | null;
  created_at: string;
};
type ReviewRow = { id: string; sender_id: string; body: string; created_at: string };

const when = (iso: string) => new Date(iso).toLocaleString("en-US");
const pill = "rounded-full px-3 py-1.5 text-xs font-medium transition";

/** Letter reports (with text snapshots) and the link/phone review queue. Empty until 0016 runs. */
export async function LetterReports({ admin }: { admin: SupabaseClient }) {
  const [{ data: reportData }, { data: reviewData }] = await Promise.all([
    admin
      .from("message_reports")
      .select("id, reporter_id, reported_user_id, message_id, snapshot, reason, note, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("messages").select("id, sender_id, body, created_at").eq("needs_review", true).order("created_at", { ascending: false }).limit(50),
  ]);
  const reports = (reportData ?? []) as LetterReport[];
  const review = (reviewData ?? []) as ReviewRow[];

  return (
    <section>
      <h2 className="font-display text-2xl text-ink-900">Letters</h2>
      <p className="mt-1 text-sm text-ink-500">Reported Letters keep a copy of the text, even after unsend. Deleting removes it for both people.</p>
      {reports.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-cream-100 px-4 py-4 text-sm text-ink-600">No open Letter reports.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <p className="text-sm font-medium text-ink-900">
                {r.reason} · {r.message_id ? "one Letter" : "whole conversation"}
                <span className="ml-2 text-xs font-normal text-ink-400">{when(r.created_at)}</span>
              </p>
              {r.note && <p className="mt-1 text-sm text-ink-600">“{r.note}”</p>}
              <ol className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl bg-cream-50 p-3 text-sm">
                {r.snapshot.map((s) => (
                  <li key={s.id} className={s.sender_id === r.reported_user_id ? "text-ink-900" : "text-ink-500"}>
                    <span className="text-xs text-ink-400">{s.sender_id === r.reported_user_id ? "Reported" : "Reporter"}:</span> {s.body}
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.message_id && (
                  <form action={removeLetter}>
                    <input type="hidden" name="messageId" value={r.message_id} />
                    <ConfirmSubmit message="Delete this Letter for both people?" className={`${pill} bg-ink-900 text-cream-50`}>
                      Delete Letter
                    </ConfirmSubmit>
                  </form>
                )}
                {r.reported_user_id && (
                  <form action={suspendUser}>
                    <input type="hidden" name="userId" value={r.reported_user_id} />
                    <ConfirmSubmit message="Suspend this account? They won't be able to sign in." className={`${pill} bg-ember-100 text-ember-800`}>
                      Suspend account
                    </ConfirmSubmit>
                  </form>
                )}
                <form action={resolveLetterReport} className="ml-auto">
                  <input type="hidden" name="reportId" value={r.id} />
                  <button type="submit" className={`${pill} bg-cream-100 text-ink-700 hover:bg-cream-200`}>
                    Resolve
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-8 font-display text-xl text-ink-900">Links and phone numbers</h3>
      {review.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-cream-100 px-4 py-4 text-sm text-ink-600">Nothing to look at.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {review.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 text-sm">
              <p className="min-w-0 flex-1 break-words text-ink-800">{m.body}</p>
              <form action={clearLetterReview}>
                <input type="hidden" name="messageId" value={m.id} />
                <button type="submit" className={`${pill} bg-cream-100 text-ink-700`}>Looks fine</button>
              </form>
              <form action={removeLetter}>
                <input type="hidden" name="messageId" value={m.id} />
                <ConfirmSubmit message="Delete this Letter for both people?" className={`${pill} bg-ink-900 text-cream-50`}>
                  Delete
                </ConfirmSubmit>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
