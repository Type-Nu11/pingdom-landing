import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const moduleSource = (await readFile(new URL('../dist/hero-intro.mjs', import.meta.url), 'utf8')).replace(/^import .*;\n/, '').replace('export function', 'function');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture({ reduced = false, hash = '', navigation = 'navigate', holdImage = false, imageReady = true, holdLogo = false, logoReady = true, gpuAvailable = true } = {}) {
  const classes = new Set();
  const classList = { add: (...values) => values.forEach(value => classes.add(value)), remove: (...values) => values.forEach(value => classes.delete(value)), contains: value => classes.has(value) };
  const reducedMotion = Object.assign(new EventTarget(), { matches: reduced });
  const window = Object.assign(new EventTarget(), { scrollY: 0, matchMedia: () => reducedMotion });
  const imageLoad = deferred();
  if (!holdImage) imageLoad.resolve();
  const image = { complete: imageReady, naturalWidth: imageReady ? 1345 : 0, decode: () => imageLoad.promise };
  const logoLoad = deferred();
  if (!holdLogo) logoLoad.resolve();
  const logo = { complete: logoReady, naturalWidth: logoReady ? 128 : 0, decode: () => logoLoad.promise };
  const animations = [], timers = new Map(), frames = new Map();
  const canvas = new EventTarget();
  let sequence = 0, completed = 0, disposed = 0;
  const rendered = [], formationCalls = [];
  const document = Object.assign(new EventTarget(), {
    documentElement: { classList }, fonts: { ready: Promise.resolve() }, timeline: { currentTime: 0 },
    querySelector: () => ({ animate() {
      const done = deferred();
      const animation = { finished: done.promise, resolve: done.resolve, cancelled: false, cancel() { this.cancelled = true; done.reject(new Error('cancelled')); } };
      animations.push(animation);
      return animation;
    } })
  });
  const context = createContext({
    window, document, Event, location: { hash }, performance: { getEntriesByType: () => [{ type: navigation }] },
    setTimeout: (fn, duration) => { timers.set(++sequence, { fn, duration }); return sequence; }, clearTimeout: id => timers.delete(id),
    requestAnimationFrame: fn => { frames.set(++sequence, fn); return sequence; }, cancelAnimationFrame: id => frames.delete(id),
    createRingFormation: (...args) => {
      formationCalls.push(args);
      if (!gpuAvailable) throw new Error('WebGL unavailable');
      return { render: time => rendered.push(time), dispose: () => disposed++ };
    },
    hero: { querySelector: selector => selector === '.intro-particles' ? canvas : selector === '.intro-logo-source' ? logo : image }, reducedMotion, onComplete: () => completed++
  });
  runInContext(bootstrap, context);
  const emit = (target, name, properties = {}) => target.dispatchEvent(Object.assign(new Event(name), properties));
  return {
    classes, animations, imageLoad, image, logoLoad, logo, window, document, reducedMotion, canvas, frames, rendered, formationCalls,
    start: () => { runInContext(moduleSource, context); runInContext('startHeroIntro({ hero, reducedMotion, onComplete })', context); },
    get completed() { return completed; },
    get disposed() { return disposed; },
    emit,
    expire: duration => { for (const [id, timer] of timers) if (timer.duration === duration) { timers.delete(id); timer.fn(); } },
    advance: time => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); }
  };
}

test('동작 줄이기, 뒤로 가기, 하위 섹션 직접 진입은 인트로를 생략한다', () => {
  for (const options of [{ reduced: true }, { navigation: 'back_forward' }, { hash: '#team' }]) {
    const f = fixture(options); f.start();
    assert.equal(f.classes.has('intro-pending'), false);
    assert.equal(f.animations.length, 0);
  }
  assert.equal(fixture({ hash: '#about' }).classes.has('intro-pending'), true);
});

test('정상 종료 후 잠금 클래스와 임시 효과를 해제하고 한 번만 완료한다', async () => {
  const f = fixture(); f.start(); await tick();
  assert.equal(f.classes.has('intro-playing'), true);
  assert.ok(f.animations.length > 0);
  f.advance(1200); f.advance(6800);
  assert.equal(f.classes.has('intro-pending'), true);
  f.advance(7800); await tick();
  assert.equal(f.classes.has('intro-pending'), false);
  assert.equal(f.classes.has('intro-playing'), false);
  assert.equal(f.classes.has('intro-complete'), true);
  assert.ok(f.animations.every(animation => animation.cancelled));
  assert.equal(f.frames.size, 0);
  assert.equal(f.disposed, 1);
  assert.deepEqual(f.rendered, [1.2, 6.8, 7.8]);
  f.emit(f.window, 'pingdom:intro-finish');
  assert.equal(f.completed, 1);
});

test('건너뛰기 버튼은 없으며 키보드 이동 후 늦은 이미지가 도착해도 재생하지 않는다', async () => {
  assert.doesNotMatch(html, /intro-skip|intro-shutter/);
  for (const key of ['Escape', 'Tab']) {
    const f = fixture({ holdImage: true }); f.start();
    f.emit(f.window, 'keydown', { key });
    f.imageLoad.resolve(); await tick();
    assert.equal(f.classes.has('intro-pending'), false);
    assert.equal(f.animations.length, 0);
    assert.equal(f.completed, 1);
  }
});

