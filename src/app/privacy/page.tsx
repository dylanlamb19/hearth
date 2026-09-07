import { StaticPage } from "@/components/StaticPage";

export default function PrivacyPage() {
  return (
    <StaticPage
      title="Privacy"
      lead="Plain language for a quieter social network — what we hold, what you control, and how to leave."
      draft
      lastUpdated="Sep 6, 2026"
    >
      <p>
        <strong className="font-medium text-ink-800">What we store in this demo.</strong>{" "}
        Your name, email, and a password (hashed in a real deployment), plus the Moments, messages, and
        listings you choose to share. Demo auth keeps a session cookie in your browser so you stay signed
        in. No third-party ad trackers ship with this MVP.
      </p>
      <p>
        <strong className="font-medium text-ink-800">Friends by default.</strong>{" "}
        New posts default to friends — not the open web. You can still mark something public when you want
        to. Profiles are meant for people you already know.
      </p>
      <p>
        <strong className="font-medium text-ink-800">Report and block.</strong>{" "}
        From the ··· menu on posts, profiles, and marketplace listings you can report something that feels
        off (reviewed quietly) or block someone so they leave your feed and chat on this device. Soft
        tools, no scare screens.
      </p>
      <p>
        Marketplace listings show seller name, condition, price, and approximate distance. Meet-ups are
        arranged privately between people. We do not sell personal data.
      </p>
      <p>
        <strong className="font-medium text-ink-800">Delete or leave.</strong>{" "}
        To clear a demo account, remove site cookies in your browser, or email privacy@hearth.demo. When
        we move beyond demo auth, this page will list providers and retention windows.
      </p>
    </StaticPage>
  );
}
