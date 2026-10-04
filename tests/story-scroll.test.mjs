import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrollStory, journeyState, platformState, sceneProgress } from '../dist/story-scroll.mjs';

class Target {
  listeners = new Map();
  addEventListener(type, callback, options) {
    const callbacks = this.listeners.get(type) ?? new Map();
    callbacks.set(callback, options);
    this.listeners.set(type, callbacks);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  dispatch(type) {
    for (const [callback, options] of [...(this.listeners.get(type) ?? [])]) {
      callback({ type, target: this });
      if (options?.once) this.removeEventListener(type, callback);
    }
  }
  count(type) {
    return type ? (this.listeners.get(type)?.size ?? 0)
      : [...this.listeners.values()].reduce((sum, callbacks) => sum + callbacks.size, 0);
  }
}
function style() { return { setProperty(name, value) { this[name] = value; } }; }
const styleValues = value => Object.fromEntries(Object.entries(value).filter(([, entry]) => typeof entry !== 'function'));

// 실제 DOM 그리기와 영상 디코딩 대신 위치·이벤트·프레임 예약만 대역으로 검증합니다.
function fixture({ y = 0, mobile = false, reduced = false, height = 880, headerHeight = 80 } = {}) {
  const win = Object.assign(new Target(), { scrollY: y, innerHeight: height });
  const media = {
    reduced: Object.assign(new Target(), { matches: reduced }),
    narrow: Object.assign(new Target(), { matches: mobile }),
    short: Object.assign(new Target(), { matches: height <= (mobile ? 600 : 700) }),
  };
  win.matchMedia = query => query.includes('reduced-motion') ? media.reduced
    : query.includes('max-height') ? media.short : media.narrow;
  const frames = new Map();
  let nextFrame = 0;
  win.requestAnimationFrame = callback => { const id = ++nextFrame; frames.set(id, callback); return id; };
  win.cancelAnimationFrame = id => frames.delete(id);
  function flush() {
    let ticks = 0;
    while (frames.size) {
      assert.ok(++ticks < 20, '프레임이 끝없이 예약되면 안 됩니다.');
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback());
    }
  }
  const observers = [];
  win.ResizeObserver = class {
    targets = new Set();
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.targets.add(target); this.connected = true; }
    disconnect() { this.targets.clear(); this.connected = false; }
  };
  const classes = new Set();
  const root = Object.assign(new Target(), { hidden: false });
  root.documentElement = { classList: {
    toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
    remove(name) { classes.delete(name); },
  } };
  let resolveFonts;
  root.fonts = { ready: new Promise(resolve => { resolveFonts = resolve; }) };
  let reads = 0;
  const header = { height: headerHeight, getBoundingClientRect() { reads++; return { height: this.height }; } };
  const scenes = ['journey', 'platform'].map((type, index) => {
    const copy = type === 'journey' ? { inert: false } : null;
    const stage = { dataset: {}, style: style(), removeAttribute(name) {
      assert.equal(name, 'style'); this.style = style();
    } };
    const section = {
      dataset: { scene: type }, top: index ? 4000 : 1000, height: 1800,
      querySelector: selector => selector === '.scene-stage' ? stage
        : selector === '.journey-copy' ? copy : null,
      getBoundingClientRect() { reads++; return { top: this.top - win.scrollY, height: this.height }; },
    };
    return { type, stage, section, copy };
  });
  const images = Array.from({ length: 3 }, () => Object.assign(new Target(), { complete: false }));
  root.querySelector = selector => selector === '.site-header' ? header : null;
  root.querySelectorAll = selector => selector === '[data-scene]' ? scenes.map(scene => scene.section)
    : selector === 'img' ? images : [];
  const snapshot = () => scenes.map(({ type, stage }) => ({ type, progress: stage.dataset.progress, style: styleValues(stage.style) }));
  const jump = y => { win.scrollY = y; win.dispatch('scroll'); flush(); };
  const story = createScrollStory({ root, win });
  return { win, root, media, header, scenes, images, frames, observers, classes, story, flush, jump, snapshot, resolveFonts, reads: () => reads };
}

