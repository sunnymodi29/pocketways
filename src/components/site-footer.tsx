import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line py-8 text-[13px] text-muted-foreground print:hidden">
      <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-3 px-4">
        <p>© {new Date().getFullYear()} Pocketways. Costs are estimates; always confirm before booking.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/guides" className="hover:text-primary">Guides</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy</Link>
          <Link href="/terms" className="hover:text-primary">Terms</Link>
          <Link href="/disclosure" className="hover:text-primary">Affiliate disclosure</Link>
        </nav>
      </div>
    </footer>
  );
}