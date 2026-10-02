import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export const metadata = { title: "Page not found" };

/** Real 404 (unknown routes are never redirected to the homepage). */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 lg:py-28">
          <p className="text-sm font-semibold text-cyan-ink">Error 404</p>
          <h1 className="font-display mt-2 text-4xl leading-tight sm:text-5xl">We couldn’t find that page.</h1>
          <p className="mt-4 max-w-prose text-lg text-slate">
            The link may be old, or the page may not be part of this demo yet. Inventory and vehicle pages are a good
            place to start.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pre-owned-cars"
              className="inline-flex min-h-12 items-center rounded-md bg-pink px-5 font-bold text-ink hover:bg-pink-soft"
            >
              Browse inventory
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center rounded-md border border-line px-5 font-semibold hover:border-ink"
            >
              Go to the homepage
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
