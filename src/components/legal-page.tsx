import { Header } from "./header";
import { SiteFooter } from "./site-footer";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto w-full max-w-[760px] px-4 pt-[92px]">
        <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-medium tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}