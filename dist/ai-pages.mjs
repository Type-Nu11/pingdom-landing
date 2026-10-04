import { clamp, ease, mix, phase } from "./story-scroll.mjs?v=rebuild-1";

export function aiPageState(progress) {
  const p = clamp(progress);
  return {
    appearance: ease(phase(p, 0, 0.18)),
    alignment: ease(phase(p, 0, 0.24)),
  };
}

// 현재 위치에서 구도를 재구성하여 빠른 이동·역방향 이동도 같은 항로를 복원합니다.
export function consultingFlightState(progress, pinCount = 8) {
  const p = typeof progress === "number" && !Number.isNaN(progress) ? clamp(progress) : 0;
  const zoom = ease(phase(p, 0.36, 0.55));
  const flight = phase(p, 0.58, 0.95);
  const departure = ease(phase(flight, 0, 0.3));
  const turn = ease(phase(flight, 0.3, 0.7));
  const arrival = ease(phase(flight, 0.7, 1));
  const camera = (start, first, second, end) => mix(mix(mix(start, first, departure), second, turn), end, arrival);
  const count = Number.isFinite(pinCount) ? Math.max(0, Math.min(24, Math.floor(pinCount))) : 0;
  return {
    copyOpacity: 1 - ease(phase(p, 0.35, 0.43)),
    copyY: mix(0, -72, ease(phase(p, 0.35, 0.46))),
    modelOpacity: 1 - ease(phase(p, 0.55, 0.58)),
    modelScale: 1.9 ** zoom,
    modelY: mix(0, -0.04, zoom),
    flightOpacity: ease(phase(p, 0.46, 0.58)),
    flightProgress: flight,
    cameraX: camera(0, -7, 9, -8),
    cameraY: camera(0, -2, 12, 24),
    cameraScale: camera(3.1, 1.42, 1.95, 2.18),
    cameraBank: camera(0, -7, 8.5, -1.8),
    veilOpacity: 1 - ease(phase(p, 0.46, 0.58)),
    focusOpacity: ease(phase(p, 0.48, 0.53)) * (1 - ease(phase(p, 0.63, 0.7))),
    focusScale: mix(1, 0.52, ease(phase(p, 0.56, 0.66))),
    focusY: mix(0, -0.14, ease(phase(p, 0.5, 0.62))),
    pins: Array.from({ length: count }, (_, index) => {
      const start = mix(0.62, 0.875, index / Math.max(1, count - 1));
      const appearance = ease(phase(p, start, start + 0.032));
      const pulse = ease(phase(p, start, Math.min(0.93, start + 0.08)));
      return {
        opacity: appearance,
        scale: mix(0.4, 1, appearance),
        y: mix(32, 0, appearance),
        ringOpacity: appearance * (1 - pulse),
        ringScale: mix(1, 3.2, pulse),
      };
    }),
  };
}

export function consultingGlobeTitleState(seconds) {
  const time = typeof seconds === "number" && !Number.isNaN(seconds) ? clamp(seconds, 0, 12) : 0;
  return { koreaOpacity: 1 - ease(phase(time, 8, 8.5)), globalOpacity: ease(phase(time, 8.5, 9.2)) };
}

// 지구 영상은 야경을 거치지 않으며, 모델이 있으면 같은 그림·핀의 짧은 초점 이동 뒤 연결합니다.
export function consultingGlobeState(progress, withModel = false) {
  const p = typeof progress === "number" && !Number.isNaN(progress) ? clamp(progress) : 0;
  withModel = withModel === true;
  const entry = withModel ? 0.58 : 0.40;
  const flight = phase(p, entry, withModel ? 0.95 : 0.92);
  const seconds = flight * 12;
  const focus = withModel ? ease(phase(p, 0.36, 0.55)) : 0;
  return {
    copyOpacity: 1 - ease(phase(p, withModel ? 0.35 : 0.34, withModel ? 0.43 : 0.40)),
    copyY: mix(0, withModel ? -36 : -24, ease(phase(p, withModel ? 0.35 : 0.34, withModel ? 0.46 : 0.40))),
    modelOpacity: withModel ? 1 - ease(phase(p, 0.55, 0.58)) : 0,
    modelScale: 1.4 ** focus,
    modelY: mix(0, -0.04, focus),
    flightOpacity: ease(phase(p, withModel ? 0.46 : 0.34, entry)),
    flightProgress: flight,
    cameraX: 0, cameraY: 0, cameraScale: 1, cameraBank: 0,
    veilOpacity: 0, focusOpacity: 0, focusScale: 1, focusY: 0,
    pins: [],
    stage: p <= (withModel ? 0.36 : 0.34) ? "intro" : p < entry ? withModel ? "focus" : "reveal" : seconds < 1.8 ? "globe" :
      seconds < 7.2 ? "network" : seconds < 10.5 ? "pullback" : "settled",
  };
}

