import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getEventListeners } from 'node:events';
import { createContext, runInContext } from 'node:vm';

// EventTarget와 지연된 play Promise로 재생 상태만 검증합니다.
// 실제 미디어 디코더, 자동 재생 정책, 프레임 출력은 검증하지 않습니다.
const moduleSource = (await readFile(new URL('../dist/hero-background.mjs', import.meta.url), 'utf8')).replace(/^export\s+/gm, '');
const tick = () => new Promise(resolve => setImmediate(resolve));

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

class ObservedTarget extends EventTarget {
  types = new Set();
  addEventListener(type, callback, options) {
    this.types.add(type);
    super.addEventListener(type, callback, options);
  }
  get listenerCount() {
    return [...this.types].reduce((sum, type) => sum + getEventListeners(this, type).length, 0);
  }
}

function fixture(t, { reduced = false, saveData = false, mobile = false } = {}) {
  const classes = new Set();
  const classList = {
    add: (...names) => names.forEach(name => classes.add(name)),
    remove: (...names) => names.forEach(name => classes.delete(name)),
    contains: name => classes.has(name),
    toggle(name, force) {
      const enabled = force ?? !classes.has(name);
      if (enabled) classes.add(name); else classes.delete(name);
      return enabled;
    }
  };
  const attributes = new Map();
  const requests = [];
  const video = Object.assign(new ObservedTarget(), {
    dataset: { desktopSrc: 'assets/traffic-desktop.mp4', mobileSrc: 'assets/traffic-mobile.mp4' },
    poster: 'assets/traffic-poster.webp', muted: false, defaultMuted: false,
    playsInline: false, loop: false, paused: true, currentTime: 0, readyState: 0,
    error: null, loadCalls: 0, pauseCalls: 0,
    getAttribute: name => attributes.get(name) ?? null,
    hasAttribute: name => attributes.has(name),
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: name => attributes.delete(name),
    load() { this.loadCalls++; this.currentTime = 0; this.readyState = 0; this.paused = true; },
    pause() { this.pauseCalls++; this.paused = true; },
    play() {
      const request = deferred();
      requests.push(request);
      this.paused = false;
      return request.promise.then(() => {
        // pause 이후 늦게 시작되는 브라우저 재생도 대역으로 재현합니다.
        this.paused = false;
        this.readyState = 4;
      });
    }
  });
  Object.defineProperties(video, {
    src: { get: () => attributes.get('src') ?? '', set: value => attributes.set('src', String(value)) },
    currentSrc: { get: () => attributes.get('src') ?? '' }
  });
  const reducedMotion = Object.assign(new ObservedTarget(), { matches: reduced });
  const viewport = Object.assign(new ObservedTarget(), { matches: mobile });
  const connection = Object.assign(new ObservedTarget(), { saveData });
  const document = Object.assign(new ObservedTarget(), { hidden: false });
  const window = Object.assign(new ObservedTarget(), { matchMedia: () => viewport });
  const hero = { classList, querySelector: selector => selector === '.hero-background-video' ? video : null };
  const context = createContext({ hero, reducedMotion, document, window, navigator: { connection }, Event, setTimeout, clearTimeout });
  const controller = runInContext(`${moduleSource}\ncreateHeroBackground({ hero, reducedMotion });`, context);
  t.after(() => controller.dispose());
  const emit = (target, name) => target.dispatchEvent(new Event(name));
  return {
    controller, video, requests, classes, reducedMotion, connection, document, viewport, window, emit,
    async finishPlay(index = requests.length - 1) {
      assert.ok(requests[index], '완료할 재생 요청이 있어야 합니다.');
      requests[index].resolve();
      await tick();
      emit(video, 'playing');
      await tick();
    }
  };
}

test('초기에는 src가 없고 동작 줄이기 또는 데이터 절약 중에는 영상을 로딩하지 않는다', t => {
  const idle = fixture(t);
  assert.equal(idle.video.hasAttribute('src'), false);
  assert.equal(idle.requests.length, 0);
  for (const options of [{ reduced: true }, { saveData: true }]) {
    const f = fixture(t, options);
    f.controller.sync({ visible: true, introPending: true });
    assert.equal(f.video.hasAttribute('src'), false);
    assert.equal(f.requests.length, 0);
    assert.equal(f.video.paused, true);
    assert.equal(f.classes.has('hero-video-ready'), false);
  }
});

test('화면 크기에 맞는 소스를 선택하고 무음 인라인 반복 재생이 준비되면 poster를 전환한다', async t => {
  for (const mobile of [false, true]) {
    const f = fixture(t, { mobile });
    f.controller.sync({ visible: true, introPending: false });
    assert.equal(f.video.getAttribute('src'), mobile ? f.video.dataset.mobileSrc : f.video.dataset.desktopSrc);
    assert.equal(f.video.muted, true);
    assert.equal(f.video.playsInline, true);
    assert.equal(f.video.loop, true);
    await f.finishPlay();
    assert.equal(f.classes.has('hero-video-ready'), true);
    assert.equal(f.video.poster, 'assets/traffic-poster.webp');
  }
});