test('장면 범위 밖과 짧은 화면에서도 progress가 유한한 0~1로 제한됩니다', () => {
  assert.equal(sceneProgress(50, 100, 1800, 800), 0);
  assert.equal(sceneProgress(600, 100, 1800, 800), 0.5);
  assert.equal(sceneProgress(2000, 100, 1800, 800), 1);
  for (const h of [0, 600, 800]) for (const y of [-100, 0, 0.5, 1000]) {
    const p = sceneProgress(y, 0, h, 800);
    assert.ok(Number.isFinite(p) && p >= 0 && p <= 1);
  }
});

test('전체 사진의 대표 문장에서 읽을 수 있는 제품·설명 구도로 정착합니다', () => {
  const start = journeyState(0), end = journeyState(1), mobile = journeyState(1, true);
  assert.equal(start.openingOpacity, 1);
  assert.equal(start.photoWidth, 100);
  assert.equal(start.photoHeight, 100);
  assert.equal(start.copyOpacity, 0);
  assert.equal(start.productOpacity, 0);
  assert.equal(end.openingOpacity, 0);
  assert.equal(end.shade, 0);
  assert.equal(end.copyOpacity, 1);
  assert.equal(end.productOpacity, 1);
  assert.equal(end.copyY, 0);
  assert.equal(end.productY, 0);
  assert.ok(end.photoWidth < start.photoWidth && end.photoHeight < start.photoHeight);
  assert.ok(mobile.photoWidth > end.photoWidth && mobile.photoHeight < end.photoHeight);
  assert.ok(mobile.photoY < end.photoY);
  assert.equal(mobile.copyOpacity, 1);
  assert.equal(mobile.productOpacity, 1);
});

test('플랫폼 가림막이 완전히 열리고 콘솔은 이동 없이 읽는 상태가 됩니다', () => {
  const start = platformState(0), middle = platformState(0.5), end = platformState(1);
  assert.equal(start.curtainCut, 0);
  assert.equal(start.curtainScale, 1);
  assert.equal(start.curtainTitleOpacity, 1);
  assert.equal(start.curtainSmallOpacity, 1);
  assert.equal(start.consoleOpacity, 0);
  assert.ok(middle.curtainCut > 0 && middle.curtainCut < 100);
  assert.ok(middle.consoleOpacity > 0 && middle.consoleOpacity <= 1);
  assert.ok(middle.consoleY > 0 && middle.consoleY < start.consoleY);
  assert.equal(end.curtainCut, 100);
  assert.ok(end.curtainScale > 0 && end.curtainScale < 1);
  assert.equal(end.curtainTitleOpacity, 0);
  assert.equal(end.curtainSmallOpacity, 0);
  assert.equal(end.consoleOpacity, 1);
  assert.equal(end.consoleY, 0);
});

test('범위를 벗어난 빠른 이동도 크기·투명도 상태를 시작과 종료 구도 안에 유지합니다', () => {
  for (const state of [journeyState, platformState]) {
    assert.deepEqual(state(-5), state(0));
    assert.deepEqual(state(5), state(1));
    for (const p of [0, 0.1, 0.3, 0.5, 0.75, 1]) for (const [key, value] of Object.entries(state(p))) {
      assert.ok(Number.isFinite(value), key);
      if (key.endsWith('Opacity')) assert.ok(value >= 0 && value <= 1, key);
    }
  }
});

test('헤더 아래에서 핀이 시작하고 실제 보이는 stage 높이에 맞춰 종료합니다', () => {
  // 문서 top 1000, 높이 1800, 화면 880, 헤더 80: 핀 시작 920, 끝 1920.
  const f = fixture();
  f.jump(920); assert.equal(f.scenes[0].stage.dataset.progress, '0.0000');
  f.jump(1420); assert.equal(f.scenes[0].stage.dataset.progress, '0.5000');
  f.jump(1920); assert.equal(f.scenes[0].stage.dataset.progress, '1.0000');
  f.header.height = 120; f.win.dispatch('resize'); f.flush();
  f.jump(880); assert.equal(f.scenes[0].stage.dataset.progress, '0.0000');
  f.jump(1920); assert.equal(f.scenes[0].stage.dataset.progress, '1.0000');
  f.story.dispose();
});

