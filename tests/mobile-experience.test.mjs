import test from 'node:test';
import assert from 'node:assert/strict';
import { createMobileExperience } from '../dist/mobile-experience.mjs';

class Target {
  listeners = new Map();
  addEventListener(type, handler) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(handler);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  emit(type, values = {}) {
    for (const handler of [...(this.listeners.get(type) ?? [])])
      handler({ type, target: this, ...values });
  }
  count(type) { return this.listeners.get(type)?.size ?? 0; }
}

function element(attributes = {}) {
  const target = Object.assign(new Target(), { attributes: new Map(Object.entries(attributes)), classes: new Set(), dataset: {} });
  target.getAttribute = name => target.attributes.get(name) ?? null;
  target.setAttribute = (name, value) => target.attributes.set(name, String(value));
  target.removeAttribute = name => target.attributes.delete(name);
  target.classList = {
    add: (...names) => names.forEach(name => target.classes.add(name)),
    remove: (...names) => names.forEach(name => target.classes.delete(name)),
    contains: name => target.classes.has(name),
    toggle(name, force = !target.classes.has(name)) {
      if (force) target.classes.add(name);
      else target.classes.delete(name);
      return force;
    },
  };
  target.closest = selector => {
    const attribute = selector.slice(1, -1);
    return target.attributes.has(attribute) ? target : target.parentElement?.closest?.(selector) ?? null;
  };
  Object.defineProperty(target, 'src', {
    get: () => target.getAttribute('src') ?? '',
    set: value => target.setAttribute('src', value),
  });
  return target;
}

// native close 이벤트는 다음 task에 도착하므로 정리 시점과 실제 DOM 이벤트를 분리합니다.
function fixture({ reduced = false } = {}) {
  const root = Object.assign(new Target(), { documentElement: element() });
  const win = new Target();
  const mobile = Object.assign(new Target(), { matches: true });
  const reducedQuery = Object.assign(new Target(), { matches: reduced });
  win.matchMedia = query => query.includes('reduced-motion') ? reducedQuery : mobile;
  const observers = [];
  win.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.disconnected = false; this.targets = []; observers.push(this); }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected = true; }
  };

  const viewport = Object.assign(element(), { scrollWidth: 2400, clientWidth: 360, scrollLeft: 0, scrolls: [] });
  viewport.scrollBy = options => {
    viewport.scrolls.push(options);
    viewport.scrollLeft = Math.max(0, Math.min(viewport.scrollWidth - viewport.clientWidth, viewport.scrollLeft + options.left));
    viewport.emit('scroll');
  };
  const firstCard = { offsetLeft: 20, nextElementSibling: { offsetLeft: 322 } };
  const track = { querySelector: selector => selector === '.strength-card' ? firstCard : null };
  const previous = element({ 'data-strength-direction': '-1' });
  const next = element({ 'data-strength-direction': '1' });
  previous.dataset.strengthDirection = '-1';
  next.dataset.strengthDirection = '1';

  const dialog = Object.assign(element(), { open: false, shows: 0 });
  const preview = element(), title = element(), zoom = element({ 'data-mobile-zoom': '' }), hint = element();
  const closer = element({ 'data-mobile-close': '' });
  dialog.querySelector = selector => ({
    '[data-mobile-screen-image]': preview,
    '#mobile-screen-title': title,
    '[data-mobile-zoom]': zoom,
    '[data-mobile-screen-hint]': hint,
  }[selector] ?? null);
  const closeTasks = [];
  dialog.showModal = () => { dialog.open = true; dialog.shows++; root.activeElement = closer; };
  dialog.close = () => {
    if (!dialog.open) return;
    dialog.open = false;
    closeTasks.push(() => dialog.emit('close'));
  };
  root.querySelector = selector => ({
    '.strengths-viewport': viewport,
    '.strengths-track': track,
    '[data-strength-direction="-1"]': previous,
    '[data-strength-direction="1"]': next,
    '#mobile-screen-dialog': dialog,
  }[selector] ?? null);

  function screen({ label, source, width, height }) {
    const image = { currentSrc: source, alt: `${label} 원본 UI`, complete: true, naturalWidth: width, naturalHeight: height };
    const button = element({ 'data-mobile-screen': '', 'aria-label': `${label} 크게 보기` });
    button.parentElement = { querySelector: selector => selector === 'img:not(.merchant-panel)' ? image : null };
    button.focuses = [];
    button.focus = options => { button.focuses.push(options); root.activeElement = button; };
    const icon = element();
    icon.parentElement = button;
    return { image, button, icon };
  }
  const app = screen({ label: '장소 정보 앱 화면', source: 'https://example.test/assets/app-place-hq-v17.webp', width: 2250, height: 4600 });
  const web = screen({ label: '장소 등록 웹 화면', source: 'https://example.test/assets/merchant-register-v15.webp', width: 7456, height: 4016 });
  const controller = createMobileExperience({ root, win });
  const click = target => root.emit('click', { target });
  const flushClose = () => closeTasks.splice(0).forEach(task => task());
  return { root, win, mobile, reducedQuery, observers, viewport, track, previous, next, dialog, preview, title, zoom, hint, closer, app, web, controller, click, closeTasks, flushClose };
}

