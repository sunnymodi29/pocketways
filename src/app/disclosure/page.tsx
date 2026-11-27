import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Affiliate disclosure", description: "How Pocketways earns money." };

export default function Page() {
  return (
    <LegalPage title="Affiliate disclosure" updated="November 2026">
      <p>Some links on Pocketways are affiliate links, mainly flight booking links. If you book through one, we may earn a commission at no extra cost to you.</p>
      <h2>What this does not change</h2>
      <ul>
        <li>Rankings and cost estimates are calculated from the same data for everyone. They are not influenced by commissions.</li>
        <li>Links marked as sponsored use rel=&quot;sponsored&quot;.</li>
      </ul>
      <p>Search links to stay, activity and map sites are plain links unless stated otherwise.</p>
    </LegalPage>
  );
}