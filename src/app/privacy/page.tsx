import { StaticPage } from "@/components/StaticPage";

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy" lead="Clear privacy copy for a quieter social network.">
      <p>We collect the account details you provide (name, email, and password hash in a real deployment) and the content you choose to share.</p>
      <p>Demo mode stores a session cookie in your browser so you stay signed in. No third-party ad trackers ship with this MVP.</p>
      <p>You control who sees you through friends lists, report and block tools, and post privacy choices (friends or public).</p>
      <p>Marketplace listings show seller name, condition, price, and approximate distance. Meet-ups are arranged privately between people.</p>
      <p>We do not sell personal data. When this product moves beyond demo auth, we will keep this page updated with provider details and retention windows.</p>
      <p>To request deletion of a demo account, clear your cookies or contact privacy@hearth.demo.</p>
    </StaticPage>
  );
}