test('앱·웹 미리보기는 선택된 고해상도 원본의 자연 크기를 유지하고 웹만 처음부터 확대한다', () => {
  const f = fixture();
  f.click(f.app.icon);
  assert.equal(f.dialog.open, true);
  assert.equal(f.preview.src, f.app.image.currentSrc);
  assert.equal(f.preview.alt, f.app.image.alt);
  assert.deepEqual([f.preview.width, f.preview.height], [2250, 4600]);
  assert.equal(f.title.textContent, '장소 정보 앱 화면');
  assert.equal(f.dialog.classes.has('is-web'), false);
  assert.equal(f.dialog.classes.has('is-zoomed'), false);
  assert.equal(f.zoom.getAttribute('aria-pressed'), 'false');
  f.click(f.zoom);
  assert.equal(f.dialog.classes.has('is-zoomed'), true);
  assert.equal(f.zoom.getAttribute('aria-pressed'), 'true');
  f.click(f.closer);
  f.flushClose();
  assert.equal(f.root.activeElement, f.app.button);

  f.click(f.web.button);
  assert.equal(f.preview.src, f.web.image.currentSrc);
  assert.deepEqual([f.preview.width, f.preview.height], [7456, 4016]);
  assert.equal(f.title.textContent, '장소 등록 웹 화면');
  assert.equal(f.dialog.classes.has('is-web'), true);
  assert.equal(f.dialog.classes.has('is-zoomed'), true);
  assert.equal(f.zoom.getAttribute('aria-pressed'), 'true');
  assert.equal(f.zoom.textContent, '전체 보기');
  assert.match(f.hint.textContent, /좌우/);
  f.click(f.zoom);
  assert.equal(f.dialog.classes.has('is-zoomed'), false);
  assert.equal(f.zoom.getAttribute('aria-pressed'), 'false');
  f.controller.dispose();
});

test('로드 중이거나 실패한 이미지 클릭은 미리보기를 열거나 본문 스크롤을 잠그지 않는다', () => {
  const f = fixture();
  for (const state of [
    { currentSrc: f.app.image.currentSrc, complete: false, naturalWidth: 2250 },
    { currentSrc: f.app.image.currentSrc, complete: true, naturalWidth: 0 },
    { currentSrc: '', complete: true, naturalWidth: 2250 },
  ]) {
    Object.assign(f.app.image, state);
    f.click(f.app.button);
    assert.equal(f.dialog.shows, 0);
    assert.equal(f.dialog.open, false);
    assert.equal(f.preview.getAttribute('src'), null);
    assert.equal(f.root.documentElement.classes.has('mobile-dialog-open'), false);
    assert.equal(f.app.button.focuses.length, 0);
  }
  f.controller.dispose();
});

test('stop은 비동기 close 전에 잠금·이미지를 즉시 정리하고 초점을 복원하며 재시작 리스너를 중복하지 않는다', () => {
  const f = fixture();
  f.click(f.web.button);
  assert.equal(f.root.documentElement.classes.has('mobile-dialog-open'), true);
  f.controller.stop();
  assert.equal(f.dialog.open, false);
  assert.equal(f.closeTasks.length, 1);
  assert.equal(f.root.documentElement.classes.has('mobile-dialog-open'), false);
  assert.equal(f.preview.getAttribute('src'), null);
  assert.equal(f.dialog.classes.has('is-web'), false);
  assert.equal(f.dialog.classes.has('is-zoomed'), false);
  assert.equal(f.root.activeElement, f.web.button);
  assert.deepEqual(f.web.button.focuses, [{ preventScroll: true }]);
  assert.equal(f.root.count('click'), 0);
  assert.equal(f.win.count('resize'), 0);
  assert.equal(f.mobile.count('change'), 0);
  assert.equal(f.dialog.count('close'), 0);
  assert.equal(f.viewport.count('scroll'), 0);
  assert.ok(f.observers.every(observer => observer.disconnected));
  f.controller.stop();
  f.flushClose();
  assert.equal(f.web.button.focuses.length, 1);

  f.controller.start();
  f.controller.start();
  assert.equal(f.root.count('click'), 1);
  assert.equal(f.win.count('resize'), 1);
  assert.equal(f.mobile.count('change'), 1);
  assert.equal(f.dialog.count('close'), 1);
  assert.equal(f.viewport.count('scroll'), 1);
  assert.equal(f.observers.filter(observer => !observer.disconnected).length, 1);
  f.click(f.app.button);
  assert.equal(f.dialog.shows, 2);
  f.mobile.matches = false;
  f.mobile.emit('change');
  assert.equal(f.dialog.open, false);
  assert.equal(f.viewport.getAttribute('tabindex'), null);
  f.flushClose();
  assert.equal(f.root.documentElement.classes.has('mobile-dialog-open'), false);
  f.controller.dispose();
  assert.equal(f.root.count('click'), 0);
  assert.ok(f.observers.every(observer => observer.disconnected));
});

test('카드 양끝의 버튼 상태를 갱신하고 동작 줄이기에서는 카드 간 실제 거리만큼 즉시 이동한다', () => {
  const f = fixture({ reduced: true });
  assert.equal(f.previous.disabled, true);
  assert.equal(f.next.disabled, false);
  f.click(f.next);
  assert.deepEqual(f.viewport.scrolls, [{ left: 302, behavior: 'auto' }]);
  assert.equal(f.viewport.scrollLeft, 302);
  assert.equal(f.previous.disabled, false);
  assert.equal(f.next.disabled, false);

  f.viewport.scrollLeft = f.viewport.scrollWidth - f.viewport.clientWidth;
  f.viewport.emit('scroll');
  assert.equal(f.previous.disabled, false);
  assert.equal(f.next.disabled, true);
  f.click(f.previous);
  assert.deepEqual(f.viewport.scrolls[1], { left: -302, behavior: 'auto' });
  assert.equal(f.next.disabled, false);
  f.viewport.scrollWidth = f.viewport.clientWidth;
  f.viewport.scrollLeft = 0;
  f.observers[0].callback();
  assert.equal(f.previous.disabled, true);
  assert.equal(f.next.disabled, true);
  f.controller.dispose();
});
