import { StaticPage } from "@/components/StaticPage";

export default function HelpPage() {
  return (
    <StaticPage title="Help & safety" lead="Quick answers for getting settled, staying private, and reporting anything that feels wrong.">
      <p>Create an account with your name, email, and a password of at least 8 characters. Demo auth works without a real email provider.</p>
      <p>Your feed shows people you chose. Use Moments for photos that fade in a day. Messages are one-to-one — no noisy rooms.</p>
      <p id="notifications">
        <strong className="font-medium text-ink-800">Notifications.</strong>{" "}
        Hearth may ask once for browser permission so you can get gentle pings when someone reacts, replies, or invites you — nothing noisy.
        You can always choose Not now; we will not guilt you. Device settings still control the final say.
      </p>
      <p>Report or block from the menu on posts, profiles, and marketplace listings. Reports are reviewed quietly. Blocking removes someone from your view.</p>
      <p>Marketplace tip: meet in public places, trust your instincts, and never share payment details in chat. Hearth does not hold funds.</p>
      <p>Need more help? Email support@hearth.demo — for this MVP, replies are simulated.</p>
    </StaticPage>
  );
}
