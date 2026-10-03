"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { FINANCE_LINKS } from "@/lib/finance";
import { ABOUT_LINKS } from "@/lib/dealership";
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
            {item.href === "/finance-your-car" ? <BranchMenu label="Finance" items={FINANCE_LINKS} /> : item.href === "/about-us" ? <BranchMenu label="About us" items={ABOUT_LINKS} /> : <Link
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-[0.9375rem] font-semibold text-paper/85 transition-colors hover:text-paper aria-[current=page]:text-cyan"
            >
              {item.label}
            </Link>}
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

function BranchMenu({ label, items, mobile = false }: { label: string; items: readonly { label: string; href: string }[]; mobile?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => { if (ref.current) ref.current.open = false; }, [pathname]);
  useEffect(() => {
    function closeOutside(event: PointerEvent) { if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false; }
    function escape(event: KeyboardEvent) { if (event.key === "Escape" && ref.current?.open) { ref.current.open = false; ref.current.querySelector("summary")?.focus(); } }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", escape); };
  }, []);
  return <details ref={ref} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
    <summary className={`${mobile ? "min-h-12 text-lg" : "min-h-11 text-[0.9375rem]"} flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-3 font-semibold hover:text-paper ${items.some((item) => item.href === pathname) ? "text-cyan" : "text-paper/85"}`}>{label} <span aria-hidden="true" className="text-xs">⌄</span></summary>
    <ul className={mobile ? "ml-3 border-l border-graphite-3 pl-2" : "absolute left-0 top-full z-50 w-80 rounded-xl border border-graphite-3 bg-graphite p-2 shadow-xl"}>{items.map((item) => <li key={item.href}><Link href={item.href} aria-current={pathname === item.href ? "page" : undefined} className="flex min-h-11 items-center rounded-md px-3 py-3 text-sm font-semibold text-paper/85 hover:bg-graphite-2 hover:text-paper aria-[current=page]:text-cyan">{item.label}</Link></li>)}</ul>
  </details>;
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
                    {item.href === "/finance-your-car" ? <BranchMenu label="Finance" items={FINANCE_LINKS} mobile /> : item.href === "/about-us" ? <BranchMenu label="About us" items={ABOUT_LINKS} mobile /> : <Link
                      href={item.href}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className="flex min-h-12 items-center rounded-md px-3 text-lg font-semibold hover:bg-graphite-2 aria-[current=page]:text-cyan"
                    >
                      {item.label}
                    </Link>}
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
