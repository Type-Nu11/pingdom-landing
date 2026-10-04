export const clamp = (value, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));
export const mix = (from, to, amount) => from + (to - from) * clamp(amount);
export const phase = (progress, start, end) =>
  clamp((progress - start) / (end - start));
export const ease = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
export function sceneProgress(scrollY, top, height, viewportHeight) {
  return clamp((scrollY - top) / Math.max(1, height - viewportHeight));
}
// 모든 상태는 현재 스크롤 위치에서 계산합니다. 방향이나 이전 재생 상태에 의존하지 않습니다.
export function journeyState(p, mobile = false) {
  const settle = ease(phase(p, 0.12, 0.58));
  const product = ease(phase(p, 0.3, 0.6));
  const copy = ease(phase(p, 0.32, 0.56));
  const opening = ease(phase(p, 0.1, 0.3));
  return {
    photoX: mix(0, mobile ? 6 : 4, settle),
    photoY: mix(0, mobile ? 5 : 13, settle),
    photoWidth: mix(100, mobile ? 88 : 37, settle),
    photoHeight: mix(100, mobile ? 34 : 73, settle),
    photoRadius: mix(0, mobile ? 12 : 14, settle),
    shade: mix(1, 0, settle),
    openingOpacity: 1 - opening,
    openingY: mix(0, -45, opening),
    copyOpacity: ease(phase(p, 0.32, 0.45)),
    copyY: mix(34, 0, copy),
    productOpacity: ease(phase(p, 0.3, 0.42)),
    productY: mix(mobile ? 80 : 150, 0, product),
  };
}
export function platformState(p) {
  const reveal = ease(phase(p, 0.15, 0.68));
  const console = ease(phase(p, 0.22, 0.7));
  return {
    curtainCut: mix(0, 100, reveal),
    curtainScale: mix(1, 0.38, reveal),
    curtainTitleOpacity: 1 - ease(phase(p, 0.5, 0.68)),
    curtainSmallOpacity: 1 - ease(phase(p, 0.1, 0.3)),
    consoleOpacity: ease(phase(p, 0.2, 0.44)),
    consoleY: mix(110, 0, console),
  };
}
export function createScrollStory({ root = document, win = window } = {}) {
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)");
  const narrow = win.matchMedia("(max-width: 760px)");
  const mobile = win.matchMedia("(max-width: 999px)");
  const short = win.matchMedia(
    "(min-width: 761px) and (max-height: 700px), (max-width: 760px) and (max-height: 600px)",
  );
  const scenes = [...root.querySelectorAll("[data-scene]")].map((section) => ({
    section,
    stage: section.querySelector(".scene-stage"),
    copy: section.querySelector(".journey-copy"),
    type: section.dataset.scene,
    top: 0,
    height: 0,
  }));
  const cleanups = [];
  let running = false,
    frame = 0,
    refreshFrame = 0,
    observer;
  const motionOff = () => reduced.matches || short.matches || mobile.matches;
  function paint() {
    frame = 0;
    if (!running || motionOff() || root.hidden) return;
    const y = win.scrollY;
    for (const scene of scenes) {
      if (narrow.matches && scene.type === "platform") {
        scene.stage.removeAttribute("style");
        scene.stage.dataset.progress = "1";
        continue;
      }
      const p = sceneProgress(y, scene.top, scene.height, scene.viewport);
      scene.stage.dataset.progress = p.toFixed(4);
      const values =
        scene.type === "journey"
          ? journeyState(p, narrow.matches)
          : platformState(p);
      if (scene.copy) scene.copy.inert = values.copyOpacity < 1;
      const vars =
        scene.type === "journey"
          ? {
              "--photo-x": values.photoX + "%",
              "--photo-y": values.photoY + "%",
              "--photo-w": values.photoWidth + "%",
              "--photo-h": values.photoHeight + "%",
              "--photo-r": values.photoRadius + "px",
              "--shade": values.shade,
              "--opening-opacity": values.openingOpacity,
              "--opening-y": values.openingY + "px",
              "--copy-opacity": values.copyOpacity,
              "--copy-y": values.copyY + "px",
              "--product-opacity": values.productOpacity,
              "--product-y": values.productY + "px",
            }
          : {
              "--curtain-cut": values.curtainCut + "%",
              "--curtain-scale": values.curtainScale,
              "--curtain-title-opacity": values.curtainTitleOpacity,
              "--curtain-small-opacity": values.curtainSmallOpacity,
              "--console-opacity": values.consoleOpacity,
              "--console-y": values.consoleY + "px",
            };
      for (const [key, value] of Object.entries(vars))
        scene.stage.style.setProperty(key, String(value));
    }
  }
  function schedule() {
    if (running && !frame && !root.hidden && !motionOff())
      frame = win.requestAnimationFrame(paint);
  }
  function clearScenes() {
    for (const scene of scenes) {
      scene.stage.removeAttribute("style");
      if (scene.copy) scene.copy.inert = false;
      delete scene.stage.dataset.progress;
    }
  }
  function refresh() {
    refreshFrame = 0;
    if (!running) return;
    root.documentElement.classList.toggle("motion-enabled", !motionOff());
    if (motionOff()) {
      clearScenes();
      if (frame) win.cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    const nav = root.querySelector(".site-header");
    const headerHeight = nav?.getBoundingClientRect().height ?? 0;
    for (const scene of scenes) {
      const bounds = scene.section.getBoundingClientRect();
      scene.top = bounds.top + win.scrollY - headerHeight;
      scene.height = bounds.height;
      scene.viewport = win.innerHeight - headerHeight;
    }
    paint();
  }
  function scheduleRefresh() {
    if (running && !refreshFrame)
      refreshFrame = win.requestAnimationFrame(refresh);
  }
  function onVisibility() {
    if (root.hidden) {
      if (frame) win.cancelAnimationFrame(frame);
      frame = 0;
    } else scheduleRefresh();
  }
  function bind(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    cleanups.push(() => target.removeEventListener(event, handler, options));
  }
  function start() {
    if (running) return;
    running = true;
    bind(win, "scroll", schedule, { passive: true });
    bind(win, "resize", scheduleRefresh, { passive: true });
    bind(win, "hashchange", scheduleRefresh);
    bind(win, "load", scheduleRefresh);
    bind(root, "visibilitychange", onVisibility);
    for (const query of [reduced, narrow, short, mobile])
      bind(query, "change", scheduleRefresh);
    // 늦게 도착한 폰트와 이미지, 반응형 재배치 뒤의 핀 위치를 다시 측정합니다.
    for (const image of root.querySelectorAll("img")) {
      if (!image.complete) {
        bind(image, "load", scheduleRefresh, { once: true });
        bind(image, "error", scheduleRefresh, { once: true });
      }
    }
    root.fonts?.ready.then(() => {
      if (running) scheduleRefresh();
    });
    if (win.ResizeObserver) {
      observer = new win.ResizeObserver(scheduleRefresh);
      observer.observe(root.documentElement);
      for (const scene of scenes) observer.observe(scene.section);
    }
    refresh();
  }
  function stop() {
    if (!running) return;
    running = false;
    if (frame) win.cancelAnimationFrame(frame);
    if (refreshFrame) win.cancelAnimationFrame(refreshFrame);
    frame = refreshFrame = 0;
    observer?.disconnect();
    observer = undefined;
    cleanups.splice(0).forEach((cleanup) => cleanup());
  }
  function dispose() {
    stop();
    root.documentElement.classList.remove("motion-enabled");
    clearScenes();
  }
  start();
  return { start, stop, refresh: scheduleRefresh, dispose };
}
