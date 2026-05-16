import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or register — Travel Bharat" },
      { name: "description", content: "Create your Travel Bharat account or sign in to plan trips and register as a local guide." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) nav({ to: "/" }); }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, whatsapp },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr(null);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setErr(r.error.message ?? "Google sign-in failed");
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <span className="eyebrow text-saffron">{mode === "signup" ? "Register" : "Welcome back"}</span>
      <h1 className="display mt-3 text-5xl text-primary">
        {mode === "signup" ? <>Plan India<br/><em className="display-italic">properly.</em></> : <>Sign in.</>}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {mode === "signup"
          ? "Create a free account as a tourist. You can register as a local guide later."
          : "Welcome back to Travel Bharat."}
      </p>

      <button onClick={google} className="mt-8 w-full rounded-full border border-border bg-card py-3 text-sm font-medium hover:bg-accent">
        Continue with Google
      </button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <>
            <input required placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} className="input" />
            <input placeholder="WhatsApp number (optional)" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="input" />
          </>
        )}
        <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
        <input required type="password" minLength={6} placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} className="input" />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button disabled={busy} className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setErr(null); }} className="mt-6 text-sm text-muted-foreground hover:text-primary">
        {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
      <Link to="/" className="mt-2 text-xs text-muted-foreground hover:text-primary">← Back home</Link>

      <style>{`
        .input { width: 100%; border-radius: 12px; background: oklch(0.94 0.012 90); padding: 10px 14px; outline: none; font-size: 14px; }
        .input:focus { box-shadow: 0 0 0 2px var(--ring); }
      `}</style>
    </div>
  );
}
