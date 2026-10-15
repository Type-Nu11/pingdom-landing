import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const moduleSource = (await readFile(new URL('../dist/hero-intro.mjs', import.meta.url), 'utf8')).replace(/^export function/m, 'function');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture({ reduced = false, hash = '', navigation = 'navigate', holdImage = false, imageReady = true } = {}) {
  const classes = new Set(), heroClasses = new Set();
  const classList = set => ({ add: (...values) => values.forEach(value => set.add(value)), remove: (...values) => values.forEach(value => set.delete(value)), contains: value => set.has(value) });
  const reducedMotion = Object.assign(new EventTarget(), { matches: reduced });
  const window = Object.assign(new EventTarget(), { scrollY: 0, innerWidth: 1280, innerHeight: 900, matchMedia: () => reducedMotion });
  const imageLoad = deferred();
  if (!holdImage) imageLoad.resolve();
  const image = { complete: imageReady, naturalWidth: imageReady ? 1395 : 0, decode: () => imageLoad.promise };
  const animations = [], timers = new Map();
  const animatable = name => ({ animate(keyframes, options) {
    const done = deferred();
    const animation = { name, keyframes, options, finished: done.promise, cancelled: false, cancel() { this.cancelled = true; done.reject(new Error('cancelled')); } };
    animations.push(animation);
    return animation;
  } });
  const pop = animatable('.intro-pop');
  const word = {};
  const dot = { ...animatable('.intro-word-dot'), getBoundingClientRect: () => ({ left: 1000, top: 400, width: 40, height: 40 }) };
  const model = { clientWidth: 800, clientHeight: 180, getBoundingClientRect: () => ({ left: 240, top: 288, width: 800, height: 180 }) };
  const hero = {
    clientWidth: 1280, clientHeight: 900, classList: classList(heroClasses),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 900 }),
    querySelector: selector => ({ '.intro-pop': pop, '.intro-word': word, '.intro-word-dot': dot, '.hero-model': model, '.hero-model img': image })[selector] ?? null
  };
  let sequence = 0, completed = 0;
  const document = Object.assign(new EventTarget(), {
    documentElement: { classList: classList(classes) }, fonts: { ready: Promise.resolve() }, timeline: { currentTime: 0 },
    querySelector: animatable
  });
  const context = createContext({
    window, document, Event, Math, Promise, location: { hash }, performance: { getEntriesByType: () => [{ type: navigation }] },
    setTimeout: (fn, duration) => { timers.set(++sequence, { fn, duration }); return sequence; }, clearTimeout: id => timers.delete(id),
    hero, reducedMotion, onComplete: () => completed++
  });
  runInContext(bootstrap, context);
  const emit = (target, name, properties = {}) => target.dispatchEvent(Object.assign(new Event(name), properties));
  return {
    classes, heroClasses, animations, imageLoad, image, window, document, reducedMotion, hero, model, timers,
    start: () => { runInContext(moduleSource, context); runInContext('startHeroIntro({ hero, reducedMotion, onComplete })', context); },
    get completed() { return completed; },
    emit,
    expire: duration => { for (const [id, timer] of timers) if (timer.duration === duration) { timers.delete(id); timer.fn(); } }
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

test('분홍 원은 마침표 크기에서 이어받아 히어로 모서리까지 덮고, 야경은 로고 중심에서 열린다', async () => {
  const f = fixture(); f.start(); await tick();
  const pop = f.animations.find(animation => animation.name === '.intro-pop');
  const frames = pop.keyframes.map(frame => frame.clipPath);
  // 마침표 중심(1020, 420), 반지름 20px에서 그대로 시작합니다.
  assert.equal(frames[0], 'circle(20px at 1020px 420px)');
  // 중심에서 가장 먼 모서리(0, 900)까지의 거리보다 커야 화면 전체를 덮습니다.
  assert.ok(Number(frames.at(-1).match(/circle\((\d+)px/)[1]) >= Math.hypot(1020, 480));
  const dotHidden = f.animations.find(animation => animation.name === '.intro-word-dot' && animation.keyframes.at(-1).opacity === 0);
  assert.equal(dotHidden.options.delay, pop.options.delay);
  const art = f.animations.find(animation => animation.name === '.hero-art');
  assert.ok(art.options.delay > pop.options.delay);
  // 로고 상자(240, 288, 800×180)의 중심에서 열립니다.
  assert.equal(art.keyframes[0].clipPath, 'circle(0px at 640px 378px)');
});

test('정상 종료 후 인트로 클래스와 임시 효과를 해제하고 한 번만 완료한다', async () => {
  const f = fixture(); f.start(); await tick();
  assert.equal(f.classes.has('intro-playing'), true);
  assert.ok(f.animations.length > 0);
  f.expire(1980);
  assert.equal(f.heroClasses.has('intro-revealed'), true);
  assert.equal(f.classes.has('intro-pending'), true);
  f.expire(4100); await tick();
  assert.equal(f.classes.has('intro-pending'), false);
  assert.equal(f.classes.has('intro-playing'), false);
  assert.equal(f.classes.has('intro-complete'), true);
  assert.equal(f.heroClasses.has('intro-revealed'), false);
  assert.ok(f.animations.every(animation => animation.cancelled));
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

test('모듈 로딩 실패 시 제한 시간 후 복구하며 늦은 모듈도 화면을 다시 잠그지 않는다', async () => {
  const f = fixture(); f.expire(10500); f.start(); await tick();
  assert.equal(f.classes.has('intro-pending'), false);
  assert.equal(f.animations.length, 0);
});

test('재생 중 휠, 터치, 스크롤 입력에도 같은 타임라인을 끝까지 진행한다', async () => {
  const f = fixture(); f.start(); await tick();
  for (const action of ['wheel', 'touchmove', 'scroll']) {
    f.window.scrollY += 240;
    f.emit(f.window, action);
    assert.equal(f.classes.has('intro-playing'), true);
    assert.equal(f.completed, 0);
  }
  f.expire(4100); await tick();
  assert.equal(f.classes.has('intro-pending'), false);
  assert.equal(f.completed, 1);
});

test('재생 중 페이지 복원, 동작 줄이기, 탭 숨김은 효과를 정리한다', async () => {
  for (const action of ['pageshow', 'reduced', 'hidden']) {
    const f = fixture(); f.start(); await tick();
    if (action === 'reduced') { f.reducedMotion.matches = true; f.emit(f.reducedMotion, 'change'); }
    else if (action === 'hidden') { f.document.hidden = true; f.emit(f.document, 'visibilitychange'); }
    else f.emit(f.window, action, { persisted: true });
    await tick();
    assert.equal(f.classes.has('intro-pending'), false);
    assert.ok(f.animations.every(animation => animation.cancelled));
    assert.equal(f.timers.size, 0, '인트로와 부트스트랩 타이머가 남지 않아야 합니다.');
    assert.equal(f.completed, 1);
  }
});

test('초기 레이아웃 변경은 허용하고 재생 중 화면 폭이 바뀌면 정리한다', async () => {
  const f = fixture({ holdImage: true }); f.start();
  f.window.innerWidth = 1100;
  f.emit(f.window, 'resize'); f.imageLoad.resolve(); await tick();
  assert.equal(f.classes.has('intro-playing'), true);
  f.window.innerWidth = 900;
  f.emit(f.window, 'resize'); await tick();
  assert.equal(f.classes.has('intro-pending'), false);
  assert.equal(f.completed, 1);
});

test('레이아웃이 유지되는 높이 변화는 이어가고 히어로나 로고 크기가 바뀌면 정리한다', async () => {
  const kept = fixture(); kept.start(); await tick();
  kept.window.innerHeight = 760;
  kept.emit(kept.window, 'resize');
  assert.equal(kept.classes.has('intro-playing'), true);
  assert.equal(kept.completed, 0);
  for (const change of [f => { f.hero.clientHeight = 800; }, f => { f.model.clientWidth = 630; }]) {
    const f = fixture(); f.start(); await tick();
    change(f);
    f.emit(f.window, 'resize'); await tick();
    assert.equal(f.classes.has('intro-pending'), false);
    assert.equal(f.completed, 1);
  }
});
