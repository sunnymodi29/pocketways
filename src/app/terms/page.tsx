import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage, Section } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using Pocketways: estimates, accounts, acceptable use, third-party services and liability.",
  alternates: { canonical: "/terms" },
};

const TOC = [
  ["agreement", "Agreement"], ["service", "The service"], ["estimates", "Estimates, not quotes"], ["accounts", "Accounts"],
  ["use", "Acceptable use"], ["content", "Your content"], ["thirdparty", "Third-party services"], ["travel", "Travel decisions"],
  ["ip", "Ownership and licence"], ["ending", "Ending your use"], ["warranty", "Disclaimers"], ["liability", "Liability"],
  ["law", "Governing law"], ["changes", "Changes"], ["contact", "Contact"],
] as const;

export default function Page() {
  return (
    <LegalPage
      title="Terms of use"
      current="/terms"
      toc={TOC}
      summary={
        <>
          <p>Pocketways helps you plan trips. Prices, times and plans are estimates, so check them before you book or travel.</p>
          <p>Use the service fairly, keep your account secure, and you are responsible for your own travel decisions.</p>
          <p>We provide the service as is, without guarantees, and our liability is limited as set out below.</p>
        </>
      }
    >
      <Section id="agreement" n={1} title="Agreement">
        <p>These terms are an agreement between you and {LEGAL.operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) for the use of {LEGAL.product} and its website. By using the service you accept them, together with our <Link href="/privacy">Privacy policy</Link> and <Link href="/disclosure">Affiliate disclosure</Link>. If you do not agree, please do not use it.</p>
        <p>You must be able to form a binding contract where you live. If you are under 18, use the service only with a parent or guardian&apos;s permission.</p>
      </Section>

      <Section id="service" n={2} title="The service">
        <p>Pocketways suggests destinations, estimates trip costs, shows weather and travel options, and builds itineraries you can edit, share, export and add to a calendar. It also offers polls and optional accounts. We may add, change or remove features at any time.</p>
      </Section>

      <Section id="estimates" n={3} title="Estimates, not quotes">
        <p>Costs, travel times, weather labels, rankings, distances and itineraries are estimates built from typical prices and general information. They are not quotes, offers or advice. Fares marked LIVE come from a provider and can change or sell out at any moment. Opening times, entry rules, permits, visa requirements and safety conditions change, so <b>confirm everything before you book or travel</b>.</p>
        <p>Destination content is written in good faith. If you find a mistake, please tell us.</p>
      </Section>

      <Section id="accounts" n={4} title="Accounts">
        <p>You can use most of Pocketways without an account. To sign in you use your Google account. You are responsible for activity under your account and for keeping your Google credentials secure. Tell us promptly if you suspect misuse. You can delete your account at any time from the account page.</p>
      </Section>

      <Section id="use" n={5} title="Acceptable use">
        <p>Do not:</p>
        <ul>
          <li>break the law, or use the service to harass, defraud or harm others;</li>
          <li>spam polls, vote automatically, or try to manipulate results;</li>
          <li>probe, scan or test the service for weaknesses without permission, or interfere with its operation;</li>
          <li>scrape or copy the service at a rate or scale that harms it, or use it to build a competing dataset;</li>
          <li>upload unlawful, hateful or infringing content, or content you have no right to share;</li>
          <li>bypass rate limits or access controls.</li>
        </ul>
        <p>We may limit, suspend or remove access, and remove content, if these rules are broken or to protect the service and other users.</p>
      </Section>

      <Section id="content" n={6} title="Your content">
        <p>You keep ownership of what you create, such as itinerary edits, saved trips, and poll titles and names. You give us a limited licence to store, process and display it only as needed to run the service for you and the people you share it with. Poll links are accessible to anyone who has the link, so do not put private information in a poll.</p>
      </Section>

      <Section id="thirdparty" n={7} title="Third-party services and links">
        <p>Pocketways works with other services, including Google (sign-in and Calendar), Unsplash (photos), Open-Meteo (weather), Travelpayouts (fares), and booking, stay and map sites we link to. We do not control them and are not responsible for their content, prices, availability or practices. Your dealings with them, including any booking, are between you and them and are subject to their terms. Photos belong to their photographers and are shown with credit.</p>
      </Section>

      <Section id="travel" n={8} title="Travel decisions">
        <p>Pocketways is not a travel agency or tour operator and does not sell tickets, stays or insurance. Travel carries risk. You are responsible for your documents, health, safety, insurance, bookings and compliance with local laws. Follow official travel advisories for your destination.</p>
      </Section>

      <Section id="ip" n={9} title="Ownership and licence">
        <p>The Pocketways source code is available under the MIT licence in our public repository. The Pocketways name, logo and destination content are ours or used with permission, and you may not use them in a way that suggests endorsement. Third-party names and logos (such as WhatsApp and Google) belong to their owners and are used only to identify those services.</p>
      </Section>

      <Section id="ending" n={10} title="Ending your use">
        <p>You can stop using the service at any time and delete your account from the account page. We may suspend or end access if you break these terms or if we have to stop the service. Sections that by their nature should continue (such as disclaimers and liability) survive.</p>
      </Section>

      <Section id="warranty" n={11} title="Disclaimers">
        <p>The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the fullest extent the law allows, we make no promises that it will be uninterrupted, error-free or accurate, or that any estimate, price, forecast or itinerary will be correct, complete or suitable for you. Nothing here limits rights you have by law that cannot be excluded.</p>
      </Section>

      <Section id="liability" n={12} title="Limit of liability">
        <p>To the fullest extent the law allows, we are not liable for indirect, incidental, special or consequential losses, lost bookings, lost profits, or costs arising from relying on estimates or third-party services. Our total liability for any claim relating to the service is limited to the greater of the amount you paid us in the last 12 months (which is nothing, as the service is free) and INR 1,000. This does not exclude liability that cannot be excluded by law, such as for fraud or death or personal injury caused by negligence.</p>
      </Section>

      <Section id="law" n={13} title="Governing law">
        <p>These terms are governed by the laws of {LEGAL.jurisdiction}. Courts in {LEGAL.jurisdiction} have jurisdiction over disputes, unless mandatory consumer law where you live says otherwise. Please contact us first so we can try to resolve any problem informally.</p>
      </Section>

      <Section id="changes" n={14} title="Changes to these terms">
        <p>We may update these terms. The date at the top shows the latest version. If a change is significant we will tell signed-in users in advance. Continuing to use the service after a change means you accept it.</p>
      </Section>

      <Section id="contact" n={15} title="Contact">
        <p>Questions about these terms: <Contact />.</p>
      </Section>
    </LegalPage>
  );
}
