import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms of use", description: "The rules for using Pocketways." };

export default function Page() {
  return (
    <LegalPage title="Terms of use" updated="November 2026">
      <p>By using Pocketways you agree to these terms.</p>
      <h2>Estimates, not offers</h2>
      <p>Trip costs, travel times, weather labels and itineraries are estimates built from typical prices and distances. They are not quotes. Fares marked LIVE come from a provider and can change or sell out at any time. Always confirm prices, visa rules, permits and opening times before you book or travel.</p>
      <h2>Your responsibility</h2>
      <p>You are responsible for your travel decisions, documents and safety. Pocketways is not a travel agency and does not sell tickets or stays.</p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Do not misuse polls (spam, harassment or automated voting).</li>
        <li>Do not attempt to disrupt or scrape the service at a rate that harms it.</li>
      </ul>
      <h2>Third-party links</h2>
      <p>We link to services we do not control. We are not responsible for their content, prices or availability.</p>
      <h2>Liability</h2>
      <p>The service is provided as is. To the extent allowed by law, we are not liable for losses arising from reliance on the information shown.</p>
      <h2>Changes</h2>
      <p>We may update these terms; the date above shows the latest version.</p>
    </LegalPage>
  );
}