test('디코딩 실패나 이미지 준비 시간 초과 시 즉시 본문을 복구한다', async () => {
  const failed = fixture({ holdImage: true }); failed.start();
  failed.imageLoad.reject(new Error('decode failed')); await tick();
  assert.equal(failed.classes.has('intro-pending'), false);
  assert.equal(failed.animations.length, 0);
  const slow = fixture({ holdImage: true, imageReady: false }); slow.start();
  slow.expire(1200); await tick();
  assert.equal(slow.classes.has('intro-pending'), false);
  slow.imageLoad.resolve(); await tick();
  assert.equal(slow.animations.length, 0);
});

test('링 이미지가 준비되어도 로고 디코딩을 기다린 뒤 다섯 번째 인자로 전달한다', async () => {
  const f = fixture({ holdLogo: true }); f.start(); await tick();
  assert.equal(f.classes.has('intro-pending'), true);
  assert.equal(f.classes.has('intro-playing'), false);
  assert.equal(f.formationCalls.length, 0);
  assert.equal(f.frames.size, 0);
  f.logoLoad.resolve(); await tick();
  assert.equal(f.classes.has('intro-playing'), true);
  assert.equal(f.formationCalls.length, 1);
  assert.equal(f.formationCalls[0][1], f.image);
  assert.equal(f.formationCalls[0][4], f.logo);
});

test('로고 디코딩 실패나 준비 시간 초과 시 본문을 복구하고 늦은 완료를 무시한다', async () => {
  const failed = fixture({ holdLogo: true }); failed.start();
  failed.logoLoad.reject(new Error('logo decode failed')); await tick();
  assert.equal(failed.classes.has('intro-pending'), false);
  assert.equal(failed.formationCalls.length, 0);
  assert.equal(failed.completed, 1);
  const slow = fixture({ holdLogo: true, logoReady: false }); slow.start();
  slow.expire(1200); await tick();
  assert.equal(slow.classes.has('intro-pending'), false);
  assert.equal(slow.formationCalls.length, 0);
  slow.logo.complete = true; slow.logo.naturalWidth = 128;
  slow.logoLoad.resolve(); await tick();
  assert.equal(slow.formationCalls.length, 0);
  assert.equal(slow.frames.size, 0);
  assert.equal(slow.completed, 1);
});

test('로고는 로딩 완료와 유효한 원본 너비를 모두 갖춰야 재생한다', async () => {
  for (const metadata of [{ complete: false, naturalWidth: 128 }, { complete: true, naturalWidth: 0 }]) {
    const f = fixture(); Object.assign(f.logo, metadata); f.start(); await tick();
    assert.equal(f.classes.has('intro-pending'), false);
    assert.equal(f.formationCalls.length, 0);
    assert.equal(f.completed, 1);
  }
});

test('로고 준비 중 취소하면 늦은 디코딩 완료가 인트로를 다시 시작하지 않는다', async () => {
  const f = fixture({ holdLogo: true }); f.start(); await tick();
  f.emit(f.window, 'keydown', { key: 'Escape' });
  f.logoLoad.resolve(); await tick();
  assert.equal(f.classes.has('intro-pending'), false);
  assert.equal(f.formationCalls.length, 0);
  assert.equal(f.animations.length, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.completed, 1);
});

test('모듈 로딩 실패 시 제한 시간 후 복구하며 늦은 모듈도 화면을 다시 잠그지 않는다', async () => {
  const f = fixture(); f.expire(10500); f.start(); await tick();
  assert.equal(f.classes.has('intro-pending'), false);
  assert.equal(f.animations.length, 0);
});

test('재생 중 스크롤, 터치, 페이지 복원, 동작 줄이기 전환은 효과를 정리한다', async () => {
  for (const action of ['wheel', 'touchmove', 'pageshow', 'reduced']) {
    const f = fixture(); f.start(); await tick();
    if (action === 'reduced') { f.reducedMotion.matches = true; f.emit(f.reducedMotion, 'change'); }
    else f.emit(f.window, action, { persisted: true });
    await tick();
    assert.equal(f.classes.has('intro-pending'), false);
    assert.ok(f.animations.every(animation => animation.cancelled));
    assert.equal(f.frames.size, 0);
    assert.equal(f.disposed, 1);
    assert.equal(f.completed, 1);
  }
});

test('GPU를 사용할 수 없거나 재생 중 컨텍스트를 잃으면 본문을 복구한다', async () => {
  const unavailable = fixture({ gpuAvailable: false }); unavailable.start(); await tick();
  assert.equal(unavailable.classes.has('intro-pending'), false);
  assert.equal(unavailable.frames.size, 0);
  const lost = fixture(); lost.start(); await tick();
  lost.emit(lost.canvas, 'webglcontextlost'); await tick();
  assert.equal(lost.classes.has('intro-pending'), false);
  assert.equal(lost.frames.size, 0);
  assert.equal(lost.disposed, 1);
});

test('초기 레이아웃 변경은 허용하고 재생 중 화면 크기가 바뀌면 정리한다', async () => {
  const f = fixture({ holdImage: true }); f.start();
  f.emit(f.window, 'resize'); f.imageLoad.resolve(); await tick();
  assert.equal(f.classes.has('intro-playing'), true);
  f.emit(f.window, 'resize'); await tick();
  assert.equal(f.classes.has('intro-pending'), false);
  assert.equal(f.frames.size, 0);
  assert.equal(f.disposed, 1);
});
