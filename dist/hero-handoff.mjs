import { createHalftoneRenderer } from "./halftone-renderer.mjs?v=revision-7";

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const phase = (value, start, end) => clamp((value - start) / (end - start));
const ease = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export function heroHandoffState(scrollY, heroTop, heroHeight, viewportHeight, navHeight, runwayHeight = 0) {
  const start = heroTop + 28;
  const end = heroTop + heroHeight + runwayHeight + navHeight;
  const progress = clamp((scrollY - start) / Math.max(1, end - start));
  const photoReveal = ease(phase(progress, 0.42, 0.76));
  const surfaceExit = 1 - ease(phase(progress, 0.97, 1));
  return {
    progress,
    active: progress > 0 && progress < 1,
    copyOpacity: 1 - ease(phase(progress, 0.005, 0.16)),
    copyY: -56 * ease(phase(progress, 0.005, 0.22)),
    cueOpacity: 1 - ease(phase(progress, 0, 0.07)),
    photoOpacity: photoReveal * surfaceExit,
    nightOpacity: ease(phase(progress, 0, 0.12)) * (1 - ease(phase(progress, 0.76, 0.82))),
    navOpacity: ease(phase(progress, 0.975, 1)),
    photoTop: navHeight * ease(phase(progress, 0.83, 0.94)),
    flowing: progress >= 0.20 && progress <= 0.76,
  };
}