const GLOBAL_FLIGHT_END_SECONDS = 7.184;

export function globalVisionTitleState(seconds) {
  const time = typeof seconds === "number" && !Number.isNaN(seconds) ? clamp(seconds, 0, GLOBAL_FLIGHT_END_SECONDS) : 0;
  return { koreaOpacity: 1 - ease(phase(time, 6.25, 6.65)), globalOpacity: ease(phase(time, 6.65, 7.05)) };
}

// 큰 구면의 네트워크가 완성되면 같은 프레임을 유지하고 추가 후퇴를 재생하지 않습니다.
export function globalVisionState(progress) {
  const p = typeof progress === "number" && !Number.isNaN(progress) ? clamp(progress) : 0;
  const flight = phase(p, 0.42, 0.90);
  const seconds = flight * GLOBAL_FLIGHT_END_SECONDS;
  const map = ease(phase(p, 0.22, 0.42));
  return {
    ...consultingGlobeState(p),
    copyOpacity: 1 - ease(phase(p, 0.24, 0.33)),
    copyY: mix(0, -32, ease(phase(p, 0.24, 0.33))),
    flightOpacity: ease(phase(p, 0.26, 0.42)),
    flightProgress: flight,
    videoSeconds: seconds,
    mapOpacity: 1 - ease(phase(p, 0.27, 0.42)),
    mapX: mix(22, 0, map),
    mapScale: mix(0.92, 1, map),
    titleOpacity: ease(phase(p, 0.36, 0.42)),
    stage: p <= 0.24 ? "intro" : p < 0.42 ? "reveal" : seconds < 1.8 ? "globe" :
      flight < 1 - 1e-9 ? "network" : "settled",
  };
}

export function consultingFlightStep(current, target, deltaMs = 16, withModel = false, settlingAtStop = false) {
  const destination = typeof target === "number" && !Number.isNaN(target) ? clamp(target) : 0;
  const from = typeof current === "number" && !Number.isNaN(current) ? clamp(current) : destination;
  const distance = destination - from;
  if (distance <= 0.001 || destination <= 0.36) return destination;
  const dt = Number.isFinite(deltaMs) ? clamp(deltaMs, 0, 64) : 16;
  // 짧은 정지 중에는 이전 장면의 보간이 남아 다음 구도를 건너뛰지 않도록 빠르게 수렴합니다.
  if (settlingAtStop) {
    const next = from + distance * (1 - Math.exp(-dt / 32));
    return destination - next <= 0.001 ? destination : next;
  }
  // 짧은 입력의 추종은 유지하고, 큰 이동은 소개 줌에서 영상 속도로 점차 감속합니다.
  const speed = mix(withModel ? 0.00036 : 0.00030, withModel ? 0.00020 : 0.00016, ease(phase(from, 0.48, 0.60)));
  const amount = Math.min(distance, dt * speed, distance * (1 - Math.exp(-dt / 70)));
  const next = from + amount;
  return Math.abs(destination - next) <= 0.001 ? destination : next;
}

const sceneVars = [
  "--ai-copy-y", "--ai-visual-opacity", "--ai-visual-y", "--ai-visual-scale",
  "--consult-copy-opacity", "--consult-copy-y", "--consult-model-opacity", "--consult-model-scale", "--consult-model-y",
  "--flight-opacity", "--flight-x", "--flight-y", "--flight-scale", "--flight-bank", "--flight-veil-opacity",
  "--flight-focus-opacity", "--flight-focus-scale", "--flight-focus-y",
  "--globe-korea-title", "--globe-global-title",
  "--global-map-opacity", "--global-map-x", "--global-map-scale", "--global-title-opacity",
];
const pinVars = ["--flight-pin-opacity", "--flight-pin-scale", "--flight-pin-y", "--flight-pin-ring-opacity", "--flight-pin-ring-scale"];

