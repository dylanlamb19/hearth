"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { ReportMenu } from "./ReportMenu";
import { useAuth } from "./AuthProvider";
import { addComment, deleteComment, listComments, type Comment } from "@/lib/social";
import { getReportedIds } from "@/lib/reported";
import { timeAgo } from "@/lib/format";

/** Comments under a Moment: list, write, and Report/Delete from each comment's ··· menu. */
export function CommentsSection({
  momentId,
  momentAuthorId,
  onCount,
}: {
  momentId: string;
  momentAuthorId: string;
  onCount?: (n: number) => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listComments(momentId)
      .then((list) => {
        if (cancelled) return;
        const reported = new Set(getReportedIds());
        setComments(list.filter((c) => !reported.has(c.id)));
      })
      .catch(() => !cancelled && setError("Couldn’t load comments."));
    return () => {
      cancelled = true;
    };
  }, [momentId]);

  useEffect(() => {
    if (comments) onCount?.(comments.length);
  }, [comments, onCount]);

  async function submit() {
    if (!user || !draft.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const c = await addComment(momentId, draft, { id: user.id, name: user.name });
      setComments((prev) => [...(prev ?? []), c]);
      setDraft("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Comment) {
    const before = comments ?? [];
    setComments(before.filter((x) => x.id !== c.id));
    try {
      await deleteComment(c);
    } catch (e) {
      // Put back only this comment, in its place.
      setComments((prev) => {
        const list = [...(prev ?? [])];
        const at = before.findIndex((x) => x.id === c.id);
        list.splice(Math.min(at, list.length), 0, c);
        return list;
      });
      setError((e as Error).message);
    }
  }

  function hide(id: string) {
    setComments((prev) => (prev ?? []).filter((x) => x.id !== id));
  }

  return (
    <div className="mt-3 border-t border-ink-100 pt-3">
      {comments === null && !error && <p className="text-xs text-ink-400">Loading comments…</p>}
      <ul className="space-y-3">
        {(comments ?? []).map((c) => {
          const canDelete = Boolean(user && (c.authorId === user.id || momentAuthorId === user.id));
          const isMine = user?.id === c.authorId;
          return (
            <li key={c.id} className="flex items-start gap-2">
              <Avatar name={c.authorName} size="sm" />
              <div className="min-w-0 flex-1 rounded-2xl bg-cream-50 px-3 py-2">
                <p className="text-xs text-ink-500">
                  <span className="font-medium text-ink-800">{c.authorName}</span> · {timeAgo(c.createdAt)}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-ink-700">{c.body}</p>
              </div>
              {isMine ? (
                <button
                  type="button"
                  onClick={() => void remove(c)}
                  className="rounded-full px-2 py-1 text-xs text-ink-400 hover:bg-cream-100 hover:text-ink-700"
                >
                  Delete
                </button>
              ) : (
                <ReportMenu
                  subject={`${c.authorName}’s comment`}
                  subjectId={c.authorId}
                  itemId={c.id}
                  parentMomentId={momentId}
                  onReported={hide}
                  onDelete={canDelete ? () => void remove(c) : undefined}
                />
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-xs text-ember-700">{error}</p>}
      {user && (
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            placeholder="Write a comment"
            aria-label="Write a comment"
            className="min-w-0 flex-1 rounded-full border-0 bg-cream-50 px-4 py-2 text-sm ring-1 ring-ink-100 placeholder:text-ink-400 focus:ring-2 focus:ring-ember-300"
          />
          <Button type="submit" className="!px-4 !py-2 text-xs" disabled={!draft.trim() || busy}>
            Post
          </Button>
        </form>
      )}
    </div>
  );
}
