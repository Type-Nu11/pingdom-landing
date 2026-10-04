import { clamp, ease, mix, phase } from "./story-scroll.mjs?v=rebuild-1";

// 설명 사이의 이동만 보간하고, 각 설명 앞뒤에는 읽을 수 있는 상태를 유지합니다.
export function sequenceState(progress, count) {
  if (count < 2) return [1];
  const position = clamp(progress) * (count - 1);
  const index = Math.min(count - 2, Math.floor(position));
  const blend = ease(phase(position - index, 0.36, 0.7));
  return Array.from({ length: count }, (_, i) =>
    i === index ? 1 - blend : i === index + 1 ? blend : 0,
  );
}

export function panelState(progress, index) {
  const lift = ease(
    phase(progress, index === 0 ? 0.04 : 0.64, index === 0 ? 0.22 : 0.84),
  );
  return {
    x: mix(0, index === 0 ? -8 : 6, lift),
    y: mix(0, -16, lift),
    scale: mix(1, 1.025, lift),
    shadow: mix(0, 0.12, lift),
  };
}

// 단말기는 크기를 고정하고, 같은 위치에서 완성된 화면끼리 전환합니다.
export function visitPose(progress, index, weight, entrance = 1) {
  return {
    // 전체 단말기끼리 겹치면 글자와 프레임이 이중으로 보이므로 흰 지면을 거쳐 교체합니다.
    opacity: ease(clamp((weight - .5) * 2)) * entrance,
    y: (1 - entrance) * 60,
    rotation: (1 - entrance) * -7,
    scale: 1,
  };
}

