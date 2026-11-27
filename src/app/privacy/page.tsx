import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Privacy policy", description: "What Pocketways stores, what it shares and your choices." };

export default function Page() {
  return (
    <LegalPage title="Privacy policy" updated="November 2026">
      <p>Pocketways is a trip-planning tool. We collect as little as we can to make it work.</p>
      <h2>What stays on your device</h2>
      <p>Your filters, saved trips and recent choices are stored in your browser (local storage). We do not receive them unless you share a link or create a poll.</p>
      <h2>What we store on our servers</h2>
      <ul>
        <li>Polls you create: the destinations in the poll, votes, and any display name voters type in.</li>
        <li>Standard server logs (IP address, browser, pages requested) kept for security and debugging.</li>
      </ul>
      <h2>Third parties</h2>
      <p>Flight fares come from a fares provider. We call it from our server, so your browser never sees our API token. Links to booking, stay and map sites leave Pocketways, and those sites have their own privacy policies.</p>
      <h2>Cookies and analytics</h2>
      <p>We use essential storage only (theme, saved trips). If analytics are added later, this page will say so first.</p>
      <h2>Your choices</h2>
      <p>You can clear saved trips from the My trips panel or by clearing site data in your browser. To ask for a poll to be deleted, contact us with its link.</p>
      <h2>Contact</h2>
      <p>{process.env.NEXT_PUBLIC_CONTACT_EMAIL ? <>Write to <a className="text-primary" href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}>{process.env.NEXT_PUBLIC_CONTACT_EMAIL}</a>.</> : "Contact details will be listed here before launch."}</p>
    </LegalPage>
  );
}