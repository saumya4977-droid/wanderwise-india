import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WhatsAppFab } from "@/components/WhatsAppFab";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <span className="eyebrow text-saffron">404 — wrong turn</span>
      <h1 className="display mt-4 text-7xl text-primary">Lost on the road.</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        That page packed up and left town. Let's get you back to somewhere worth visiting.
      </p>
      <Link to="/" className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Back to Travel Bharat
      </Link>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  console.error(error);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="display text-4xl text-primary">Something went sideways.</h1>
      <p className="mt-3 text-sm text-muted-foreground">Try refreshing the page.</p>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Travel Bharat — Every place in India, decoded." },
      { name: "description", content: "Plan smarter trips across India. Real-time weather, transport fares, stays and local guides — from Manali to Munnar." },
      { name: "author", content: "Travel Bharat" },
      { property: "og:title", content: "Travel Bharat — Every place in India, decoded." },
      { property: "og:description", content: "Real-time weather, transport fares, stays and local guides for 40+ destinations across India." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1"><Outlet /></main>
        <SiteFooter />
        <WhatsAppFab />
      </div>
    </QueryClientProvider>
  );
}
