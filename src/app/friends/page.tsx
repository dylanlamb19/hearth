"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { InviteSheet } from "@/components/InviteSheet";
import { ReportMenu } from "@/components/ReportMenu";
import { useAuth } from "@/components/AuthProvider";
import { people } from "@/data/seed";

export default function FriendsPage() {
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  // Demo MVP: treat seed roster as friends except the signed-in account
  const friends = people.filter((p) => p.id !== user?.id && p.id !== "u-local");

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink-900">Friends</h1>
        <p className="mt-1 text-sm text-ink-500">Requests, suggestions, and the people who belong in this room.</p>
      </div>

      {friends.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Your circle starts here"
          description="Find people on Hearth who share your vibe."
          actionLabel="Find people"
          actionHref="/people"
          secondaryLabel="Invite a friend"
          onSecondaryClick={() => setInviteOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {friends.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-3xl border border-ink-100 bg-white p-4 shadow-card">
              <Avatar name={p.name} online={p.online} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink-900">{p.name}</p>
                    <p className="text-xs text-ink-400">@{p.handle}</p>
                  </div>
                  <ReportMenu subject={p.name} />
                </div>
                <p className="mt-2 text-sm text-ink-600">{p.bio}</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="primary" className="!px-3 !py-1.5 text-xs">Message</Button>
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs">Unfriend</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </AppShell>
  );
}
