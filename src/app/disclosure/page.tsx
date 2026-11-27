import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage, Section } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Affiliate disclosure",
  description: "How Pocketways earns money from affiliate links, and why that does not change what we recommend.",
  alternates: { canonical: "/disclosure" },
};

const TOC = [["earn", "How we earn"], ["links", "Which links"], ["independence", "Our independence"], ["data", "Data and cookies"], ["contact", "Contact"]] as const;

export default function Page() {
  return (
    <LegalPage
      title="Affiliate disclosure"
      current="/disclosure"
      toc={TOC}
      summary={
        <>
          <p>Some links on Pocketways, mostly flight booking links, are affiliate links. If you book through one we may earn a commission, at no extra cost to you.</p>
          <p>Commissions do not affect how trips are ranked or what the cost estimates say.</p>
        </>
      }
    >
      <Section id="earn" n={1} title="How we earn">
        <p>Pocketways is free to use. We may earn a small commission when you click certain links and then make a booking or purchase with a partner. The price you pay is the same with or without our link.</p>
      </Section>

      <Section id="links" n={2} title="Which links">
        <ul>
          <li><b>Flight booking links</b> shown next to live fares are affiliate links through our fares partner (Travelpayouts). They are marked as sponsored and open in a new tab.</li>
          <li><b>Search links</b> to stay, activity, map and review sites are plain links unless we say otherwise on the link itself.</li>
          <li><b>Share links</b> (WhatsApp, calendar, copy) are not affiliate links.</li>
        </ul>
        <p>If we add more affiliate partners we will mark those links in the same way and update this page.</p>
      </Section>

      <Section id="independence" n={3} title="Our independence">
        <ul>
          <li>Rankings, match scores and cost estimates come from the same data and rules for everyone. They are not influenced by commissions.</li>
          <li>We do not accept payment to feature a destination or partner in results.</li>
          <li>Estimates are not quotes. Prices at a partner can differ from what we show, so check the final price before you book. See the <Link href="/terms">Terms of use</Link>.</li>
        </ul>
      </Section>

      <Section id="data" n={4} title="Data and cookies">
        <p>When you click an affiliate link, the partner may set cookies on its own site to credit us for the booking. We do not receive your booking details or personal data from them. How partners handle your data is covered by their privacy policies. For what we collect ourselves, see our <Link href="/privacy">Privacy policy</Link>.</p>
      </Section>

      <Section id="contact" n={5} title="Contact">
        <p>Questions about how we earn money: <Contact />.</p>
      </Section>
    </LegalPage>
  );
}
