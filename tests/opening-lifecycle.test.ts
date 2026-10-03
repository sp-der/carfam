import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleOpening } from "../src/components/site/opening-lifecycle";

afterEach(() => vi.useRealTimers());
function harness(initialVisibility = true) {
  vi.useFakeTimers();
  let visible = initialVisibility;
  let observer = () => {};
  const show = vi.fn(),
    hide = vi.fn(),
    unobserve = vi.fn();
  const stop = scheduleOpening({
    isVisible: () => visible,
    frame: (callback) => Number(setTimeout(callback, 16)),
    cancelFrame: (id) => clearTimeout(id),
    observeVisibility: (callback) => {
      observer = callback;
      return unobserve;
    },
    timeout: setTimeout,
    clearTimeout,
    show,
    hide,
  });
  return {
    show,
    hide,
    stop,
    unobserve,
    visibility: (next: boolean) => {
      visible = next;
      observer();
    },
  };
}

describe("opening playback lifecycle", () => {
  it("shows for 1.5 seconds after the visible frame", () => {
    const h = harness();
    vi.advanceTimersByTime(16);
    expect(h.show).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1499);
    expect(h.hide).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(h.hide).toHaveBeenCalledOnce();
  });
  it("waits for a background tab instead of silently abandoning playback", () => {
    const h = harness(false);
    vi.advanceTimersByTime(5000);
    expect(h.show).not.toHaveBeenCalled();
    h.visibility(true);
    vi.advanceTimersByTime(16);
    expect(h.show).toHaveBeenCalledOnce();
  });
  it("retries if the tab becomes hidden before its scheduled frame", () => {
    const h = harness();
    h.visibility(false);
    vi.advanceTimersByTime(16);
    expect(h.show).not.toHaveBeenCalled();
    h.visibility(true);
    vi.advanceTimersByTime(16);
    expect(h.show).toHaveBeenCalledOnce();
  });
  it("cannot double-start on repeated visibility events", () => {
    const h = harness();
    h.visibility(true);
    h.visibility(true);
    vi.advanceTimersByTime(16);
    h.visibility(false);
    h.visibility(true);
    vi.advanceTimersByTime(2000);
    expect(h.show).toHaveBeenCalledOnce();
    expect(h.hide).toHaveBeenCalledOnce();
  });
  it("cancels pending frames, timers and visibility observation", () => {
    const h = harness();
    h.stop();
    h.visibility(true);
    vi.advanceTimersByTime(2000);
    expect(h.show).not.toHaveBeenCalled();
    expect(h.unobserve).toHaveBeenCalledOnce();
    const running = harness();
    vi.advanceTimersByTime(16);
    running.stop();
    vi.advanceTimersByTime(2000);
    expect(running.hide).not.toHaveBeenCalled();
  });
});
