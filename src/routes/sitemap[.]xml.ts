import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { cities } from "@/data/cities";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", priority: "1.0", changefreq: "weekly" as const },
          { path: "/cities", priority: "0.9", changefreq: "weekly" as const },
          { path: "/pricing", priority: "0.8", changefreq: "monthly" as const },
          { path: "/how-it-works", priority: "0.7", changefreq: "monthly" as const },
          { path: "/guides", priority: "0.7", changefreq: "monthly" as const },
          ...cities.map((c) => ({ path: `/cities/${c.slug}`, priority: "0.8", changefreq: "weekly" as const })),
        ];
        const urls = entries.map((e) =>
          `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
