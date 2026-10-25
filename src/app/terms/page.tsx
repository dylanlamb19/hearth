import Link from "next/link";
import { StaticPage } from "@/components/StaticPage";
import { LegalSection } from "@/components/LegalSection";

export default function TermsPage() {
  return (
    <StaticPage
      title="Terms of use"
      lead="The ground rules for sharing a quiet room with people you know."
      template
      lastUpdated="Oct 21, 2026"
    >
      <LegalSection title="Who can join">
        <p>You must be 13 or older. We close accounts we learn belong to anyone under 13 and delete their data.</p>
        <p>One real person per account.</p>
      </LegalSection>

      <LegalSection title="What you can post">
        <p>Your posts are yours. By sharing them on Hearth, you let us show them to the people you chose.</p>
        <p>Please don’t post:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Harassment, threats, or hate aimed at people or groups.</li>
          <li>Sexual content involving minors, or anyone’s private images shared without consent.</li>
          <li>Other people’s private information, like addresses or phone numbers.</li>
          <li>Spam, scams, fake accounts, or impersonation.</li>
          <li>Anything illegal, or content you don’t have the rights to share.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Report and block">
        <p>
          Use the ··· menu on a post, profile, or listing to report something or block someone. We review
          reports and may remove content or limit accounts that break these rules.
        </p>
      </LegalSection>

      <LegalSection title="Marketplace">
        <p>
          Marketplace connects neighbors. Hearth isn’t a party to any sale: buyers and sellers deal directly
          and are responsible for the item, the payment, and meeting safely.
        </p>
        <p>These items aren’t allowed on Marketplace:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Weapons, ammunition, and parts for them.</li>
          <li>Drugs, including prescription drugs and drug gear.</li>
          <li>Alcohol.</li>
          <li>Animals.</li>
          <li>Recalled goods.</li>
        </ul>
        <p>Report a scam listing from its ··· menu.</p>
      </LegalSection>

      <LegalSection title="Copyright">
        <p>
          If you think something on Hearth uses your work without permission, follow the steps on our{" "}
          <Link href="/dmca" className="underline underline-offset-2">DMCA page</Link>. Accounts that repeatedly
          post infringing material will be closed.
        </p>
      </LegalSection>

      <LegalSection title="Ending your account">
        <p>
          You can delete your account at any time. We may suspend or close an account that breaks these terms,
          puts others at risk, or misuses Hearth. Where it’s safe to, we’ll tell you why.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>If these terms change in a way that matters, we’ll let you know in the app before it takes effect.</p>
      </LegalSection>
    </StaticPage>
  );
}
