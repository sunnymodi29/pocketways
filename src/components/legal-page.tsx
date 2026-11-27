import Link from "next/link";
import { LEGAL } from "@/lib/legal-config";
import { Header } from "./header";
import { SectionNav } from "./section-nav";
import { SiteFooter } from "./site-footer";

const DOCS = [["/privacy", "Privacy policy"], ["/terms", "Terms of use"], ["/disclosure", "Affiliate disclosure"]] as const;

/**
 * Shared layout for the legal documents: title, effective date, a plain-English summary,
 * a sticky table of contents and the numbered sections.
 */
export function LegalPage({ title, summary, toc, current, children }: {
  title: string;
  summary: React.ReactNode;
  /** [id, label] for each <Section> below, in order */
  toc: readonly (readonly [string, string])[];
  current: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto w-full max-w-[960px] px-4 pt-[92px]">
        <p className="mb-4 text-[13px] text-muted-foreground"><Link href="/" className="hover:text-primary">Home</Link> › {title}</p>
        <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Effective {LEGAL.effective} · Last updated {LEGAL.updated}</p>

        <nav aria-label="Legal documents" className="mt-4 flex flex-wrap gap-1.5">
          {DOCS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={href === current ? "page" : undefined}
              className={href === current ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground" : "rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"}>
              {label}
            </Link>
          ))}
        </nav>

        <aside className="mt-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold">In short</h2>
          <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-muted-foreground">{summary}</div>
        </aside>

        <div className="mt-8 grid gap-8 lg:grid-cols-[200px_1fr]">
          <SectionNav items={toc} orientation="vertical" className="sticky top-[92px] hidden self-start lg:flex" />
          <div className="min-w-0 pb-4">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** One numbered section. Pass the same id and title in `toc`. */
export function Section({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-line py-6 first:pt-0 last:border-b-0">
      <h2 className="text-lg font-semibold tracking-tight"><span className="mr-2 text-muted-foreground">{n}.</span>{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_b]:font-semibold [&_b]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

/** Small responsive table for data categories, cookies and providers. */
export function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[520px] text-left text-[13px]">
        <thead className="bg-surface-2 text-xs text-muted-foreground">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line align-top">
              {r.map((c, j) => <td key={j} className={j === 0 ? "px-4 py-2.5 font-medium text-foreground" : "px-4 py-2.5"}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Contact line that works whether or not an address is configured. */
export function Contact() {
  return LEGAL.email ? <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> : <span>the contact address shown on this page once published</span>;
}
