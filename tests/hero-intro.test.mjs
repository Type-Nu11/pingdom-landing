import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const moduleSource = (await readFile(new URL('../dist/hero-intro.mjs', import.meta.url), 'utf8')).replace('export function', 'function');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture({ reduced = false, hash = '', navigation = 'navigate', holdImage = false, imageReady = true } = {}) {
  const classes = new Set();
  const classList = { add: (...values) => values.forEach(value => classes.add(value)), remove: (...values) => values.forEach(value => classes.delete(value)), contains: value => classes.has(value) };
  const reducedMotion = Object.assign(new EventTarget(), { matches: reduced });
  const window = Object.assign(new EventTarget(), { scrollY: 0, matchMedia: () => reducedMotion });
  const imageLoad = deferred();
  if (!holdImage) imageLoad.resolve();
  const image = { complete: imageReady, naturalWidth: imageReady ? 1345 : 0, decode: () => imageLoad.promise };
  const animations = [], timers = new Map();
  let sequence = 0, completed = 0;
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
    hero: { querySelector: () => image }, reducedMotion, onComplete: () => completed++
  });
  runInContext(bootstrap, context);
  const emit = (target, name, properties = {}) => target.dispatchEvent(Object.assign(new Event(name), properties));
  return {
    classes, animations, imageLoad, image, window, document, reducedMotion,
    start: () => { runInContext(moduleSource, context); runInContext('startHeroIntro({ hero, reducedMotion, onComplete })', context); },
    get completed() { return completed; },
    emit,
    expire: duration => { for (const [id, timer] of timers) if (timer.duration === duration) { timers.delete(id); timer.fn(); } },
    skip: () => document.dispatchEvent(Object.defineProperty(new Event('click'), 'target', { value: { closest: () => true } }))
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
  f.animations.forEach(animation => animation.resolve()); await tick();
  assert.equal(f.classes.has('intro-pending'), false);
  assert.equal(f.classes.has('intro-playing'), false);
  assert.equal(f.classes.has('intro-complete'), true);
  assert.ok(f.animations.every(animation => animation.cancelled));
  f.emit(f.window, 'pingdom:intro-finish');
  assert.equal(f.completed, 1);
});

test('준비 중 건너뛰기, Escape, Tab 이후 이미지가 도착해도 재생하지 않는다', async () => {
  for (const key of ['click', 'Escape', 'Tab']) {
    const f = fixture({ holdImage: true }); f.start();
    if (key === 'click') f.skip(); else f.emit(f.window, 'keydown', { key });
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
  slow.expire(800); await tick();
  assert.equal(slow.classes.has('intro-pending'), false);
  slow.imageLoad.resolve(); await tick();
  assert.equal(slow.animations.length, 0);
});

test('모듈 로딩 실패 시 제한 시간 후 복구하며 늦은 모듈도 화면을 다시 잠그지 않는다', async () => {
  const f = fixture(); f.expire(6500); f.start(); await tick();
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
    assert.equal(f.completed, 1);
  }
});