export function createDesktopMotion({ root = document, win = window } = {}) {
  const desktop = win.matchMedia("(min-width: 1000px) and (min-height: 701px)");
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)");
  const scenes = [...root.querySelectorAll("[data-desktop-sequence]")].map(
    (section) => {
      const merchant = section.dataset.desktopSequence === "merchant";
      let products = [
        ...section.querySelectorAll(
          merchant
            ? ".merchant-screen"
            : "[data-visit-product]",
        ),
      ];
      if (!merchant && !products.length)
        products = [...section.querySelectorAll(".place-product, .booking-product, .memory-product")];
      let copies = [...section.querySelectorAll(merchant ? ".merchant-beat" : "[data-visit-copy]")];
      if (!merchant && !copies.length) copies = [...section.querySelectorAll(".card-copy")];
      return {
        section,
        merchant,
        copies,
        originalCopyAria: copies.map(copy => copy.getAttribute("aria-hidden")),
        products,
        originalAria: products.map((product) =>
          product.getAttribute("aria-hidden"),
        ),
        top: 0,
        distance: 1,
        eventReady: false,
        copyCenters: [],
        viewportHeight: 1,
      };
    },
  );
  const assets = [
    ...root.querySelectorAll("[data-desktop-sequence] img[data-desktop-src]"),
  ];
  const cleanups = [];
  const failedAssets = new Set();
  const productVars = [
    "--desktop-product-visibility",
    "--desktop-product-clip",
    "--visit-product-opacity",
    "--visit-product-y",
    "--visit-product-rotation",
  ];
  const panelVars = [
    "--desktop-panel-x",
    "--desktop-panel-y",
    "--desktop-panel-scale",
    "--desktop-panel-shadow",
  ];
  let running = false,
    enabled = false,
    frame = 0,
    refreshFrame = 0,
    observer;

  function clear() {
    root.documentElement.classList.remove("desktop-motion-enabled");
    for (const scene of scenes) {
      delete scene.section.dataset.desktopProgress;
      scene.copies.forEach((copy, index) => {
        for (const key of ["--desktop-copy-opacity", "--visit-copy-opacity", "--visit-copy-y"])
          copy.style.removeProperty(key);
        const original = scene.originalCopyAria[index];
        if (original === null) copy.removeAttribute("aria-hidden");
        else copy.setAttribute("aria-hidden", original);
      });
      scene.products.forEach((product, i) => {
        product.classList.remove("desktop-panel-ready");
        productVars.forEach((key) => product.style.removeProperty(key));
        const original = scene.originalAria[i];
        if (original === null) product.removeAttribute("aria-hidden");
        else product.setAttribute("aria-hidden", original);
      });
      for (const panel of scene.section.querySelectorAll(".merchant-panel"))
        panelVars.forEach((key) => panel.style.removeProperty(key));
    }
    // 새 PC 레이어는 좁은 화면 진입 시 원본 모바일 문서와 분리합니다.
    assets.forEach((asset) => asset.removeAttribute("src"));
  }
  function paint() {
    frame = 0;
    if (!running || !enabled || root.hidden) return;
    const y = win.scrollY;
    for (const scene of scenes) {
      const p = clamp((y - scene.top) / scene.distance);
      scene.section.dataset.desktopProgress = p.toFixed(4);
      const copyWeights = sequenceState(p, scene.products.length);
      const weights =
        scene.merchant && !scene.eventReady ? [1, 0] : copyWeights;
      const entrance = scene.merchant ? 1 : ease(clamp((y - scene.top + scene.viewportHeight * .5) / (scene.viewportHeight * .5)));
      weights.forEach((weight, i) => {
        const product = scene.products[i];
        product.style.setProperty(
          "--desktop-product-visibility",
          weight === 0 ? "hidden" : "visible",
        );
        const edge = (1 - weight) * 100;
        product.style.setProperty(
          "--desktop-product-clip",
          !scene.merchant ? "inset(0 0 0 0)" : p * (weights.length - 1) > i
            ? `inset(0 0 ${edge}% 0)`
            : `inset(${edge}% 0 0 0)`,
        );
        product.setAttribute("aria-hidden", String(weight < 0.5));
        scene.copies[i].style.setProperty(
          "--desktop-copy-opacity",
          String(mix(0.24, 1, copyWeights[i])),
        );
        if (!scene.merchant) {
          const pose = visitPose(p, i, weight, entrance);
          product.style.setProperty("--visit-product-opacity", String(pose.opacity));
          product.style.setProperty("--visit-product-y", `${pose.y}px`);
          product.style.setProperty("--visit-product-rotation", `${pose.rotation}deg`);
          const copyAlpha = ease(clamp((weight - .5) * 2)) * entrance;
          scene.copies[i].style.setProperty("--visit-copy-opacity", String(copyAlpha));
          scene.copies[i].style.setProperty("--visit-copy-y", `${(1 - copyAlpha) * (p * (weights.length - 1) > i ? -18 : 18) + (1 - entrance) * 24}px`);
          scene.copies[i].setAttribute("aria-hidden", String(weight < .5));
        }
      });
      if (scene.merchant) {
        scene.section
          .querySelectorAll(".merchant-panel")
          .forEach((panel, i) => {
            const pose = panelState(p, i);
            panel.style.setProperty("--desktop-panel-x", `${pose.x}px`);
            panel.style.setProperty("--desktop-panel-y", `${pose.y}px`);
            panel.style.setProperty(
              "--desktop-panel-scale",
              String(pose.scale),
            );
            panel.style.setProperty(
              "--desktop-panel-shadow",
              String(pose.shadow),
            );
          });
      }
    }
  }
  function schedule() {
    if (running && enabled && !frame && !root.hidden)
      frame = win.requestAnimationFrame(paint);
  }
  function refresh() {
    refreshFrame = 0;
    if (!running) return;
    const next = desktop.matches && !reduced.matches && failedAssets.size === 0;
    if (!next) {
      if (enabled) clear();
      enabled = false;
      if (frame) win.cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    enabled = true;
    root.documentElement.classList.add("desktop-motion-enabled");
    for (const asset of assets)
      if (!asset.getAttribute("src"))
        asset.setAttribute("src", asset.dataset.desktopSrc);
    // crop 로딩이 늦거나 실패해도 원본 화면에 빈 영역을 만들지 않습니다.
    for (const scene of scenes.filter((scene) => scene.merchant)) {
      scene.products.forEach((product) => {
        const panel = product.querySelector(".merchant-panel");
        product.classList.toggle(
          "desktop-panel-ready",
          Boolean(panel?.complete && panel.naturalWidth > 0),
        );
      });
      const eventImage = scene.products[1].querySelector("img");
      scene.eventReady = Boolean(
        eventImage?.complete && eventImage.naturalWidth > 0,
      );
    }
    const headerHeight =
      root.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
    const readingCenter = headerHeight + (win.innerHeight - headerHeight) * 0.5;
    for (const scene of scenes) {
      const rectangles = scene.copies.map(copy => copy.getBoundingClientRect());
      const first = rectangles[0];
      const last = rectangles.at(-1);
      // 진입 모션의 시각적 이동은 설명의 실제 문서 간격에 포함하지 않습니다.
      const shiftOf = (copy) => parseFloat(copy.style.getPropertyValue?.('--visit-copy-y') || copy.style.getPropertyValue?.('--polish-copy-y') || '0') || 0;
      const firstShift = shiftOf(scene.copies[0]);
      const lastShift = shiftOf(scene.copies.at(-1));
      const firstCenter = first.top + first.height * 0.5 - firstShift;
      const lastCenter = last.top + last.height * 0.5 - lastShift;
      scene.top = firstCenter + win.scrollY - readingCenter;
      scene.distance = Math.max(1, lastCenter - firstCenter);
      scene.copyCenters = scene.copies.map((copy, index) => {
        const rect = rectangles[index];
        const shift = shiftOf(copy);
        return rect.top + rect.height * .5 - shift + win.scrollY;
      });
      if (!scene.merchant) {
        const bounds = scene.section.getBoundingClientRect();
        scene.viewportHeight = win.innerHeight - headerHeight;
        scene.top = bounds.top + win.scrollY - headerHeight;
        scene.distance = Math.max(1, bounds.height - scene.viewportHeight);
      }
    }
    paint();
  }
  function scheduleRefresh() {
    if (running && !refreshFrame)
      refreshFrame = win.requestAnimationFrame(refresh);
  }
  function visibility() {
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
    bind(win, "load", scheduleRefresh);
    bind(win, "hashchange", scheduleRefresh);
    bind(root, "visibilitychange", visibility);
    for (const query of [desktop, reduced])
      bind(query, "change", scheduleRefresh);
    for (const image of root.querySelectorAll("[data-desktop-sequence] img")) {
      bind(image, "load", scheduleRefresh);
      bind(image, "error", () => {
        if (assets.includes(image)) failedAssets.add(image);
        scheduleRefresh();
      });
    }
    root.fonts?.ready.then(() => {
      if (running) scheduleRefresh();
    });
    if (win.ResizeObserver) {
      observer = new win.ResizeObserver(scheduleRefresh);
      // 앞 구간이 비동기로 길어져도 동일한 크기의 방문 지면 위치를 다시 측정합니다.
      observer.observe(root.documentElement);
      scenes.forEach((scene) => observer.observe(scene.section));
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
    clear();
    enabled = false;
  }
  start();
  return { start, stop, refresh: scheduleRefresh, dispose };
}