test('재생 Promise가 대기 중이면 반복 sync가 play를 중복 호출하지 않는다', async t => {
  const f = fixture(t);
  for (let index = 0; index < 4; index++) f.controller.sync({ visible: true, introPending: false });
  f.controller.sync({ visible: false, introPending: true });
  assert.equal(f.requests.length, 1);
  await f.finishPlay();
  f.controller.sync({ visible: true, introPending: false });
  assert.equal(f.requests.length, 1);
});

test('인트로는 화면 밖 재생을 허용하고 이후 화면 밖이나 탭 숨김은 재생 위치를 유지하며 멈춘다', async t => {
  const f = fixture(t);
  f.controller.sync({ visible: false, introPending: true });
  await f.finishPlay();
  f.video.currentTime = 12.5;
  const loaded = f.video.loadCalls;
  f.controller.sync({ visible: false, introPending: false });
  assert.equal(f.video.paused, true);
  assert.equal(f.video.currentTime, 12.5);
  f.controller.sync({ visible: true, introPending: false });
  await f.finishPlay();
  assert.equal(f.video.currentTime, 12.5);
  assert.equal(f.video.loadCalls, loaded);
  f.document.hidden = true;
  f.controller.sync({ visible: true, introPending: true });
  assert.equal(f.video.paused, true);
  assert.equal(f.video.currentTime, 12.5);
  f.document.hidden = false;
  f.controller.sync({ visible: true, introPending: false });
  await f.finishPlay();
  assert.equal(f.video.currentTime, 12.5);
});

test('재생 뒤 동작 줄이기나 연결의 데이터 절약 설정을 켜면 src를 해제하고 poster로 복귀한다', async t => {
  const f = fixture(t);
  f.controller.sync({ visible: true, introPending: false });
  await f.finishPlay();
  let loaded = f.video.loadCalls;
  f.reducedMotion.matches = true;
  f.controller.sync({ visible: true, introPending: false });
  assert.equal(f.video.hasAttribute('src'), false);
  assert.ok(f.video.loadCalls > loaded);
  assert.equal(f.video.paused, true);
  assert.equal(f.classes.has('hero-video-ready'), false);
  f.reducedMotion.matches = false;
  f.controller.sync({ visible: true, introPending: false });
  await f.finishPlay();
  loaded = f.video.loadCalls;
  f.connection.saveData = true;
  f.emit(f.connection, 'change');
  assert.equal(f.video.hasAttribute('src'), false);
  assert.ok(f.video.loadCalls > loaded);
  assert.equal(f.classes.has('hero-video-ready'), false);
  f.connection.saveData = false;
  f.emit(f.connection, 'change');
  await f.finishPlay();
  assert.equal(f.classes.has('hero-video-ready'), true);
});

test('자동 재생 거부와 미디어 오류는 src를 해제하고 poster를 유지한다', async t => {
  const denied = fixture(t);
  denied.controller.sync({ visible: true, introPending: false });
  denied.requests[0].reject(Object.assign(new Error('autoplay denied'), { name: 'NotAllowedError' }));
  await tick();
  assert.equal(denied.classes.has('hero-video-ready'), false);
  assert.equal(denied.video.hasAttribute('src'), false);
  assert.equal(denied.video.paused, true);
  const failed = fixture(t);
  failed.controller.sync({ visible: true, introPending: false });
  await failed.finishPlay();
  failed.video.error = { code: 3 };
  failed.emit(failed.video, 'error');
  await tick();
  assert.equal(failed.classes.has('hero-video-ready'), false);
  assert.equal(failed.video.hasAttribute('src'), false);
  assert.equal(failed.video.paused, true);
});

test('pause 또는 dispose 뒤 늦게 완료된 play가 재생과 ready 상태를 되살리지 않는다', async t => {
  for (const action of ['pause', 'dispose']) {
    const f = fixture(t);
    f.controller.sync({ visible: true, introPending: false });
    if (action === 'dispose') f.controller.dispose();
    else f.controller.sync({ visible: false, introPending: false });
    f.requests[0].resolve();
    await tick();
    f.emit(f.video, 'playing');
    assert.equal(f.video.paused, true, action);
    assert.equal(f.classes.has('hero-video-ready'), false, action);
  }
});

test('빠른 pause와 resume 사이의 AbortError를 복구하고 dispose 후에는 이벤트와 sync를 무시한다', async t => {
  const f = fixture(t);
  f.controller.sync({ visible: true, introPending: false });
  f.controller.sync({ visible: false, introPending: false });
  f.controller.sync({ visible: true, introPending: false });
  f.requests[0].reject(Object.assign(new Error('interrupted by pause'), { name: 'AbortError' }));
  await tick();
  assert.equal(f.requests.length, 2);
  await f.finishPlay(1);
  assert.equal(f.video.paused, false);
  assert.equal(f.classes.has('hero-video-ready'), true);
  f.controller.dispose();
  const played = f.requests.length;
  const loaded = f.video.loadCalls;
  for (const target of [f.video, f.connection, f.reducedMotion, f.document, f.viewport, f.window]) assert.equal(target.listenerCount, 0);
  f.connection.saveData = true;
  f.emit(f.connection, 'change');
  f.emit(f.video, 'playing');
  f.emit(f.video, 'error');
  f.controller.sync({ visible: true, introPending: true });
  await tick();
  assert.equal(f.requests.length, played);
  assert.equal(f.video.loadCalls, loaded);
  assert.equal(f.video.paused, true);
  assert.equal(f.classes.has('hero-video-ready'), false);
});
