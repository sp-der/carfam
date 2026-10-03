/** Start the short reveal only when it can actually be seen, including background-tab entry. */
export function scheduleOpening(runtime: {
  isVisible: () => boolean;
  frame: (callback: () => void) => number;
  cancelFrame: (id: number) => void;
  observeVisibility: (callback: () => void) => () => void;
  timeout: (
    callback: () => void,
    milliseconds: number,
  ) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
  show: () => void;
  hide: () => void;
}) {
  let started = false;
  let cancelled = false;
  let frame: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const start = () => {
    if (started || cancelled || frame != null || !runtime.isVisible()) return;
    frame = runtime.frame(() => {
      frame = undefined;
      if (cancelled || !runtime.isVisible()) return;
      started = true;
      runtime.show();
      timer = runtime.timeout(() => runtime.hide(), 1500);
    });
  };
  const unobserve = runtime.observeVisibility(start);
  start();
  return () => {
    cancelled = true;
    if (frame != null) runtime.cancelFrame(frame);
    if (timer != null) runtime.clearTimeout(timer);
    unobserve();
  };
}
