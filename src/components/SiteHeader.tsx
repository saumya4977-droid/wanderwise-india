import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { user, signOut, loading } = useAuth();
  const nav = useNavigate();
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
        <div className="flex items-center gap-3">
          {!loading && user ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
              <button
                onClick={async () => { await signOut(); nav({ to: "/" }); }}
                className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