test('중간 진입·역방향·직접 이동의 렌더 결과가 같은 위치에서 동일합니다', () => {
  const f = fixture(); f.flush(); f.jump(1320);
  const expected = f.snapshot();
  assert.equal(f.scenes[0].stage.dataset.progress, '0.4000');
  assert.ok(Number(f.scenes[0].stage.style['--copy-opacity']) > 0);
  assert.ok(Number(f.scenes[0].stage.style['--copy-opacity']) < 1);
  f.jump(5900); f.jump(1320); assert.deepEqual(f.snapshot(), expected);
  f.jump(0); f.jump(1320); assert.deepEqual(f.snapshot(), expected);
  const restored = fixture({ y: 1320 }); restored.flush();
  assert.deepEqual(restored.snapshot(), expected);
  f.story.dispose(); restored.story.dispose();
});

test('빠른 스크롤은 한 프레임으로 합쳐 최신 위치를 쓰며 레이아웃을 다시 읽지 않습니다', () => {
  const f = fixture(); f.flush(); const reads = f.reads();
  for (const y of [1000, 1200, 1300, 1420]) { f.win.scrollY = y; f.win.dispatch('scroll'); }
  assert.equal(f.frames.size, 1); f.flush();
  assert.equal(f.scenes[0].stage.dataset.progress, '0.5000');
  assert.equal(f.reads(), reads); assert.equal(f.frames.size, 0);
  f.story.dispose();
});

test('resize 후 모바일은 장면 고정과 숨김을 해제하고 PC 복귀 시 현재 위치를 복원합니다', () => {
  const f = fixture({ y: 1420 }); f.flush(); const before = f.snapshot(), reads = f.reads();
  f.win.innerHeight = 820; f.media.narrow.matches = true;
  f.media.narrow.dispatch('change'); f.win.dispatch('resize');
  assert.equal(f.frames.size, 1); f.flush();
  assert.equal(f.reads(), reads); assert.notDeepEqual(f.snapshot(), before);
  assert.equal(f.classes.has('motion-enabled'), false);
  assert.equal(f.scenes[0].copy.inert, false);
  for (const scene of f.snapshot()) { assert.equal(scene.progress, undefined); assert.deepEqual(scene.style, {}); }
  const resized = fixture({ y: 1420, mobile: true, height: 820 }); resized.flush();
  assert.deepEqual(f.snapshot(), resized.snapshot());
  f.jump(0); assert.equal(f.frames.size, 0);
  f.media.narrow.matches = false; f.media.narrow.dispatch('change'); f.flush();
  assert.equal(f.classes.has('motion-enabled'), true);
  assert.equal(f.scenes[0].stage.dataset.progress, '0.0000');
  f.story.dispose(); resized.story.dispose();
});

test('장면 밖 이미지와 폰트·ResizeObserver 완료도 핀 위치를 다시 계산합니다', async () => {
  const f = fixture({ y: 1420 }); f.flush(); const reads = f.reads();
  f.scenes[0].section.top += 100;
  f.images[2].dispatch('load'); f.observers[0].callback(); f.resolveFonts(); await Promise.resolve();
  assert.equal(f.frames.size, 1); f.flush();
  assert.equal(f.scenes[0].stage.dataset.progress, '0.4000');
  assert.equal(f.reads(), reads + 3); assert.equal(f.images[2].count('load'), 0);
  f.scenes[0].section.top -= 100; f.images[0].dispatch('error'); f.flush();
  assert.equal(f.scenes[0].stage.dataset.progress, '0.5000');
  f.story.dispose();
});

test('start 중복과 BFCache식 stop/restart에서 listener·observer·프레임이 누적되지 않습니다', () => {
  const f = fixture(); const count = f.win.count(); f.story.start();
  assert.equal(f.win.count(), count); assert.equal(f.win.count('scroll'), 1);
  assert.equal(f.observers.length, 1); assert.equal(f.observers[0].targets.size, 3);
  f.win.dispatch('resize'); f.win.dispatch('scroll'); assert.ok(f.frames.size > 0);
  const before = f.snapshot(); f.story.stop(); assert.equal(f.frames.size, 0);
  for (const target of [f.win, f.root, ...Object.values(f.media), ...f.images]) assert.equal(target.count(), 0);
  assert.equal(f.observers[0].connected, false); assert.deepEqual(f.snapshot(), before);
  f.win.scrollY = 4420; f.win.dispatch('scroll'); assert.equal(f.frames.size, 0);
  f.story.start(); assert.equal(f.win.count(), count); assert.equal(f.observers[1].connected, true);
  assert.equal(f.scenes[1].stage.dataset.progress, '0.5000');
  f.story.dispose(); assert.equal(f.classes.has('motion-enabled'), false);
  for (const scene of f.snapshot()) { assert.equal(scene.progress, undefined); assert.deepEqual(scene.style, {}); }
});