// 장면 치수는 refresh에서 읽고, 스크롤 페인트는 캐시를 사용합니다.
export function createAiPages({ root = document, win = window, reducedMotion } = {}) {
  const wrapper = root.querySelector(".ai-pages");
  if (!wrapper) return { start() {}, stop() {}, refresh() {}, dispose() {} };
  const section = wrapper.closest?.("#ai") ?? root.querySelector("#ai");
  const originalLabels = new Map(["aria-labelledby", "aria-label"].map((name) => [name, section?.getAttribute(name) ?? null]));
  const desktop = win.matchMedia("(min-width: 1000px) and (min-height: 701px)");
  const compact = win.matchMedia("(max-width: 999px), (max-height: 700px)");
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)");
  const scenes = [...wrapper.querySelectorAll("[data-ai-page]")].map((element) => {
    const flightAssets = [...element.querySelectorAll("img[data-flight-image]")];
    const flightVideos = [...element.querySelectorAll("video[data-flight-video]")];
    return {
      element,
      type: element.dataset.aiPage,
      globe: "consultingGlobe" in element.dataset,
      model: "consultingModel" in element.dataset,
      copy: element.querySelector?.(".ai-stage-copy"),
      heading: element.querySelector?.(".ai-stage-copy h3"),
      products: [...element.querySelectorAll("[data-ai-product]")],
      assets: [...element.querySelectorAll("img[data-desktop-src]")].filter((asset) => !flightAssets.includes(asset)),
      flightAssets,
      flightVideos,
      video: flightVideos[0], videoReady: false, videoDecodedOnce: false, videoFailed: false, videoTarget: null,
      flightPins: [...element.querySelectorAll("[data-flight-pin]")],
      top: 0, distance: 1, viewport: 1, renderedProgress: null, targetProgress: null, prepared: false, failed: false, flightReady: false, flightFailed: false,
    };
  });
  const dialogs = [...wrapper.querySelectorAll("dialog[data-ai-dialog]")].map((element) => ({
    element,
    assets: [...element.querySelectorAll("img[data-ai-dialog-src]")],
    closers: [...element.querySelectorAll("[data-ai-dialog-close]")],
    error: element.querySelector(".ai-dialog-error"),
    trigger: null,
  }));
  const triggers = [...wrapper.querySelectorAll("[data-ai-dialog-open]")];
  const originalSources = new Map([...scenes, ...dialogs].flatMap((item) => [...item.assets, ...(item.flightAssets ?? []), ...(item.flightVideos ?? [])].map((asset) => [asset, asset.getAttribute("src")])));
  const hasPhoto = (scene) => scene.flightAssets.length === 1 && !!scene.flightAssets[0].dataset.desktopSrc;
  const hasVideo = (scene) => scene.flightVideos.length === 1 && !!scene.video.dataset.desktopSrc;
  const validStructure = (scene) => ["traveler", "consulting", "global"].includes(scene.type) &&
    ((scene.type === "consulting" || scene.type === "global") && scene.globe ? scene.products.length === (scene.model ? 1 : 0) && !!scene.copy && !!scene.heading &&
      hasPhoto(scene) && hasVideo(scene) : scene.products.length === 1);
  const hasFlight = (scene) => (scene.type === "consulting" || scene.type === "global") && "consultingFlight" in scene.element.dataset &&
    (hasPhoto(scene) || hasVideo(scene)) && scene.flightPins.length <= 24;
  const videoDecoded = (scene) => hasVideo(scene) && !scene.video.error && scene.video.readyState >= 2 &&
    scene.video.videoWidth > 0 && Number.isFinite(scene.video.duration) && scene.video.duration > 0;
  let running = false, enabled = false, motion = false, frame = 0, refreshFrame = 0, lastPaintTime = null, observer;
  const cleanups = [];

  function set(element, name, value, unit = "") { element.style.setProperty(name, String(value) + unit); }
  function clearScene(scene) {
    scene.element.classList.remove("flight-final-frame");
    delete scene.element.dataset.aiProgress;
    delete scene.element.dataset.flightProgress;
    delete scene.element.dataset.flightDisplayProgress;
    delete scene.element.dataset.flightPhase;
    delete scene.element.dataset.flightMedia;
    delete scene.element.dataset.flightVideoTime;
    scene.videoTarget = null;
    scene.renderedProgress = null;
    scene.targetProgress = null;
    sceneVars.forEach((name) => scene.element.style.removeProperty(name));
    scene.flightPins.forEach((pin) => pinVars.forEach((name) => pin.style.removeProperty(name)));
  }
  function finishDialog(dialog, restoreFocus = true) {
    const trigger = dialog.trigger;
    trigger?.setAttribute("aria-expanded", "false");
    dialog.trigger = null;
    if (restoreFocus && running && enabled && desktop.matches) trigger?.focus?.();
  }
  function closeDialog(dialog, restoreFocus = true) {
    if (dialog.element.open) dialog.element.close();
    finishDialog(dialog, restoreFocus);
  }
  function closeDialogs() { dialogs.forEach((dialog) => closeDialog(dialog, false)); }
  function openDialog(dialog, trigger) {
    if (!running || !enabled || !desktop.matches || root.hidden || typeof dialog.element.showModal !== "function") return;
    closeDialogs();
    // 원본 UI는 예시를 열 때만 요청하여 소개 그림의 준비·스크롤과 분리합니다.
    for (const asset of dialog.assets)
      if (!asset.getAttribute("src")) asset.setAttribute("src", asset.dataset.aiDialogSrc);
    dialog.trigger = trigger;
    dialog.element.showModal();
    trigger.setAttribute("aria-expanded", "true");
  }
  function restoreAsset(asset) {
    asset.classList.remove("ai-asset-failed");
    const original = originalSources.get(asset);
    if (original === null) asset.removeAttribute("src");
    else asset.setAttribute("src", original);
  }
  function releaseVideo(scene) {
    scene.videoTarget = null;
    scene.videoReady = scene.videoDecodedOnce = scene.videoFailed = false;
    for (const video of scene.flightVideos) {
      const changed = video.getAttribute("src") !== originalSources.get(video);
      video.pause?.();
      restoreAsset(video);
      if (changed) video.load?.();
    }
  }
  function seekVideo(scene) {
    const video = scene.video;
    if (!running || !enabled || !motion || root.hidden || !scene.videoReady || scene.videoTarget === null || video.seeking) return;
    // 진행 중인 decode를 덮어쓰지 않고 seeked에서 가장 최근의 스크롤 목적지만 반영합니다.
    // 종료점에서는 한 프레임 미만의 차이도 마지막 연결선을 생략하지 않도록 반영합니다.
    const globalEnd = scene.type === "global" && scene.videoTarget === Math.min(GLOBAL_FLIGHT_END_SECONDS, video.duration);
    if (Math.abs(video.currentTime - scene.videoTarget) < (globalEnd ? 1 / 600 : 1 / 60)) return;
    try { video.currentTime = scene.videoTarget; }
    catch {
      scene.videoFailed = true;
      scene.videoReady = false;
      scene.videoDecodedOnce = false;
      scene.videoTarget = null;
      video.classList.add("ai-asset-failed");
      scheduleRefresh();
    }
  }
  function clear() {
    closeDialogs();
    wrapper.classList.remove("ai-pages-motion", "ai-pages-mobile");
    if (section) for (const [name, value] of originalLabels) {
      if (value === null) section.removeAttribute(name);
      else section.setAttribute(name, value);
    }
    for (const scene of scenes) {
      clearScene(scene);
      scene.element.classList.remove("ai-page-prepared", "ai-page-static", "ai-page-pending", "flight-ready", "flight-unavailable", "flight-video-ready", "flight-video-pending", "flight-video-unavailable");
      scene.failed = false;
      scene.flightFailed = false;
      scene.flightReady = false;
      [...scene.assets, ...scene.flightAssets].forEach(restoreAsset);
      releaseVideo(scene);
    }
    for (const dialog of dialogs) {
      dialog.assets.forEach(restoreAsset);
      dialog.element.classList.remove("ai-dialog-failed");
      if (dialog.error) dialog.error.hidden = true;
    }
  }
  function paint(timestamp, immediate = false) {
    frame = 0;
    if (!running || !enabled || root.hidden) return;
    const deltaMs = Number.isFinite(timestamp) && lastPaintTime !== null ? timestamp - lastPaintTime : 16;
    lastPaintTime = !immediate && Number.isFinite(timestamp) ? timestamp : null;
    let following = false;
    for (const scene of scenes) {
      // 모바일의 두 AI 소개는 고정된 제품면으로 읽고, 글로벌 장면만 스크롤에 연결합니다.
      const sceneMotion = motion && (!compact.matches || scene.type === "global");
      // 모바일 초기 로드에 비행 영상을 포함하지 않고 가까워지는 구간에서 한 번 준비합니다.
      if (compact.matches && sceneMotion && scene.type === "global" && hasVideo(scene) &&
        !scene.video.getAttribute("src") && !scene.videoFailed &&
        scene.top - win.scrollY < win.innerHeight * 2 &&
        scene.top + scene.distance + scene.viewport > win.scrollY - scene.viewport) scheduleRefresh();
      if (!sceneMotion || !scene.prepared || scene.failed || !validStructure(scene)) {
        clearScene(scene);
        scene.element.classList.add("ai-page-static");
        continue;
      }
      scene.element.classList.remove("ai-page-static");
      const progress = clamp((win.scrollY - scene.top) / scene.distance);
      // 브라우저가 정지 좌표를 CSS 픽셀로 반올림해도 종료 직전 프레임에 남지 않습니다.
      const p = scene.type === "global" && progress < .90 && .90 - progress <= 1 / scene.distance ? .90 : progress;
      const fly = hasFlight(scene) && scene.flightReady;
      const reversing = scene.targetProgress !== null && p < scene.targetProgress;
      const stopPrefix = scene.type === "global" ? "global-" : "consulting-";
      const settlingAtStop = hasFlight(scene) && root.documentElement.dataset.scrollStop?.startsWith(stopPrefix);
      // 글로벌은 스크롤과 같은 구도를 표시하여 빠른 입력 뒤에 별도 비행이 남지 않습니다.
      const display = scene.type === "global" || !fly || immediate || reversing || scene.renderedProgress === null ? p : consultingFlightStep(scene.renderedProgress, p, deltaMs, scene.globe && scene.model, settlingAtStop);
      scene.targetProgress = p;
      scene.renderedProgress = display;
      following ||= fly && display !== p;
      const state = aiPageState(hasFlight(scene) ? display * 3 : display);
      scene.element.dataset.aiProgress = p.toFixed(4);
      const e = scene.element;
      // native seek가 늦어도 종료 구도는 같은 영상의 마지막 poster로 확정합니다.
      const finalFrame = fly && scene.type === "global" && p >= .90 && !scene.flightFailed &&
        hasPhoto(scene) && scene.flightAssets[0].complete && scene.flightAssets[0].naturalWidth > 0;
      e.classList.toggle("flight-final-frame", finalFrame);
      set(e, "--ai-copy-y", mix(12, 0, state.appearance), "px");
      set(e, "--ai-visual-opacity", mix(0.9, 1, state.appearance));
      set(e, "--ai-visual-y", mix(scene.type === "traveler" ? 32 : 24, 0, state.appearance), "px");
      set(e, "--ai-visual-scale", mix(scene.type === "traveler" ? 0.96 : 0.98, 1, state.alignment));
      if (fly) {
        const flight = scene.type === "global" ? globalVisionState(display) :
          scene.globe ? consultingGlobeState(display, scene.model) : consultingFlightState(display, scene.flightPins.length);
        e.dataset.flightProgress = flight.flightProgress.toFixed(4);
        e.dataset.flightDisplayProgress = display.toFixed(4);
        e.dataset.flightPhase = scene.globe ? flight.stage : display <= 0.36 ? "intro" : display < 0.58 ? "zoom" : display < 0.95 ? "flight" : "settled";
        e.dataset.flightMedia = scene.videoReady && !finalFrame ? "video" : "image";
        set(e, "--consult-copy-opacity", flight.copyOpacity);
        set(e, "--consult-copy-y", flight.copyY, "px");
        set(e, "--consult-model-opacity", flight.modelOpacity);
        set(e, "--consult-model-scale", flight.modelScale);
        set(e, "--consult-model-y", flight.modelY * scene.viewport, "px");
        set(e, "--flight-opacity", flight.flightOpacity);
        if (scene.type === "global") {
          set(e, "--global-map-opacity", flight.mapOpacity);
          set(e, "--global-map-x", flight.mapX, "%");
          set(e, "--global-map-scale", flight.mapScale);
          set(e, "--global-title-opacity", flight.titleOpacity);
        }
        set(e, "--flight-x", scene.videoReady ? 0 : flight.cameraX, "%");
        set(e, "--flight-y", scene.videoReady ? 0 : flight.cameraY, "%");
        set(e, "--flight-scale", scene.videoReady ? 1 : flight.cameraScale);
        set(e, "--flight-bank", scene.videoReady ? 0 : flight.cameraBank, "deg");
        set(e, "--flight-veil-opacity", flight.veilOpacity);
        set(e, "--flight-focus-opacity", scene.videoReady ? 0 : flight.focusOpacity);
        set(e, "--flight-focus-scale", flight.focusScale);
        set(e, "--flight-focus-y", flight.focusY * scene.viewport, "px");
        if (scene.globe) {
          // 영상과 같은 진행도로 제목을 전환하고, 정지 이미지 복구에서는 세계 메시지를 제공합니다.
          const title = scene.type === "global" ?
            globalVisionTitleState(scene.videoReady ? flight.videoSeconds : GLOBAL_FLIGHT_END_SECONDS) :
            consultingGlobeTitleState(scene.videoReady ? flight.flightProgress * 12 : 12);
          set(e, "--globe-korea-title", title.koreaOpacity);
          set(e, "--globe-global-title", title.globalOpacity);
        }
        scene.flightPins.forEach((pin, index) => {
          const values = flight.pins[index];
          if (!values) return;
          set(pin, "--flight-pin-opacity", scene.videoReady ? 0 : values.opacity);
          set(pin, "--flight-pin-scale", values.scale);
          set(pin, "--flight-pin-y", values.y, "px");
          set(pin, "--flight-pin-ring-opacity", scene.videoReady ? 0 : values.ringOpacity);
          set(pin, "--flight-pin-ring-scale", values.ringScale);
        });
        if (scene.videoReady) {
          scene.videoTarget = scene.type === "global" ? Math.min(flight.videoSeconds, scene.video.duration) : flight.flightProgress * scene.video.duration;
          e.dataset.flightVideoTime = scene.videoTarget.toFixed(4);
          seekVideo(scene);
        } else {
          scene.videoTarget = null;
          delete e.dataset.flightVideoTime;
        }
      } else {
        delete e.dataset.flightProgress;
        delete e.dataset.flightDisplayProgress;
        delete e.dataset.flightPhase;
        delete e.dataset.flightMedia;
        delete e.dataset.flightVideoTime;
        scene.videoTarget = null;
        sceneVars.slice(4).forEach((name) => e.style.removeProperty(name));
        scene.flightPins.forEach((pin) => pinVars.forEach((name) => pin.style.removeProperty(name)));
      }
    }
    // 한 번의 빠른 입력도 줌과 비행을 통과하며, 목표에 도착하면 RAF를 종료합니다.
    if (following) schedule();
    else lastPaintTime = null;
  }
  function schedule() {
    if (running && enabled && !frame && !root.hidden) frame = win.requestAnimationFrame(paint);
  }
  function refresh() {
    refreshFrame = 0;
    if (!running) return;
    if (!desktop.matches && !compact.matches) {
      if (enabled) clear();
      enabled = false;
      motion = false;
      return;
    }
    enabled = true;
    wrapper.classList.toggle("ai-pages-mobile", compact.matches);
    if (section) {
      section.removeAttribute("aria-labelledby");
      section.setAttribute("aria-label", "핑덤 AI 서비스");
    }
    motion = !(reducedMotion?.matches ?? reducedMotion ?? reduced.matches) &&
      (desktop.matches || (win.innerWidth < 1000 && win.innerHeight >= 620));
    wrapper.classList.toggle("ai-pages-motion", motion);
    const headerHeight = root.querySelector(".site-header")?.getBoundingClientRect().height ?? 72;
    const viewport = Math.max(1, win.innerHeight - headerHeight);
    for (const scene of scenes) {
      const sceneMotion = motion && (!compact.matches || scene.type === "global");
      const rect = scene.element.getBoundingClientRect();
      const videoNearby = desktop.matches || (rect.top < win.innerHeight * 2 && rect.top + rect.height > -viewport);
      for (const asset of scene.assets)
        if (!asset.getAttribute("src")) asset.setAttribute("src", asset.dataset.desktopSrc);
      // 영상 준비가 늦어도 소개를 먼저 읽고, 동작 줄이기에서는 완성 지구의 정지 이미지를 제공합니다.
      if ((sceneMotion || scene.globe) && hasFlight(scene)) for (const asset of scene.flightAssets)
        if (!asset.getAttribute("src")) asset.setAttribute("src", asset.dataset.desktopSrc);
      if (sceneMotion && hasFlight(scene) && hasVideo(scene)) {
        if (videoNearby && !scene.video.getAttribute("src")) scene.video.setAttribute("src", scene.video.dataset.desktopSrc);
      } else releaseVideo(scene);
      // 배경만 실패하면 읽을 수 있는 제품면을 유지하고, 원본 UI 실패는 정지 흐름으로 복구합니다.
      scene.prepared = scene.assets.every((asset) => (asset.complete && asset.naturalWidth > 0) ||
        (asset.classList.contains("ai-asset-failed") && !("aiRequired" in asset.dataset)));
      scene.element.classList.toggle("ai-page-prepared", scene.prepared);
      scene.element.classList.toggle("ai-page-static", !sceneMotion || !scene.prepared || scene.failed || !validStructure(scene));
      // 준비 전후에도 runway를 유지하여 다음 섹션의 앵커가 움직이지 않게 합니다.
      scene.element.classList.toggle("ai-page-pending", sceneMotion && !scene.prepared && !scene.failed && validStructure(scene));
      // 처음 성공한 자산 준비와 각 seek의 일시적인 decode 대기를 분리합니다.
      if (sceneMotion && hasFlight(scene) && !scene.videoFailed && videoDecoded(scene)) scene.videoDecodedOnce = true;
      scene.videoReady = sceneMotion && hasFlight(scene) && !scene.videoFailed && scene.videoDecodedOnce;
      const photoReady = hasPhoto(scene) && !scene.flightFailed && scene.flightAssets.every((asset) => asset.complete && asset.naturalWidth > 0);
      scene.flightReady = sceneMotion && hasFlight(scene) && (scene.videoReady || photoReady);
      scene.element.classList.toggle("flight-ready", scene.flightReady && scene.prepared && !scene.failed && validStructure(scene));
      scene.element.classList.toggle("flight-unavailable", sceneMotion && hasFlight(scene) && !scene.flightReady);
      scene.element.classList.toggle("flight-video-ready", scene.videoReady && scene.prepared && !scene.failed && validStructure(scene));
      scene.element.classList.toggle("flight-video-pending", sceneMotion && hasFlight(scene) && hasVideo(scene) && !scene.videoReady && !scene.videoFailed);
      scene.element.classList.toggle("flight-video-unavailable", sceneMotion && hasFlight(scene) && hasVideo(scene) && scene.videoFailed);
      const entryDistance = viewport * 0.2;
      scene.top = rect.top + win.scrollY - headerHeight - entryDistance;
      scene.distance = Math.max(1, rect.height - viewport + entryDistance);
      scene.viewport = viewport;
    }
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0;
    paint(undefined, true);
  }
  function scheduleRefresh() {
    if (running && !refreshFrame) refreshFrame = win.requestAnimationFrame(refresh);
  }
  function bind(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    cleanups.push(() => target.removeEventListener(event, handler, options));
  }
  function visibility() {
    if (root.hidden) {
      if (frame) win.cancelAnimationFrame(frame);
      frame = 0;
      lastPaintTime = null;
      scenes.forEach((scene) => { scene.videoTarget = null; scene.video?.pause?.(); });
    } else scheduleRefresh();
  }
  function start() {
    if (running) return;
    running = true;
    bind(win, "scroll", schedule, { passive: true });
    bind(win, "resize", scheduleRefresh, { passive: true });
    bind(win, "hashchange", scheduleRefresh);
    bind(win, "popstate", scheduleRefresh);
    bind(win, "pingdom:navigate", scheduleRefresh);
    bind(root, "visibilitychange", visibility);
    bind(desktop, "change", scheduleRefresh);
    bind(compact, "change", scheduleRefresh);
    bind(reduced, "change", scheduleRefresh);
    for (const trigger of triggers) {
      const dialog = dialogs.find((item) => item.element.id === trigger.dataset.aiDialogOpen);
      if (dialog) bind(trigger, "click", () => openDialog(dialog, trigger));
    }
    for (const dialog of dialogs) {
      bind(dialog.element, "close", () => { if (!dialog.element.open) finishDialog(dialog); });
      for (const closer of dialog.closers) bind(closer, "click", () => closeDialog(dialog));
      for (const asset of dialog.assets) {
        bind(asset, "load", () => {
          if (dialog.assets.every((image) => image.complete && image.naturalWidth > 0)) {
            dialog.element.classList.remove("ai-dialog-failed");
            if (dialog.error) dialog.error.hidden = true;
          }
        });
        bind(asset, "error", () => {
          if (!running || !enabled || !desktop.matches) return;
          if (asset.dataset.aiFallback && asset.getAttribute("src") !== asset.dataset.aiFallback)
            asset.setAttribute("src", asset.dataset.aiFallback);
          else {
            dialog.element.classList.add("ai-dialog-failed");
            if (dialog.error) dialog.error.hidden = false;
          }
        });
      }
    }
    for (const scene of scenes) for (const asset of scene.assets) {
      bind(asset, "load", () => {
        asset.classList.remove("ai-asset-failed");
        scheduleRefresh();
      });
      bind(asset, "error", () => {
        if (!running || !enabled || (!desktop.matches && !compact.matches)) return;
        if ("aiRequired" in asset.dataset) scene.failed = true;
        if (asset.dataset.aiFallback && asset.getAttribute("src") !== asset.dataset.aiFallback)
          asset.setAttribute("src", asset.dataset.aiFallback);
        else asset.classList.add("ai-asset-failed");
        scheduleRefresh();
      });
    }
    for (const scene of scenes) for (const asset of scene.flightAssets) {
      bind(asset, "load", () => {
        asset.classList.remove("ai-asset-failed");
        scene.flightFailed = false;
        scheduleRefresh();
      });
      bind(asset, "error", () => {
        if (!running || !enabled || (!desktop.matches && !compact.matches)) return;
        if (asset.dataset.aiFallback && asset.getAttribute("src") !== asset.dataset.aiFallback)
          asset.setAttribute("src", asset.dataset.aiFallback);
        else {
          asset.classList.add("ai-asset-failed");
          scene.flightFailed = true;
        }
        scheduleRefresh();
      });
    }
    for (const scene of scenes) for (const video of scene.flightVideos) {
      const ready = () => {
        if (!running || !enabled || (!desktop.matches && !compact.matches) || !motion || scene.videoReady) return;
        if (videoDecoded(scene)) {
          scene.videoFailed = false;
          video.classList.remove("ai-asset-failed");
        }
        scheduleRefresh();
      };
      for (const type of ["loadedmetadata", "loadeddata", "canplay"]) bind(video, type, ready);
      bind(video, "seeked", () => seekVideo(scene));
      bind(video, "error", () => {
        if (!running || !enabled || (!desktop.matches && !compact.matches) || !motion) return;
        scene.videoFailed = true;
        scene.videoReady = false;
        scene.videoDecodedOnce = false;
        scene.videoTarget = null;
        video.classList.add("ai-asset-failed");
        scheduleRefresh();
      });
    }
    if (win.ResizeObserver) {
      observer = new win.ResizeObserver(scheduleRefresh);
      observer.observe(wrapper);
      if (root.documentElement) observer.observe(root.documentElement);
      for (const scene of scenes) observer.observe(scene.element);
      const header = root.querySelector(".site-header");
      if (header) observer.observe(header);
    }
    root.fonts?.ready.then(() => { if (running) scheduleRefresh(); });
    refresh();
  }
  function stop() {
    if (!running) return;
    running = false;
    closeDialogs();
    cleanups.splice(0).forEach((cleanup) => cleanup());
    observer?.disconnect();
    observer = undefined;
    if (frame) win.cancelAnimationFrame(frame);
    if (refreshFrame) win.cancelAnimationFrame(refreshFrame);
    frame = refreshFrame = 0;
    lastPaintTime = null;
    scenes.forEach((scene) => { scene.renderedProgress = null; scene.videoTarget = null; scene.video?.pause?.(); });
  }
  function dispose() { stop(); clear(); enabled = false; motion = false; }
  start();
  return { start, stop, refresh, dispose };
}
