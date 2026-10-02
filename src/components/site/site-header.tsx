import Image from "next/image";
import Link from "next/link";
import { DEALER, formatPhone, SNAPSHOT_NOTICE, telHref } from "@/lib/site";
import { PhoneIcon, PinIcon } from "@/components/icons";
import { MainNav, MobileMenu, SavedLink } from "./site-nav";

export function SiteHeader() {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-pink px-4 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <div className="on-dark bg-graphite-2 text-fog">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 text-xs sm:px-6">
          <p>
            <span className="font-semibold text-paper">Private demo.</span> {SNAPSHOT_NOTICE}
          </p>
          <div className="hidden items-center gap-5 md:flex">
            <a href={telHref(DEALER.salesPhone)} className="inline-flex items-center gap-1.5 hover:text-paper">
              <PhoneIcon className="size-3.5 text-cyan" />
              Sales {formatPhone(DEALER.salesPhone)}
            </a>
            <a
              href={DEALER.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-paper"
            >
              <PinIcon className="size-3.5 text-cyan" />
              {DEALER.street}, {DEALER.city}
            </a>
          </div>
        </div>
      </div>
      <header className="on-dark sticky top-0 z-40 border-b border-graphite-3 bg-graphite text-paper">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:h-[4.5rem]">
          <Link href="/" className="shrink-0 rounded-sm" aria-label="Carfam home">
            <Image
              src="/brand/carfam-logo.png"
              alt="Carfam"
              width={351}
              height={66}
              priority
              className="h-auto w-[132px] sm:w-[160px]"
            />
          </Link>
          <MainNav />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <SavedLink />
            <a
              href={telHref(DEALER.salesPhone)}
              className="hidden min-h-11 items-center gap-2 rounded-md bg-pink px-4 text-sm font-bold text-ink transition-colors hover:bg-pink-soft lg:inline-flex"
            >
              <PhoneIcon className="size-4" />
              Call sales
            </a>
            <MobileMenu />
          </div>
        </div>
      </header>
    </>
  );
}
