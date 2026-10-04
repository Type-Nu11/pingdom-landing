import { clamp, ease, mix, phase } from "./story-scroll.mjs?v=rebuild-1";

export function teamCardState(progress, index = 0) {
  const offset = (index < 3 ? index : index - 3) * 0.055;
  const reveal = ease(phase(clamp(progress), offset, 0.76 + offset));
  return { opacity: mix(0.08, 1, reveal), y: mix(34, 0, reveal) };
}

export function createTeamV2({ root = document, win = window, reducedMotion } = {}) {
  const wrapper = root.querySelector(".team-v2");
  if (!wrapper) return { start() {}, stop() {}, refresh() {}, dispose() {} };
  const section = wrapper.closest?.("#team") ?? root.querySelector("#team");
  const label = section?.getAttribute("aria-labelledby") ?? null;
  const desktop = win.matchMedia("(min-width: 1000px) and (min-height: 701px)");
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)");
  const cards = [...wrapper.querySelectorAll("[data-team-card]")].map((element) => ({ element, top: 0, distance: 1 }));
  const assets = [...wrapper.querySelectorAll("img[data-desktop-src]")];
  const sources = new Map(assets.map((asset) => [asset, asset.getAttribute("src")]));
  let running = false, enabled = false, motion = false, frame = 0, refreshFrame = 0, observer;
  const cleanups = [];

  function clearMotion() {
    wrapper.classList.remove("team-v2-motion");
    cards.forEach(({ element }) => {
      element.style.removeProperty("--team-card-opacity");
      element.style.removeProperty("--team-card-y");
    });
  }
  function clear() {
    clearMotion();
    if (section) {
      if (label === null) section.removeAttribute("aria-labelledby");
      else section.setAttribute("aria-labelledby", label);
    }
    for (const asset of assets) {
      const original = sources.get(asset);
      if (original === null) asset.removeAttribute("src");
      else asset.setAttribute("src", original);
    }
  }
  function paint() {
    frame = 0;
    if (!running || !enabled || !motion || root.hidden) return;
    cards.forEach(({ element, top, distance }, index) => {
      const state = teamCardState((win.scrollY - top) / distance, index);
      element.style.setProperty("--team-card-opacity", state.opacity);
      element.style.setProperty("--team-card-y", `${state.y}px`);
    });
  }
  function schedule() {
    if (running && enabled && motion && !root.hidden && !frame) frame = win.requestAnimationFrame(paint);
  }
  function refresh() {
    refreshFrame = 0;
    if (!running) return;
    if (!desktop.matches) {
      if (enabled) clear();
      enabled = motion = false;
      return;
    }
    enabled = true;
    motion = !(reducedMotion?.matches ?? reducedMotion ?? reduced.matches);
    section?.setAttribute("aria-labelledby", "team-v2-title");
    assets.forEach((asset) => { if (!asset.getAttribute("src")) asset.setAttribute("src", asset.dataset.desktopSrc); });
    clearMotion();
    if (!motion) return;
    wrapper.classList.add("team-v2-motion");
    const viewport = Math.max(1, win.innerHeight);
    // 애니메이션 전 위치를 저장해 카드 자체 이동이 다음 refresh의 기준점에 섞이지 않게 합니다.
    cards.forEach((card) => {
      const rect = card.element.getBoundingClientRect();
      card.top = rect.top + win.scrollY - viewport * 0.88;
      card.distance = viewport * 0.4;
    });
    paint();
  }
  function scheduleRefresh() { if (running && !refreshFrame) refreshFrame = win.requestAnimationFrame(refresh); }
  function bind(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    cleanups.push(() => target.removeEventListener(event, handler, options));
  }
  function visibility() {
    if (root.hidden) {
      if (frame) win.cancelAnimationFrame(frame);
      frame = 0;
    } else scheduleRefresh();
  }
  function start() {
    if (running) return;
    running = true;
    bind(win, "scroll", schedule, { passive: true });
    bind(win, "resize", scheduleRefresh, { passive: true });
    bind(win, "hashchange", scheduleRefresh);
    bind(root, "visibilitychange", visibility);
    bind(desktop, "change", scheduleRefresh);
    bind(reduced, "change", scheduleRefresh);
    if (win.ResizeObserver) {
      observer = new win.ResizeObserver(scheduleRefresh);
      observer.observe(wrapper);
      if (root.documentElement) observer.observe(root.documentElement);
    }
    root.fonts?.ready.then(() => { if (running) scheduleRefresh(); });
    refresh();
  }
  function stop() {
    if (!running) return;
    running = false;
    cleanups.splice(0).forEach((cleanup) => cleanup());
    observer?.disconnect();
    observer = undefined;
    if (frame) win.cancelAnimationFrame(frame);
    if (refreshFrame) win.cancelAnimationFrame(refreshFrame);
    frame = refreshFrame = 0;
  }
  function dispose() { stop(); clear(); enabled = motion = false; }
  start();
  return { start, stop, refresh, dispose };
}
