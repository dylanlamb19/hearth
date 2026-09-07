import { StaticPage } from "@/components/StaticPage";

export default function TermsPage() {
  return (
    <StaticPage title="Terms of use" lead="Simple expectations for sharing a room with people you know.">
      <p>By creating an account you agree to treat others with respect, keep your login private, and use Hearth for lawful, personal connection.</p>
      <p>Do not harass, impersonate, spam, scrape, or post content that exploits others. We may remove content or accounts that break these terms.</p>
      <p>You own what you post. You grant Hearth a limited license to display it inside the product so friends can see it.</p>
      <p>This MVP is provided as-is for demonstration. Features, uptime, and data retention may change as the product grows.</p>
      <p>Questions about these terms can be sent to legal@hearth.demo.</p>
    </StaticPage>
  );
}
