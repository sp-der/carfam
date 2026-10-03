"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { filtersFromSearchParams } from "@/lib/inventory/filters";
import type { ChatReply } from "@/lib/chat/assistant";
import type { VehicleCard } from "@/lib/inventory/public";
import { VehiclePhoto } from "@/components/vehicles/vehicle-photo";

export function ChatWidget() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const [reply, setReply] = useState<ChatReply | null>(null);
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([
    { from: "Carfam", text: "Welcome to Carfam! What can I help you find?" },
  ]);
  const [cards, setCards] = useState<VehicleCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, cards]);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = input.current?.value.trim();
    if (!message || busy) return;
    if (input.current) input.current.value = "";
    setMessages((m) => [...m.slice(-19), { from: "You", text: message }]);
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          filters: pathname.startsWith("/pre-owned-cars")
            ? filtersFromSearchParams(params).filters
            : (reply?.filters ?? {}),
          lastResultIds: reply?.lastResultIds ?? [],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReply(result);
      setCards(result.cards);
      setMessages((m) => [...m, { from: "Carfam", text: result.message }]);
      if (result.navigate && result.href) router.push(result.href);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          from: "Carfam",
          text: e instanceof Error ? e.message : "Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }
  return (
    <>
      <button
        className="fixed bottom-24 right-4 z-40 rounded-full bg-graphite px-5 py-3 font-bold text-paper shadow-xl sm:bottom-6"
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        Find my ride ✦
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="chat-title"
        onClose={() => setOpen(false)}
        className="fixed inset-auto bottom-2 right-2 m-0 max-h-[calc(100dvh-1rem)] w-[min(26rem,calc(100vw-1rem))] max-w-none overflow-hidden rounded-xl border border-line bg-paper p-0 shadow-2xl sm:bottom-6 sm:right-6"
      >
        <header className="flex items-start justify-between gap-3 bg-graphite px-5 py-4 text-paper">
          <div>
            <h2 id="chat-title" className="font-display text-xl">
              Your Carfam copilot
            </h2>
            <p className="mt-1 text-xs text-fog">
              {reply?.mode === "ai"
                ? "AI-powered search · Demo inventory"
                : "Demo assistant · No live AI connection"}
            </p>
          </div>
          <button
            aria-label="Close chat"
            className="min-h-11 min-w-11"
            onClick={() => dialog.current?.close()}
          >
            ✕
          </button>
        </header>
        {open && (
          <>
            <div
              ref={log}
              className="max-h-[min(28rem,55dvh)] space-y-4 overflow-y-auto p-5"
              role="log"
              aria-label="Chat conversation"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.from === "You" ? "ml-8 rounded-xl bg-mist p-3" : "mr-4"
                  }
                >
                  <p className="mb-1 text-xs font-bold text-cyan-ink">
                    {m.from}
                  </p>
                  <p className="text-sm leading-relaxed">{m.text}</p>
                </div>
              ))}
              {cards.map((card) => (
                <Link
                  key={card.id}
                  href={card.href}
                  className="block rounded-lg border border-line p-3"
                  onClick={() => dialog.current?.close()}
                >
                  {card.image && (
                    <VehiclePhoto
                      src={card.image.src}
                      alt={card.image.alt}
                      use="thumb"
                      className="aspect-[4/3] w-full rounded object-cover"
                    />
                  )}
                  <p className="mt-2 font-bold">{card.title}</p>
                  <p>{card.salePriceLabel}</p>
                  <p className="text-xs text-slate">Includes doc/smog fees</p>
                </Link>
              ))}
              {reply?.href && (
                <Link
                  className="inline-flex min-h-11 items-center font-bold text-cyan-ink underline"
                  href={reply.href}
                  onClick={() => dialog.current?.close()}
                >
                  Open results / next step →
                </Link>
              )}
              {busy && (
                <p role="status" className="text-sm text-slate">
                  Searching…
                </p>
              )}
            </div>
            <form onSubmit={send} className="border-t border-line p-4">
              <label className="form-label">
                What are you looking for?
                <input
                  ref={input}
                  placeholder="Hondas under $15k"
                  maxLength={600}
                  required
                  autoComplete="off"
                />
              </label>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-slate">
                  No identity or credit details, please.
                </p>
                <button className="button" disabled={busy}>
                  Send
                </button>
              </div>
            </form>
          </>
        )}
      </dialog>
    </>
  );
}
