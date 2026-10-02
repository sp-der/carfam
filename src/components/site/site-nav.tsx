"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { CloseIcon, HeartIcon, MenuIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { useList } from "@/components/shopping/shopping-store";
import { DEALER, formatPhone, MAIN_NAV, telHref } from "@/lib/site";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {MAIN_NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-[0.9375rem] font-semibold text-paper/85 transition-colors hover:text-paper aria-[current=page]:text-cyan"
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/contact-us"
            className="inline-flex min-h-11 items-center rounded-md px-3 text-[0.9375rem] font-semibold text-paper/85 transition-colors hover:text-paper"
          >
            Contact
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function SavedLink() {
  const count = useList("saved").length;
  return (
    <Link
      href="/saved"
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-semibold text-paper/85 hover:text-paper"
      aria-label={count ? `Saved vehicles (${count})` : "Saved vehicles"}
    >
      <HeartIcon filled={count > 0} className={`size-5 ${count ? "text-pink" : ""}`} />
      <span className="hidden sm:inline">Saved</span>
      {count ? (
        <span className="tabular grid min-w-5 place-items-center rounded-full bg-pink px-1 text-[0.6875rem] font-bold text-ink">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function MobileMenu() {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Close after navigation.
  useEffect(() => {
    ref.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-paper lg:hidden"
        aria-label="Open menu"
        aria-haspopup="dialog"
      >
        <MenuIcon className="size-6" />
      </button>
      <dialog
        ref={ref}
        aria-label="Menu"
        onClick={(e) => {
          if (e.target === ref.current) ref.current.close();
        }}
        className="on-dark m-0 ml-auto h-dvh max-h-none w-[min(22rem,100vw)] max-w-none bg-graphite p-0 text-paper"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-graphite-3 px-4">
            <p className="font-display text-lg">Menu</p>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md"
              aria-label="Close menu"
            >
              <CloseIcon className="size-6" />
            </button>
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
            <ul>
              {[...MAIN_NAV, { label: "Saved vehicles", href: "/saved" }, { label: "Contact", href: "/contact-us" }].map(
                (item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className="flex min-h-12 items-center rounded-md px-3 text-lg font-semibold hover:bg-graphite-2 aria-[current=page]:text-cyan"
                    >
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
          <div className="space-y-2 border-t border-graphite-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm">
            <a
              href={telHref(DEALER.salesPhone)}
              className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-pink font-bold text-ink"
            >
              <PhoneIcon className="size-4" />
              Call sales {formatPhone(DEALER.salesPhone)}
            </a>
            <a
              href={DEALER.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center gap-2 text-fog hover:text-paper"
            >
              <PinIcon className="size-4 text-cyan" />
              {DEALER.street}, {DEALER.city}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