// 화면 밖으로 나가는 실제 로고 점을 다음 사진과 같은 화면 좌표에서 이어 그립니다.
// 원래 첫 화면 renderer의 입력·시간을 바꾸지 않으며 출구 canvas는 scroll RAF만 사용합니다.
export function createHeroHandoff({ hero, reducedMotion, root = document, win = window }) {
  const desktop = win.matchMedia("(min-width: 1000px) and (min-height: 701px)");
  const modelImage = hero.querySelector(".hero-model img");
  const originalCanvas = hero.querySelector(".ring-flow-canvas");
  const nextPhoto = root.querySelector(".journey-scene .local-photo img");
  const nav = root.querySelector(".site-header");
  const heroArt = hero.querySelector(".hero-art");
  const heroImage = hero.querySelector(".hero-art img");
  const heroVideo = hero.querySelector(".hero-art video");
  if (!modelImage || !originalCanvas || !nextPhoto) return { setPaused() {}, dispose() {} };

  const runway = root.createElement("div");
  runway.className = "hero-handoff-runway";
  runway.setAttribute("aria-hidden", "true");
  runway.hidden = true;
  hero.after(runway);
  const night = root.createElement("div");
  night.className = "hero-handoff-night";
  night.setAttribute("aria-hidden", "true");
  night.hidden = true;
  const nightCanvas = root.createElement("canvas");
  night.append(nightCanvas);
  const canvas = root.createElement("canvas");
  canvas.className = "hero-handoff-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.hidden = true;
  const surface = root.createElement("div");
  surface.className = "hero-handoff-surface";
  surface.setAttribute("aria-hidden", "true");
  surface.hidden = true;
  let photo = root.createElement("img");
  photo.alt = "";
  photo.decoding = "async";
  surface.append(photo);
  root.body.append(night, surface, canvas);

  const cleanups = [];
  let paused = true, disposed = false, failed = false, loading = false;
  let renderer, frame = 0, refreshFrame = 0, geometry, observer;
  let photoSource = "", pendingPhotoSource = "", photoVersion = 0;
  let navOriginal;
  let nightCaptured = false;
  const neutralPointer = { strength: 0, x: 0.5, y: 0.5, velocityX: 0, velocityY: 0 };
  const enabled = () => !paused && !disposed && !failed && desktop.matches && !reducedMotion.matches && !root.hidden;

  function clear() {
    night.hidden = canvas.hidden = surface.hidden = true;
    hero.classList.remove("hero-handoff-active");
    for (const name of ["--hero-exit-copy-opacity", "--hero-exit-copy-y", "--hero-exit-cue-opacity"])
      hero.style.removeProperty(name);
    delete canvas.dataset.progress;
    delete canvas.dataset.flowing;
    delete canvas.dataset.flowPoints;
    if (navOriginal) {
      nav.inert = navOriginal.inert;
      if (!navOriginal.hadClass) nav.classList.remove("hero-handoff-nav");
      if (navOriginal.opacity) nav.style.setProperty("--handoff-nav-opacity", navOriginal.opacity, navOriginal.priority);
      else nav.style.removeProperty("--handoff-nav-opacity");
      navOriginal = undefined;
    }
  }
  function fail() {
    failed = true;
    cancelFrames();
    clear();
    renderer?.dispose();
    renderer = undefined;
    syncRunway();
  }
  function cancelFrames() {
    if (frame) win.cancelAnimationFrame(frame);
    if (refreshFrame) win.cancelAnimationFrame(refreshFrame);
    frame = refreshFrame = 0;
  }
  function syncRunway() {
    // BFCache pause에서는 높이를 유지하고 모션 불가·GPU 실패에만 원래 문서 길이로 돌립니다.
    runway.hidden = !(renderer && desktop.matches && !reducedMotion.matches && !failed && !disposed);
  }
  function captureNight() {
    if (nightCaptured) return;
    const source = heroVideo && heroVideo.readyState >= 2 && hero.classList.contains("hero-video-ready") ? heroVideo : heroImage;
    if (!source) throw new Error("Hero night frame is unavailable");
    const sourceWidth = source.videoWidth || source.naturalWidth;
    const sourceHeight = source.videoHeight || source.naturalHeight;
    if (!sourceWidth || !sourceHeight) throw new Error("Hero night frame is not decoded");
    const dpr = Math.min(win.devicePixelRatio || 1, 1.5);
    nightCanvas.width = Math.round(geometry.width * dpr);
    nightCanvas.height = Math.round(geometry.height * dpr);
    const context = nightCanvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Hero night sampling is unavailable");
    const top = geometry.artTop - geometry.heroTop - 28;
    const rectHeight = Math.max(geometry.artHeight, geometry.height - top);
    const scale = Math.max(geometry.artWidth / sourceWidth, rectHeight / sourceHeight);
    const left = geometry.artLeft + (geometry.artWidth - sourceWidth * scale) / 2;
    const imageTop = top + (rectHeight - sourceHeight * scale) / 2;
    context.drawImage(source, left * dpr, imageTop * dpr, sourceWidth * scale * dpr, sourceHeight * scale * dpr);
    night.style.setProperty("--handoff-hero-height", `${Math.max(geometry.heroHeight, geometry.height + 28)}px`);
    nightCaptured = true;
  }
  function paint() {
    frame = 0;
    if (!enabled() || !renderer || !geometry || !photo.complete || !photo.naturalWidth) {
      clear();
      return;
    }
    const y = win.scrollY;
    const state = heroHandoffState(y, geometry.heroTop, geometry.heroHeight, geometry.height, geometry.navHeight, geometry.runwayHeight);
    if (!state.active) {
      clear();
      if (state.progress === 0) nightCaptured = false;
      return;
    }
    const anchorSettle = ease(phase(state.progress, 0.02, 0.12));
    const anchorScroll = y + (geometry.heroTop + 28 - y) * anchorSettle;
    const top = geometry.canvasTop - anchorScroll;
    const origin = {
      x: (geometry.canvasLeft + geometry.canvasWidth / 2) / geometry.width,
      y: (top + geometry.canvasHeight / 2) / geometry.height,
    };
    try {
      captureNight();
      renderer.render(0.9, neutralPointer, {
        progress: state.progress,
        projection: {
          left: geometry.canvasLeft / geometry.width,
          top: top / geometry.height,
          width: geometry.canvasWidth / geometry.width,
          height: geometry.canvasHeight / geometry.height,
        },
        origin,
      });
    } catch {
      fail();
      return;
    }
    night.hidden = canvas.hidden = surface.hidden = false;
    canvas.dataset.progress = state.progress.toFixed(4);
    canvas.dataset.flowPoints = String(renderer.getStats?.().flowPointCount || 0);
    canvas.dataset.flowing = String(state.flowing);
    hero.classList.add("hero-handoff-active");
    hero.style.setProperty("--hero-exit-copy-opacity", String(state.copyOpacity));
    hero.style.setProperty("--hero-exit-copy-y", `${state.copyY}px`);
    hero.style.setProperty("--hero-exit-cue-opacity", String(state.cueOpacity));
    night.style.setProperty("--handoff-night-opacity", String(state.nightOpacity));
    if (nav) {
      if (!navOriginal) navOriginal = {
        inert: nav.inert,
        hadClass: nav.classList.contains("hero-handoff-nav"),
        opacity: nav.style.getPropertyValue("--handoff-nav-opacity"),
        priority: nav.style.getPropertyPriority("--handoff-nav-opacity"),
      };
      nav.classList.add("hero-handoff-nav");
      nav.style.setProperty("--handoff-nav-opacity", String(state.navOpacity));
      nav.inert = navOriginal.inert || state.navOpacity < 1;
    }
    surface.style.setProperty("--handoff-photo-opacity", String(state.photoOpacity));
    surface.style.setProperty("--handoff-photo-top", `${state.photoTop}px`);
  }
  function schedule() {
    if (enabled() && renderer && !frame) frame = win.requestAnimationFrame(paint);
  }
  async function syncPhoto() {
    if (!enabled() || !renderer) return;
    const source = nextPhoto.currentSrc || nextPhoto.src;
    if (!source || source === photoSource || source === pendingPhotoSource) return;
    const version = ++photoVersion;
    pendingPhotoSource = source;
    const replacement = root.createElement("img");
    replacement.alt = "";
    replacement.decoding = "async";
    replacement.src = source;
    try {
      await replacement.decode();
      if (!enabled() || version !== photoVersion || (nextPhoto.currentSrc || nextPhoto.src) !== source) return;
      // 새 고해상도 사진이 디코딩되기 전까지 기존 사진을 유지해 출구에 빈 프레임이 없습니다.
      photo = replacement;
      photoSource = source;
      surface.replaceChildren(photo);
      schedule();
    } catch {
      // 품질용 대체 이미지 실패는 이미 정상 표시 중인 사진과 GPU 흐름을 중단하지 않습니다.
    } finally {
      if (version === photoVersion) pendingPhotoSource = "";
    }
  }
  function measure() {
    refreshFrame = 0;
    if (!enabled()) { clear(); return; }
    const heroBounds = hero.getBoundingClientRect();
    const canvasBounds = originalCanvas.getBoundingClientRect();
    const artBounds = heroArt?.getBoundingClientRect() || heroBounds;
    if (geometry && (geometry.width !== win.innerWidth || geometry.height !== win.innerHeight || geometry.heroHeight !== heroBounds.height)) nightCaptured = false;
    geometry = {
      heroTop: heroBounds.top + win.scrollY,
      heroHeight: heroBounds.height,
      runwayHeight: runway.getBoundingClientRect().height,
      artTop: artBounds.top + win.scrollY,
      artLeft: artBounds.left || 0,
      artWidth: artBounds.width || win.innerWidth,
      artHeight: artBounds.height,
      canvasTop: canvasBounds.top + win.scrollY,
      canvasLeft: canvasBounds.left,
      canvasWidth: canvasBounds.width,
      canvasHeight: canvasBounds.height,
      width: win.innerWidth,
      height: win.innerHeight,
      navHeight: nav?.getBoundingClientRect().height || 0,
    };
    if (!renderer) { void prepare(); return; }
    void syncPhoto();
    try {
      // display:none 상태에서 측정하면 1px backing store가 만들어지므로 재측정 전에 엽니다.
      canvas.hidden = false;
      renderer.resize({ sampleWidth: canvasBounds.width / 1.12, sampleHeight: canvasBounds.height / 1.12 });
    } catch { fail(); return; }
    paint();
  }
  function refresh() {
    syncRunway();
    if (!enabled()) { cancelFrames(); clear(); return; }
    if (!refreshFrame) refreshFrame = win.requestAnimationFrame(measure);
  }
  async function prepare() {
    if (loading || renderer || !enabled() || !geometry) return;
    loading = true;
    try {
      const source = nextPhoto.currentSrc || nextPhoto.src;
      photo.src = source;
      await Promise.all([modelImage.decode(), photo.decode(), heroImage?.decode?.()]);
      if (!enabled() || !geometry) return;
      canvas.hidden = false;
      renderer = createHalftoneRenderer(canvas, modelImage, {
        sampleWidth: geometry.canvasWidth / 1.12,
        sampleHeight: geometry.canvasHeight / 1.12,
        exitFlow: true,
      });
      photoSource = source;
      syncRunway();
      measure();
      // 초기 decode 중 원본 source가 교체된 경우에도 마지막 source를 따라갑니다.
      void syncPhoto();
    } catch { if (!disposed) fail(); }
    finally { loading = false; }
  }
  function bind(target, name, callback, options) {
    target.addEventListener(name, callback, options);
    cleanups.push(() => target.removeEventListener(name, callback, options));
  }
  bind(win, "scroll", schedule, { passive: true });
  bind(win, "resize", refresh, { passive: true });
  bind(win, "load", refresh);
  bind(root, "visibilitychange", refresh);
  bind(desktop, "change", refresh);
  bind(reducedMotion, "change", refresh);
  bind(canvas, "webglcontextlost", fail);
  bind(nextPhoto, "load", () => {
    if (renderer) void syncPhoto();
    else refresh();
  });
  root.fonts?.ready.then(() => { if (!disposed) refresh(); });
  if (win.ResizeObserver) {
    observer = new win.ResizeObserver(refresh);
    observer.observe(hero);
    observer.observe(originalCanvas);
    observer.observe(runway);
  }
  return {
    setPaused(value) {
      paused = value;
      if (paused) { cancelFrames(); clear(); syncRunway(); }
      else refresh();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelFrames();
      clear();
      observer?.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      renderer?.dispose();
      renderer = undefined;
      canvas.remove();
      surface.remove();
      night.remove();
      runway.remove();
    },
  };
}
