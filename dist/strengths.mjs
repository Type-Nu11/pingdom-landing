import { clamp } from './story-scroll.mjs?v=rebuild-1';

export const STRENGTH_POINTS = [0, .20, .32, .44, .56, .68, .80, .92];

export function strengthsState(progress) {
  const p = clamp(progress);
  const lastIndex = STRENGTH_POINTS.length - 1;
  let segment = 0;
  while (segment < lastIndex - 1 && p > STRENGTH_POINTS[segment + 1]) segment++;
  const start = STRENGTH_POINTS[segment];
  const end = STRENGTH_POINTS[segment + 1];
  const position = segment + clamp((p - start) / (end - start));
  return {
    travel: position / lastIndex,
    active: Math.min(lastIndex, Math.round(position)),
  };
}

// 완성된 카드 사이의 이동만 스크롤에 연결하고, 역스크롤에서도 같은 위치를 복원합니다.
export function createStrengths({ root = document, win = window } = {}) {
  const scene = root.querySelector('.strengths-scene');
  const track = scene?.querySelector('[data-strength-track]');
  const viewport = scene?.querySelector('[data-strength-viewport]');
  const cards = [...(scene?.querySelectorAll('[data-strength-card]') ?? [])];
  const count = scene?.querySelector('[data-strength-count]');
  if (!scene || !track || !viewport || cards.length !== STRENGTH_POINTS.length)
    return { start() {}, stop() {}, refresh() {}, dispose() {} };
  const total = String(cards.length).padStart(2, '0');
  const desktop = win.matchMedia('(min-width: 1000px) and (min-height: 701px)');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const cleanups = [];
  let running = false, disposed = false, motion = false, frame = 0, resizeFrame = 0, observer;
  let top = 0, distance = 1, travel = 0;
  const set = (element, name, value) => {
    if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
  };
  function paint() {
    frame = 0;
    if (!running || !motion || root.hidden) return;
    const state = strengthsState((win.scrollY - top) / distance);
    set(track, '--strength-x', `${-Math.round(travel * state.travel)}px`);
    scene.dataset.strengthActive = String(state.active + 1);
    if (count) count.textContent = `${String(state.active + 1).padStart(2, '0')} / ${total}`;
  }
  function schedule() {
    if (running && motion && !root.hidden && !frame) frame = win.requestAnimationFrame(paint);
  }
  function refresh() {
    resizeFrame = 0;
    if (!running) return;
    motion = desktop.matches && !reduced.matches;
    scene.classList.toggle('strengths-motion', motion);
    if (!motion) {
      if (frame) win.cancelAnimationFrame(frame);
      frame = 0;
      track.style.removeProperty('--strength-x');
      delete scene.dataset.strengthActive;
      if (count) count.textContent = `${total} FEATURES`;
      return;
    }
    const header = root.querySelector('.site-header')?.getBoundingClientRect().height ?? 72;
    const rect = scene.getBoundingClientRect();
    top = rect.top + win.scrollY - header;
    distance = Math.max(1, rect.height - (win.innerHeight - header));
    travel = Math.max(0, track.scrollWidth - viewport.clientWidth);
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0;
    paint();
  }
  function scheduleRefresh() {
    if (running && !resizeFrame) resizeFrame = win.requestAnimationFrame(refresh);
  }
  function bind(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    cleanups.push(() => target.removeEventListener(type, callback, options));
  }
  function start() {
    if (running || disposed) return;
    running = true;
    bind(win, 'scroll', schedule, { passive: true });
    bind(win, 'resize', scheduleRefresh, { passive: true });
    bind(win, 'pageshow', scheduleRefresh);
    bind(root, 'visibilitychange', scheduleRefresh);
    bind(desktop, 'change', scheduleRefresh);
    bind(reduced, 'change', scheduleRefresh);
    root.fonts?.ready.then(scheduleRefresh);
    if (win.ResizeObserver) {
      observer = new win.ResizeObserver(scheduleRefresh);
      observer.observe(viewport);
    }
    refresh();
  }
  function stop() {
    running = false;
    if (frame) win.cancelAnimationFrame(frame);
    if (resizeFrame) win.cancelAnimationFrame(resizeFrame);
    frame = resizeFrame = 0;
    observer?.disconnect();
    cleanups.splice(0).forEach(cleanup => cleanup());
  }
  function dispose() {
    stop(); disposed = true;
    scene.classList.remove('strengths-motion');
    track.style.removeProperty('--strength-x');
    delete scene.dataset.strengthActive;
    if (count) count.textContent = `${total} FEATURES`;
  }
  start();
  return { start, stop, refresh: scheduleRefresh, dispose };
}
