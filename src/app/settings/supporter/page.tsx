import { notFound } from "next/navigation";
import { supporterEnabled } from "@/lib/supporter/server";
import { SupporterSettings } from "@/components/SupporterSettings";

export const dynamic = "force-dynamic";

/** Settings > Hearth Supporter. 404 when SUPPORTER_ENABLED is off. */
export default function SupporterSettingsPage() {
  if (!supporterEnabled()) notFound();
  return <SupporterSettings />;
}
