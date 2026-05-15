import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-[oklch(0.97_0.012_90)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <div className="display text-3xl text-primary">Travel Bharat</div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Every place in India — from the famous to the forgotten. Real fares, real weather, real guides.
          </p>
        </div>
        <div>
          <div className="eyebrow text-muted-foreground">Explore</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/cities" className="hover:text-primary">All destinations</Link></li>
            <li><Link to="/how-it-works" className="hover:text-primary">How it works</Link></li>
            <li><Link to="/guides" className="hover:text-primary">Become a guide</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow text-muted-foreground">Plans</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/pricing" className="hover:text-primary">₹199 · One place</Link></li>
            <li><Link to="/pricing" className="hover:text-primary">₹299 · Two places</Link></li>
            <li><Link to="/pricing" className="hover:text-primary">₹799 · All of India</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow text-muted-foreground">Talk to us</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="https://wa.me/916299605774" className="hover:text-primary">WhatsApp · 6299605774</a></li>
            <li><a href="mailto:hello@travelbharat.app" className="hover:text-primary">hello@travelbharat.app</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Travel Bharat — made with care, for India.
      </div>
    </footer>
  );
}
