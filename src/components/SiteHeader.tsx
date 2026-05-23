import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { user, signOut, loading } = useAuth();
  const nav = useNavigate();

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
        <Link to="/" className="group flex items-baseline gap-2">
          <span className="display text-xl text-primary md:text-2xl">Travel Bharat</span>
          <span className="eyebrow hidden text-muted-foreground sm:inline">Est. 2026 · IN</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/cities" activeProps={{ className: "text-primary" }} className="hover:text-primary">Destinations</Link>
          <Link to="/compare" activeProps={{ className: "text-primary" }} className="hover:text-primary">Compare</Link>
          <Link to="/how-it-works" activeProps={{ className: "text-primary" }} className="hover:text-primary">How it works</Link>
          <Link to="/pricing" activeProps={{ className: "text-primary" }} className="hover:text-primary">Pricing</Link>
          <Link to="/guides" activeProps={{ className: "text-primary" }} className="hover:text-primary">For Guides</Link>
          {isAdmin && (
            <Link to="/admin/fares" activeProps={{ className: "text-primary" }} className="text-saffron hover:text-primary">Admin</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {!loading && user ? (
            <>
              <span className="hidden text-xs text-muted-foreground lg:inline">{user.email}</span>
              <button
                onClick={async () => { await signOut(); nav({ to: "/" }); }}
                className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-accent md:px-4 md:py-2 md:text-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 md:px-5 md:py-2 md:text-sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
