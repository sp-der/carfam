"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import "./opening-animation.css";

const SESSION_KEY = "carfam-opening-seen-v1";
const DURATION = 1500;
// Covers unavailable sessionStorage while this site layout stays mounted.
let shownInMemory = false;

export function OpeningAnimation() {
  const pathname = usePathname();
  const entryPath = useRef(pathname);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only an entry at the homepage gets an intro; navigating back never starts one.
    if (entryPath.current !== "/" || shownInMemory) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // Storage can be disabled; the in-memory guard still prevents repeat playback.
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const dismiss = () => {
      cancelled = true;
      setVisible(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") dismiss();
    };
    const onMotionChange = () => {
      if (motion.matches) dismiss();
    };
    // No server overlay: content remains usable without JS or if initialization fails.
    const frame = requestAnimationFrame(() => {
      if (
        cancelled ||
        document.visibilityState !== "visible" ||
        document.activeElement !== document.body
      )
        return;
      shownInMemory = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {}
      setVisible(true);
      timer = setTimeout(dismiss, DURATION);
    });
    window.addEventListener("keydown", keyboard);
    window.addEventListener("click", dismiss, { once: true });
    motion.addEventListener("change", onMotionChange);
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("click", dismiss);
      motion.removeEventListener("change", onMotionChange);
    };
  }, []);

  if (pathname !== "/" || !visible) return null;
  return (
    <div className="carfam-opening" data-testid="carfam-opening">
      <div className="carfam-opening__scene" aria-hidden="true">
        <div className="carfam-opening__halo" />
        <div className="carfam-opening__beam carfam-opening__beam--left" />
        <div className="carfam-opening__beam carfam-opening__beam--right" />
        <div className="carfam-opening__logo">
          <Image
            src="/brand/carfam-logo.png"
            alt=""
            width={351}
            height={66}
            priority
            sizes="(max-width: 640px) 68vw, 351px"
          />
        </div>
        <div className="carfam-opening__horizon" />
      </div>
      <button
        className="carfam-opening__skip"
        type="button"
        onClick={() => setVisible(false)}
      >
        Skip intro <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}
