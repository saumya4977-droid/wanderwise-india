import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="group flex items-baseline gap-2">
          <span className="display text-2xl text-primary">Travel Bharat</span>
          <span className="eyebrow text-muted-foreground">Est. 2026 · IN</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex">
          <Link to="/cities" activeProps={{ className: "text-primary" }} className="hover:text-primary">Destinations</Link>
          <Link to="/how-it-works" activeProps={{ className: "text-primary" }} className="hover:text-primary">How it works</Link>
          <Link to="/pricing" activeProps={{ className: "text-primary" }} className="hover:text-primary">Pricing</Link>
          <Link to="/guides" activeProps={{ className: "text-primary" }} className="hover:text-primary">For Guides</Link>
        </nav>
        <Link to="/pricing" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
          Start exploring
        </Link>
      </div>
    </header>
  );
}