test('reduced-motion 변경은 모션 style을 정리하고 복귀 시 현재 위치를 복원합니다', () => {
  const f = fixture({ y: 1420 }); f.flush(); const expected = f.snapshot();
  assert.ok(f.classes.has('motion-enabled'));
  f.media.reduced.matches = true; f.media.reduced.dispatch('change'); f.win.dispatch('scroll'); f.flush();
  assert.equal(f.classes.has('motion-enabled'), false);
  for (const scene of f.snapshot()) { assert.equal(scene.progress, undefined); assert.deepEqual(scene.style, {}); }
  f.win.dispatch('scroll'); assert.equal(f.frames.size, 0);
  f.media.reduced.matches = false; f.media.reduced.dispatch('change'); f.flush();
  assert.deepEqual(f.snapshot(), expected); f.story.dispose();
});

test('탭 숨김은 예약 프레임을 취소하고 다시 보일 때 변경된 위치와 레이아웃을 측정합니다', () => {
  const f = fixture(); f.flush(); const before = f.snapshot();
  f.win.scrollY = 1420; f.win.dispatch('scroll'); assert.equal(f.frames.size, 1);
  f.root.hidden = true; f.root.dispatch('visibilitychange'); assert.equal(f.frames.size, 0);
  assert.deepEqual(f.snapshot(), before); f.win.dispatch('scroll'); assert.equal(f.frames.size, 0);
  f.scenes[0].section.top += 100; f.root.hidden = false; f.root.dispatch('visibilitychange'); f.flush();
  assert.equal(f.scenes[0].stage.dataset.progress, '0.4000'); f.story.dispose();
});

test('짧은 화면과 처음부터 reduced-motion인 환경은 고정 장면 대신 정적 완료 구도를 사용합니다', () => {
  for (const options of [{ height: 700 }, { height: 600, mobile: true }, { reduced: true }]) {
    const f = fixture(options); f.flush();
    assert.equal(f.classes.has('motion-enabled'), false); assert.equal(f.frames.size, 0); assert.equal(f.reads(), 0);
    for (const scene of f.snapshot()) { assert.equal(scene.progress, undefined); assert.deepEqual(scene.style, {}); }
    f.story.dispose();
  }
  const f = fixture({ y: 1420 }); f.flush();
  f.media.short.matches = true; f.media.short.dispatch('change'); f.flush();
  assert.equal(f.classes.has('motion-enabled'), false);
  f.media.short.matches = false; f.media.short.dispatch('change'); f.flush();
  assert.ok(f.classes.has('motion-enabled')); assert.equal(f.scenes[0].stage.dataset.progress, '0.5000');
  f.story.dispose();
});

test('dispose 후 늦게 완료한 폰트·이미지가 프레임과 observer를 재개하지 않습니다', async () => {
  const f = fixture(); f.story.dispose(); f.resolveFonts(); await Promise.resolve();
  f.images.forEach(image => image.dispatch('load')); f.observers[0].callback(); f.story.refresh();
  assert.equal(f.frames.size, 0); assert.equal(f.win.count(), 0); assert.equal(f.root.count(), 0);
  assert.equal(f.classes.has('motion-enabled'), false);
});

test('숨겨진 설명의 링크는 inert로 제외하고 완료·정적 fallback에서는 접근할 수 있습니다', () => {
  const f = fixture({ y: 920 });
  const copy = f.scenes[0].copy;
  assert.equal(copy.inert, true);
  f.jump(1920);
  assert.equal(copy.inert, false);
  f.jump(920);
  assert.equal(copy.inert, true);
  f.media.reduced.matches = true;
  f.media.reduced.dispatch('change');
  f.flush();
  assert.equal(f.classes.has('motion-enabled'), false);
  assert.equal(copy.inert, false);
  f.media.reduced.matches = false;
  f.media.reduced.dispatch('change');
  f.flush();
  assert.equal(copy.inert, true);
  f.story.dispose();
  assert.equal(copy.inert, false);
});
