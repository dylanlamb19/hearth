import { StaticPage } from "@/components/StaticPage";
import { LegalSection, Todo } from "@/components/LegalSection";

// TODO(legal): register a designated agent with the U.S. Copyright Office before real users.
const DMCA_AGENT_EMAIL = "dmca@hearthsocial.grok.me";

export default function DmcaPage() {
  return (
    <StaticPage
      title="Copyright (DMCA)"
      lead="How to ask us to take down work that’s yours, and how to respond if your post was removed."
      template
      lastUpdated="Oct 21, 2026"
    >
      <LegalSection title="Asking for a takedown">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Find the post, photo, or listing that uses your work and copy its link.</li>
          <li>Write a notice with everything listed below.</li>
          <li>Send it to our designated agent (below).</li>
          <li>We remove or disable the material and let the person who posted it know.</li>
        </ol>
      </LegalSection>

      <LegalSection title="What your notice must include">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your physical or electronic signature (or that of someone allowed to act for you).</li>
          <li>A description of the copyrighted work you believe was used.</li>
          <li>The link or other details that let us find the material on Hearth.</li>
          <li>Your name, mailing address, phone number, and email.</li>
          <li>A statement that you believe in good faith the use isn’t allowed by you, your agent, or the law.</li>
          <li>A statement that the notice is accurate and, under penalty of perjury, that you are the owner or allowed to act for the owner.</li>
        </ul>
      </LegalSection>

      <LegalSection title="If your post was removed (counter-notice)">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Send our agent a counter-notice with: your signature; what was removed and where it was; a statement
            under penalty of perjury that you believe in good faith it was removed by mistake or misidentification;
            your name, address, and phone number; and your consent to the jurisdiction of the federal court for
            your address (or, outside the U.S., any district where Hearth can be found), and to accept service from
            the person who sent the original notice.
          </li>
          <li>We forward your counter-notice to that person.</li>
          <li>
            Unless they tell us they’ve filed a court action within 10 to 14 business days, we may restore the material.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="Repeat infringers">
        <p>We close accounts that repeatedly post material they don’t have the rights to.</p>
      </LegalSection>

      <LegalSection title="Designated agent">
        <p>
          Hearth copyright agent · [Name] · [Mailing address] ·{" "}
          <a href={`mailto:${DMCA_AGENT_EMAIL}`} className="underline underline-offset-2">{DMCA_AGENT_EMAIL}</a>
        </p>
        <p>
          <Todo>placeholder — the agent must be registered with the U.S. Copyright Office before Hearth has real users.</Todo>
        </p>
      </LegalSection>
    </StaticPage>
  );
}
