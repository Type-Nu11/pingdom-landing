import { clamp, ease, mix, phase, journeyState } from './story-scroll.mjs?v=revision-33';
import { sequenceState, visitPose } from './desktop-motion.mjs?v=revision-17';
import { merchantDesktopState } from './desktop-polish.mjs?v=revision-31';

// 웹과 같은 상태 계산을 사용하고, 세로 화면의 구도와 이동 거리만 조정합니다.
export function createMobileMotion({ root = document, win = window } = {}) {
  const compact = win.matchMedia('(max-width: 999px) and (min-height: 620px), (max-width: 999px) and (min-height: 520px) and (orientation: portrait)');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const journey = root.querySelector('.journey-scene');
  const visit = root.querySelector('.visit-grid');
  const platform = root.querySelector('.platform-scene');
  const merchant = root.querySelector('.merchant-section');
  const merchantStage = root.querySelector('.merchant-desktop');
  const products = [...root.querySelectorAll('[data-visit-product]')];
  const copies = [...root.querySelectorAll('[data-visit-copy]')];
  const cards = [...root.querySelectorAll('[data-platform-card]')];
  const merchantCopies = [...root.querySelectorAll('[data-merchant-copy]')];
  const merchantScreens = [...root.querySelectorAll('[data-merchant-screen]')];
  const originals = new Map(), styles = new Map(), cleanups = [];
  const scenes = [journey, visit, platform, merchant].filter(Boolean);
  let running = false, enabled = false, frame = 0, refreshFrame = 0, observer, merchantFailed = false;
  let nav = 64, viewport = 1, geometry = new Map();
  function attribute(element, name, value) {
    if (!element) return;
    if (!originals.has(element)) originals.set(element, new Map());
    if (!originals.get(element).has(name)) originals.get(element).set(name, element.getAttribute(name));
    if (element.getAttribute(name) !== String(value)) element.setAttribute(name, String(value));
  }
  function set(element, values) {
    if (!element) return;
    if (!styles.has(element)) styles.set(element, new Set());
    for (const [name, value] of Object.entries(values)) {
      styles.get(element).add(name);
      element.style.setProperty(name, String(value));
    }
  }
  function clear() {
    root.documentElement.classList.remove('mobile-motion');
    for (const [element, names] of styles) for (const name of names) element.style.removeProperty(name);
    for (const [element, attributes] of originals) for (const [name, value] of attributes) {
      if (value === null) element.removeAttribute(name); else element.setAttribute(name, value);
    }
    styles.clear(); originals.clear();
    scenes.forEach(scene => { delete scene.dataset.mobileProgress; });
  }
  const progress = element => {
    const bounds = geometry.get(element);
    return bounds ? clamp((win.scrollY - bounds.top + nav) / Math.max(1, bounds.height - viewport)) : 0;
  };
  function paint() {
    frame = 0;
    if (!running || !enabled || root.hidden) return;
    scenes.forEach(scene => { scene.dataset.mobileProgress = progress(scene).toFixed(4); });
    if (journey) {
      const p = progress(journey), state = journeyState(p, true);
      set(journey, {
        '--mobile-photo-x': state.photoX + '%', '--mobile-photo-y': state.photoY + '%',
        '--mobile-photo-w': state.photoWidth + '%', '--mobile-photo-h': state.photoHeight + '%',
        '--mobile-photo-r': state.photoRadius + 'px', '--mobile-shade': state.shade,
        '--mobile-opening': state.openingOpacity, '--mobile-opening-y': state.openingY + 'px',
        '--mobile-copy': state.copyOpacity, '--mobile-copy-y': state.copyY + 'px',
        '--mobile-product': state.productOpacity, '--mobile-product-y': state.productY + 'px',
      });
      attribute(journey.querySelector('.journey-copy'), 'inert', '');
      if (state.copyOpacity >= .99) journey.querySelector('.journey-copy')?.removeAttribute('inert');
    }
    if (visit) {
      sequenceState(progress(visit), products.length).forEach((weight, index) => {
        const pose = visitPose(progress(visit), index, weight);
        const alpha = pose.opacity;
        set(products[index], { '--mobile-beat': alpha, '--mobile-beat-y': pose.y + 'px' });
        set(copies[index], { '--mobile-beat': alpha, '--mobile-beat-y': mix(18, 0, alpha) + 'px' });
        for (const element of [products[index], copies[index]]) {
          attribute(element, 'aria-hidden', weight < .5);
          attribute(element, 'inert', '');
          if (weight >= .5) element?.removeAttribute('inert');
        }
      });
    }
    if (platform) {
      const p = progress(platform), weights = sequenceState(p, cards.length);
      cards.forEach((card, index) => {
        set(card, { '--mobile-platform-opacity': weights[index], '--mobile-platform-scale': mix(1.06, 1, ease(phase(p, index / 3, (index + 1) / 3))) });
        attribute(card, 'aria-hidden', weights[index] < .5);
      });
    }
    if (merchant && merchantStage && !merchantFailed) {
      const p = progress(merchant);
      const ready = merchantScreens[1]?.querySelector('img');
      const state = merchantDesktopState(ready?.complete && ready.naturalWidth ? p : Math.min(p, .5));
      set(merchantStage, {
        '--merchant-intro-copy': state.introCopyOpacity, '--merchant-register-copy': state.registerCopyOpacity,
        '--merchant-event-copy': state.eventCopyOpacity, '--merchant-screen-blend': state.eventOpacity,
        '--merchant-web-y': state.y * viewport + 'px', '--merchant-web-rx': state.rx + 'deg',
        '--merchant-web-ry': state.ry + 'deg', '--merchant-web-scale': state.scale,
        '--merchant-intro-copy-y': state.introCopyY * viewport * .3 + 'px',
        '--merchant-register-copy-y': state.registerCopyY * viewport * .3 + 'px',
        '--merchant-event-copy-y': state.eventCopyY * viewport * .3 + 'px',
      });
      merchantCopies.forEach((copy, index) => attribute(copy, 'aria-hidden', index !== state.activeCopy));
      merchantScreens.forEach((screen, index) => attribute(screen, 'aria-hidden', index === 0 ? state.eventOpacity >= .5 : state.eventOpacity < .5));
    }
  }
  function schedule() {
    if (running && enabled && !root.hidden && !frame) frame = win.requestAnimationFrame(paint);
  }
  function refresh() {
    refreshFrame = 0;
    if (!running) return;
    const next = compact.matches && !reduced.matches;
    if (!next) { if (enabled) clear(); enabled = false; return; }
    enabled = true;
    root.documentElement.classList.add('mobile-motion');
    nav = root.querySelector('.site-header')?.getBoundingClientRect().height ?? 64;
    // svh 기반 지면은 모바일 주소표시줄이 열리고 닫혀도 길이와 상태가 유지됩니다.
    viewport = journey?.querySelector('.journey-stage')?.clientHeight || win.innerHeight - nav;
    geometry = new Map(scenes.map(scene => {
      const rect = scene.getBoundingClientRect();
      return [scene, { top: rect.top + win.scrollY, height: rect.height }];
    }));
    if (platform) attribute(platform, 'aria-labelledby', 'platform-desktop-title');
    if (merchantStage) {
      merchant.classList.toggle('mobile-merchant-fallback', merchantFailed);
      attribute(merchant, 'aria-labelledby', merchantFailed ? 'merchant-title' : 'merchant-v2-title');
      attribute(merchantStage, 'aria-hidden', merchantFailed);
      for (const image of merchantStage.querySelectorAll('img[data-desktop-hq]')) {
        attribute(image, 'src', image.dataset.desktopHq);
      }
    }
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0;
    paint();
  }
  function scheduleRefresh() {
    if (running && !refreshFrame) refreshFrame = win.requestAnimationFrame(refresh);
  }
  function bind(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    cleanups.push(() => target.removeEventListener(type, callback, options));
  }
  function start() {
    if (running) return;
    running = true;
    bind(win, 'scroll', schedule, { passive: true });
    bind(win, 'resize', scheduleRefresh, { passive: true });
    bind(win, 'load', scheduleRefresh);
    bind(compact, 'change', scheduleRefresh);
    bind(reduced, 'change', scheduleRefresh);
    bind(root, 'visibilitychange', schedule);
    for (const image of root.querySelectorAll('.merchant-desktop img')) {
      bind(image, 'load', scheduleRefresh);
      bind(image, 'error', () => {
        if (!enabled) return;
        merchantFailed = true;
        scheduleRefresh();
      });
    }
    if (win.ResizeObserver) {
      observer = new win.ResizeObserver(scheduleRefresh);
      observer.observe(root.documentElement);
    }
    root.fonts?.ready.then(() => { if (running) scheduleRefresh(); });
    refresh();
  }
  function stop() {
    running = false;
    if (frame) win.cancelAnimationFrame(frame);
    if (refreshFrame) win.cancelAnimationFrame(refreshFrame);
    frame = refreshFrame = 0;
    observer?.disconnect();
    cleanups.splice(0).forEach(cleanup => cleanup());
  }
  function dispose() { stop(); clear(); enabled = false; }
  start();
  return { start, stop, refresh: scheduleRefresh, dispose };
}
