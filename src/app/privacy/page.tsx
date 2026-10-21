import { StaticPage } from "@/components/StaticPage";
import { LegalSection, Todo } from "@/components/LegalSection";

// TODO(legal): confirm the contact inbox exists before launch.
const PRIVACY_EMAIL = "privacy@hearthsocial.grok.me";

export default function PrivacyPage() {
  return (
    <StaticPage
      title="Privacy"
      lead="What Hearth keeps, what it never does, and how to leave — in plain words."
      template
      lastUpdated="Oct 21, 2026"
    >
      <LegalSection title="The short version">
        <ul className="list-disc space-y-2 pl-5">
          <li>We never sell your data. Not to advertisers, not to data brokers, not to anyone.</li>
          <li>We never upload or sync your phone’s contacts. You find people by searching or by invite link.</li>
          <li>We remove location data (EXIF) from photos before they are stored, so a picture can’t give away where you live.</li>
        </ul>
      </LegalSection>

      <LegalSection title="What we store">
        <p>Only what Hearth needs to work:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="font-medium text-ink-800">Your account</strong> — email, a hashed password, and your birth year.</li>
          <li><strong className="font-medium text-ink-800">Your profile</strong> — name, handle, photo, bio, and the interests you pick.</li>
          <li><strong className="font-medium text-ink-800">Your posts</strong> — Moments, photos, comments, reactions, and Marketplace listings you share.</li>
          <li><strong className="font-medium text-ink-800">Your messages</strong> — conversations you have with other people on Hearth.</li>
        </ul>
        <p>We keep a sign-in cookie so you stay logged in. We don’t run ad trackers.</p>
      </LegalSection>

      <LegalSection title="Your age and birthday">
        <p>
          When you sign up we ask for your birth year and nothing more. We use it only to check that you are 13
          or older. It isn’t shown on your profile or used for ads.
        </p>
        <p>
          Showing your birthday to friends is opt-in and off by default. If you turn it on, you choose to share it;
          you can turn it off again any time.
        </p>
      </LegalSection>

      <LegalSection title="Who sees what">
        <p>
          New Moments go to friends by default. You can mark a Moment public when you want to. Blocking someone
          hides you from each other.
        </p>
      </LegalSection>

      <LegalSection title="Deleting your account">
        <p>
          Go to Settings and choose Delete account. We remove your profile, posts, and messages from Hearth, and
          clear any backups on their normal schedule. Messages you sent may still appear in the other person’s
          copy of a conversation until they delete it.
        </p>
        <p>
          If you can’t reach Settings, email us and we’ll do it for you. <Todo>Delete account isn’t in Settings yet — add it before launch.</Todo>
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about your data: <a href={`mailto:${PRIVACY_EMAIL}`} className="underline underline-offset-2">{PRIVACY_EMAIL}</a>{" "}
          <Todo>placeholder address — confirm the inbox is live.</Todo>
        </p>
      </LegalSection>
    </StaticPage>
  );
}
