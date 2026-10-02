"use client";

import { useEffect, useState } from "react";
import { clearList, restoreList, type ListName } from "./shopping-store";

const UNDO_MS = 8000;

/** Clearing saved/compare lists is undoable for a few seconds instead of asking for confirmation. */
export function useClearWithUndo(name: ListName) {
  const [cleared, setCleared] = useState<readonly string[] | null>(null);

  useEffect(() => {
    if (!cleared) return;
    const t = window.setTimeout(() => setCleared(null), UNDO_MS);
    return () => window.clearTimeout(t);
  }, [cleared]);

  return {
    clear: () => setCleared(clearList(name)),
    undo: () => {
      if (cleared) restoreList(name, cleared);
      setCleared(null);
    },
    cleared,
  };
}

export function UndoNotice({ message, onUndo, dark = false }: { message: string; onUndo: () => void; dark?: boolean }) {
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-3 rounded-md px-4 py-2 text-sm ${dark ? "bg-graphite-2 text-paper" : "bg-mist text-ink"}`}
    >
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onUndo}
        className={`min-h-11 px-2 font-bold underline-offset-4 hover:underline ${dark ? "text-cyan" : "text-cyan-ink"}`}
      >
        Undo
      </button>
    </div>
  );
}
