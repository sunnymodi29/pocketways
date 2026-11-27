import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage, Section, Table } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Pocketways collects, why, who it is shared with, how long it is kept and how to delete it.",
  alternates: { canonical: "/privacy" },
};

const TOC = [
  ["who", "Who we are"], ["collect", "What we collect"], ["use", "How we use it"], ["google", "Google user data"],
  ["sharing", "Who we share it with"], ["storage", "Cookies and local storage"], ["retention", "How long we keep it"],
  ["rights", "Your rights and choices"], ["security", "Security"], ["children", "Children"],
  ["transfers", "International transfers"], ["changes", "Changes"], ["contact", "Contact"],
] as const;

export default function Page() {
  return (
    <LegalPage
      title="Privacy policy"
      current="/privacy"
      toc={TOC}
      summary={
        <>
          <p>You can use Pocketways without an account. If you sign in with Google we store your name, email and photo so your trips follow you across devices.</p>
          <p>We do not sell your data, show ads, or run advertising trackers. Calendar access is optional, and we only ever create the events you ask for.</p>
          <p>You can export or delete your data yourself from the account page.</p>
        </>
      }
    >
      <Section id="who" n={1} title="Who we are">
        <p>{LEGAL.product} is a trip-planning service run by {LEGAL.operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We decide how and why your personal data is used, which makes us the data controller (&ldquo;data fiduciary&rdquo; under India&apos;s Digital Personal Data Protection Act, 2023). Contact details are in section 13.</p>
      </Section>

      <Section id="collect" n={2} title="What we collect">
        <Table
          head={["Data", "Details", "When"]}
          rows={[
            ["Account details", "Name, email address, profile photo link and Google account ID, supplied by Google when you sign in. Date the account was created.", "Only if you sign in"],
            ["Sessions", "A session token and its expiry so you stay signed in.", "Only if you sign in"],
            ["Google Calendar access", "An access token and refresh token, and the permission granted, so we can add events when you ask.", "Only if you allow calendar access"],
            ["Your plans", "Saved trips and itineraries you edited (as you changed them).", "Stored on your device; synced to your account if you sign in"],
            ["Polls", "Poll title, the trips offered, when voting closes, votes, optional display names, and a random voter ID kept in your browser. When you are signed in, polls you create and votes you cast are also linked to your account, so they appear under My polls, and your first name is shown on polls you create and next to votes you cast.", "Only if you create or vote in a poll"],
            ["Technical data", "IP address, browser type and pages requested, in hosting logs. Hourly request counters tied to an IP address, used only to limit abuse.", "Automatically, when you use the site"],
            ["Messages to us", "Whatever you send if you contact us.", "Only if you contact us"],
          ]}
        />
        <p>We do not ask for your phone number, payment details or exact location. Nothing in Pocketways uses your device&apos;s location.</p>
      </Section>

      <Section id="use" n={3} title="How we use it">
        <ul>
          <li><b>To run the service:</b> sign you in, keep your saved trips and edits, and run polls.</li>
          <li><b>To do what you ask:</b> add itinerary days to your Google Calendar, show weather and photos for a destination, check flight fares.</li>
          <li><b>To keep it safe:</b> limit abuse, find and fix faults, and protect accounts.</li>
          <li><b>To improve it:</b> understand errors and general usage from server logs. We do not build advertising profiles.</li>
        </ul>
        <p>Where the law requires a legal basis (for example GDPR), we rely on performing the service you asked for, our legitimate interest in keeping it secure, and your consent for optional things such as calendar access. Under India&apos;s DPDP Act we process your data with your consent or for the limited purposes the Act allows. You can withdraw consent at any time (see section 8).</p>
      </Section>

      <Section id="google" n={4} title="Google user data">
        <p>If you sign in with Google we receive your name, email address and profile photo. If you choose to allow calendar access, we also request the <b>calendar.events</b> permission.</p>
        <ul>
          <li>We use calendar access <b>only</b> to create all-day events for the itinerary days you choose to add. We do not read, edit or delete your existing events.</li>
          <li>We do not use Google user data for advertising, and we do not sell it or give it to data brokers.</li>
          <li>No person at Pocketways reads your Google data, except where needed for security, to comply with the law, or with your consent.</li>
        </ul>
        <p>Pocketways&apos; use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
        <p>You can disconnect calendar access on your <Link href="/account">account page</Link>, or revoke Pocketways under <i>Third-party access</i> in your Google Account security settings.</p>
      </Section>

      <Section id="sharing" n={5} title="Who we share it with">
        <p>We do not sell personal data. We use these providers to run the service, and they process data on our behalf:</p>
        <Table
          head={["Provider", "What for", "What they receive"]}
          rows={[
            ["Vercel", "Hosting and delivery", "Requests to the site, including IP address and browser details"],
            ["Neon", "Database", "Account, session, saved trip, edit and poll data"],
            ["Google", "Sign-in and Calendar", "Your sign-in; calendar events you ask us to create"],
            ["Unsplash", "Destination photos", "We ask for photos by destination name. Your browser then loads images from Unsplash, so Unsplash can see your IP address"],
            ["Open-Meteo", "Weather forecasts", "Destination coordinates only. Nothing about you"],
            ["Travelpayouts", "Live flight fares", "A route and month. Nothing about you"],
          ]}
        />
        <p>Links to booking, stay, map and activity sites leave Pocketways. Those sites have their own privacy policies. Flight booking links may be affiliate links (see the <Link href="/disclosure">affiliate disclosure</Link>).</p>
        <p>We may disclose data if the law requires it, or to protect the rights, safety and security of our users and the service.</p>
      </Section>

      <Section id="storage" n={6} title="Cookies and local storage">
        <p>We use only what the service needs. There are no advertising or analytics cookies.</p>
        <Table
          head={["Name", "Purpose", "Type"]}
          rows={[
            ["Session and sign-in cookies (authjs.*)", "Keep you signed in and protect the sign-in flow from forgery", "Essential cookie, set when you sign in"],
            ["Saved trips and itinerary edits", "Remember your trips and changes on this device", "Local storage"],
            ["Theme", "Remember light or dark mode", "Local storage"],
            ["Poll voter ID and name", "Recognise your vote in a poll so you can change it", "Local storage"],
          ]}
        />
        <p>You can clear these at any time in your browser settings. Clearing local storage removes saved trips that are not synced to an account.</p>
      </Section>

      <Section id="retention" n={7} title="How long we keep it">
        <ul>
          <li><b>Account, saved trips and edits:</b> until you delete your account.</li>
          <li><b>Sessions:</b> until they expire or you sign out.</li>
          <li><b>Calendar tokens:</b> until you disconnect calendar access or delete your account. Disconnecting asks Google to revoke them.</li>
          <li><b>Polls and votes:</b> around {LEGAL.pollRetentionDays} days after the poll is created, after which they are removed.</li>
          <li><b>Hosting logs:</b> kept by our hosting provider for a short period under its own retention settings.</li>
        </ul>
      </Section>

      <Section id="rights" n={8} title="Your rights and choices">
        <p>Depending on where you live (including under India&apos;s DPDP Act and the GDPR) you can ask us to access, correct, export or erase your personal data, object to or restrict some processing, withdraw consent, and complain to a data protection authority.</p>
        <ul>
          <li><b>Export:</b> use <i>Export my data</i> on the <Link href="/account">account page</Link>.</li>
          <li><b>Correct:</b> change your display name on the account page.</li>
          <li><b>Delete:</b> use <i>Delete account</i> on the account page. It removes your profile, sessions, synced data and Google access.</li>
          <li><b>Withdraw calendar consent:</b> use <i>Disconnect</i> next to Google Calendar on the account page.</li>
          <li><b>Polls:</b> to remove a poll before it expires, contact us with its link.</li>
        </ul>
        <p>For anything else, or if you are unhappy with how we handled a request, write to us (section 13). We reply within 30 days.</p>
      </Section>

      <Section id="security" n={9} title="Security">
        <p>The site is served over HTTPS. Data is stored in a managed database, session cookies are protected, and access to production systems is limited to the person running the service. No method of transmission or storage is completely secure, so we cannot guarantee absolute security. If a breach affects your data we will tell you and the authorities as the law requires.</p>
      </Section>

      <Section id="children" n={10} title="Children">
        <p>Pocketways is not directed at children. If you are under 18, please use it with a parent or guardian. We do not knowingly collect personal data from children. If you think a child has given us data, contact us and we will delete it.</p>
      </Section>

      <Section id="transfers" n={11} title="International transfers">
        <p>Our providers may process data in other countries, including the United States and the region where our database is hosted. Where the law requires it, we rely on the safeguards those providers offer, such as standard contractual clauses.</p>
      </Section>

      <Section id="changes" n={12} title="Changes to this policy">
        <p>We will update this page when our practices change and show the new date at the top. If a change is significant we will tell signed-in users before it takes effect.</p>
      </Section>

      <Section id="contact" n={13} title="Contact">
        <p>Questions, requests and complaints about privacy: write to <Contact />. This is also our grievance contact under the DPDP Act, 2023.</p>
      </Section>
    </LegalPage>
  );
}
