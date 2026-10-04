import test from 'node:test';
import assert from 'node:assert/strict';
import { createStrengths, strengthsState, STRENGTH_POINTS } from '../dist/strengths.mjs';
import { SCENE_STOPS } from '../dist/scroll-stops.mjs';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

class Target {
  listeners = new Map();
  addEventListener(type, fn) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(fn); this.listeners.set(type, listeners);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type) { for (const fn of [...(this.listeners.get(type) ?? [])]) fn({ type }); }
  count(type) { return this.listeners.get(type)?.size ?? 0; }
}

function style() {
  const values = new Map();
  return {
    getPropertyValue: name => values.get(name) ?? '',
    setProperty: (name, value) => values.set(name, value),
    removeProperty: name => values.delete(name),
    values,
  };
}

function fixture({ desktop = true, reduced = false, progress = 0, missing = false, cardCount = 8 } = {}) {
  const frames = new Map(), observers = [], fontCallbacks = [];
  let id = 0, sceneTop = 2000, sceneHeight = 5500, headerHeight = 100;
  const win = Object.assign(new Target(), {
    innerHeight: 1000, scrollY: 1900 + progress * 4600,
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: key => frames.delete(key),
  });
  const desktopQuery = Object.assign(new Target(), { matches: desktop });
  const reducedQuery = Object.assign(new Target(), { matches: reduced });
  win.matchMedia = query => query.includes('reduced-motion') ? reducedQuery : desktopQuery;
  win.ResizeObserver = class {
    constructor(fn) { this.fn = fn; this.targets = []; this.disconnected = false; observers.push(this); }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected = true; }
  };
  const classes = new Set();
  const track = { style: style(), scrollWidth: 3140 };
  const viewport = { clientWidth: 900 };
  const cards = Array.from({ length: cardCount }, () => ({ style: style() }));
  const count = { textContent: '08 FEATURES' };
  const scene = {
    dataset: {},
    classList: {
      toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
    },
    getBoundingClientRect: () => ({ top: sceneTop - win.scrollY, height: sceneHeight }),
    querySelector: selector => ({ '[data-strength-track]': track, '[data-strength-viewport]': viewport, '[data-strength-count]': count }[selector]),
    querySelectorAll: selector => selector === '[data-strength-card]' ? cards : [],
  };
  const root = Object.assign(new Target(), {
    hidden: false,
    fonts: { ready: { then: fn => fontCallbacks.push(fn) } },
    querySelector: selector => selector === '.strengths-scene' ? (missing ? null : scene)
      : selector === '.site-header' ? { getBoundingClientRect: () => ({ height: headerHeight }) } : null,
  });
  const controller = createStrengths({ root, win });
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); };
  const setProgress = value => { win.scrollY = sceneTop - headerHeight + value * (sceneHeight - (win.innerHeight - headerHeight)); win.emit('scroll'); };
  return { root, win, scene, track, viewport, cards, count, controller, frames, observers, classes,
    desktopQuery, reducedQuery, fontCallbacks, flush, setProgress,
    layout(values) { ({ sceneTop = sceneTop, sceneHeight = sceneHeight, headerHeight = headerHeight } = values); },
  };
}

function assertNoMotionStyle(f) {
  assert.equal(f.scene.classList.contains('strengths-motion'), false);
  assert.equal(f.track.style.getPropertyValue('--strength-x'), '');
  assert.ok(f.cards.every(card => card.style.values.size === 0));
  assert.equal(f.scene.dataset.strengthActive, undefined);
}

test('여덟 카드의 정렬 지점은 유지하고 강점 지면을 정지 목록에서 제외한다', () => {
  assert.deepEqual(STRENGTH_POINTS, [0, .20, .32, .44, .56, .68, .80, .92]);
  assert.equal(SCENE_STOPS.some(scene => scene.selector === '.strengths-scene'), false);
});

test('각 정렬 지점에서 1~8번 카드가 정렬되고 가로 이동은 0~1에 도달한다', () => {
  STRENGTH_POINTS.forEach((point, index) => {
    const state = strengthsState(point);
    near(state.travel, index / 7);
    assert.equal(state.active, index);
  });
});

test('진입 직후부터 가로 이동하고 각 정렬 지점 사이에서는 스크롤에 선형 비례한다', () => {
  assert.ok(strengthsState(.001).travel > 0);
  near(strengthsState(.08).travel, .4 / 7);
  STRENGTH_POINTS.slice(0, -1).forEach((start, index) => {
    const span = STRENGTH_POINTS[index + 1] - start;
    for (const fraction of [.05, .25, .5, .75, .95]) {
      near(strengthsState(start + span * fraction).travel, (index + fraction) / 7);
    }
  });
});

test('완성된 카드 내부에는 진입·이동·역스크롤 동안 reveal 스타일을 쓰지 않는다', () => {
  const f = fixture();
  for (const progress of [0, .001, .08, .20, .56, .92, 1, .80, .32, 0]) {
    f.setProgress(progress); f.flush();
    assert.ok(f.cards.every(card => card.style.values.size === 0));
  }
  f.controller.dispose();
});

test('시작·끝 범위를 제한하고 역방향 계산도 같은 위치의 상태를 복원한다', () => {
  assert.deepEqual(strengthsState(-2), strengthsState(0));
  assert.deepEqual(strengthsState(2), strengthsState(1));
  const progress = Array.from({ length: 201 }, (_, index) => index / 200);
  const forward = progress.map(strengthsState);
  const reverse = [...progress].reverse().map(strengthsState).reverse();
  assert.deepEqual(reverse, forward);
  for (const state of forward) {
    assert.ok(Number.isFinite(state.travel) && state.travel >= 0 && state.travel <= 1);
    assert.ok(Number.isInteger(state.active) && state.active >= 0 && state.active <= 7);
  }
});

test('실제 scene·header·viewport 거리로 계산하고 마지막 카드가 가로 트랙 끝에 정착한다', () => {
  const f = fixture();
  STRENGTH_POINTS.forEach((point, index) => {
    f.setProgress(point); f.flush();
    assert.equal(f.scene.dataset.strengthActive, String(index + 1));
    assert.equal(f.count.textContent, `${String(index + 1).padStart(2, '0')} / 08`);
    assert.equal(f.track.style.getPropertyValue('--strength-x'), `${-index * 320}px`);
    assert.ok(f.cards.every(card => card.style.values.size === 0));
  });
  f.setProgress(STRENGTH_POINTS[6]); f.flush();
  assert.equal(f.track.style.getPropertyValue('--strength-x'), '-1920px');
  assert.equal(f.scene.dataset.strengthActive, '7');
  f.setProgress(STRENGTH_POINTS[1]); f.flush();
  assert.equal(f.track.style.getPropertyValue('--strength-x'), '-320px');
  assert.equal(f.scene.dataset.strengthActive, '2');
  f.controller.dispose();
});

test('resize와 폰트 준비를 재측정하고 트랙이 viewport보다 작으면 음수 이동을 만들지 않는다', () => {
  const f = fixture({ progress: .92 });
  assert.equal(f.track.style.getPropertyValue('--strength-x'), '-2240px');
  f.track.scrollWidth = 800;
  f.win.emit('resize'); f.fontCallbacks.forEach(fn => fn());
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(f.track.style.getPropertyValue('--strength-x'), '0px');
  f.track.scrollWidth = 3000;
  f.observers[0].fn(); f.flush();
  assert.equal(f.track.style.getPropertyValue('--strength-x'), '-2100px');
  f.controller.dispose();
});

test('처음부터 좁은 화면이나 동작 줄이기이면 모든 카드의 static 상태를 유지한다', () => {
  for (const options of [{ desktop: false }, { reduced: true }]) {
    const f = fixture(options);
    assertNoMotionStyle(f);
    assert.equal(f.count.textContent, '08 FEATURES');
    f.win.emit('scroll'); f.flush();
    assert.equal(f.frames.size, 0);
    assertNoMotionStyle(f);
    f.controller.dispose();
  }
});

test('진행 중 narrow·reduced 전환은 예약된 페인트와 motion 스타일을 정리하고 복귀 때 현재 위치를 복원한다', () => {
  for (const [queryName, matches] of [['desktopQuery', false], ['reducedQuery', true]]) {
    const f = fixture({ progress: .80 });
    f.setProgress(.92);
    assert.equal(f.frames.size, 1);
    f[queryName].matches = matches;
    f[queryName].emit('change'); f.flush();
    assert.equal(f.frames.size, 0);
    assertNoMotionStyle(f);
    assert.equal(f.count.textContent, '08 FEATURES');
    f[queryName].matches = !matches;
    f[queryName].emit('change'); f.flush();
    assert.equal(f.scene.dataset.strengthActive, '8');
    assert.equal(f.track.style.getPropertyValue('--strength-x'), '-2240px');
    f.controller.dispose();
  }
});

test('숨겨진 문서는 페인트하지 않고 복귀 시 현재 스크롤 구도를 복원한다', () => {
  const f = fixture();
  const oldX = f.track.style.getPropertyValue('--strength-x');
  f.root.hidden = true;
  f.setProgress(.92); f.root.emit('visibilitychange'); f.flush();
  assert.equal(f.track.style.getPropertyValue('--strength-x'), oldX);
  f.root.hidden = false;
  f.root.emit('visibilitychange'); f.flush();
  assert.equal(f.track.style.getPropertyValue('--strength-x'), '-2240px');
  assert.equal(f.scene.dataset.strengthActive, '8');
  f.controller.dispose();
});

test('stop/start는 리스너·observer·예약 프레임을 정리하며 재시작 중복 바인딩을 막는다', () => {
  const f = fixture();
  f.win.emit('scroll'); f.win.emit('resize');
  assert.equal(f.frames.size, 2);
  f.controller.stop();
  assert.equal(f.frames.size, 0);
  assert.equal(f.win.count('scroll'), 0); assert.equal(f.win.count('resize'), 0); assert.equal(f.win.count('pageshow'), 0);
  assert.equal(f.root.count('visibilitychange'), 0);
  assert.equal(f.desktopQuery.count('change'), 0); assert.equal(f.reducedQuery.count('change'), 0);
  assert.ok(f.observers.every(observer => observer.disconnected));
  f.fontCallbacks.forEach(fn => fn());
  assert.equal(f.frames.size, 0);
  f.setProgress(.80);
  f.controller.start(); f.controller.start();
  assert.equal(f.win.count('scroll'), 1); assert.equal(f.win.count('resize'), 1);
  assert.equal(f.root.count('visibilitychange'), 1);
  assert.equal(f.observers.length, 2);
  assert.equal(f.scene.dataset.strengthActive, '7');
  assert.equal(f.track.style.getPropertyValue('--strength-x'), '-1920px');
  f.controller.dispose();
});

test('dispose는 static 스타일을 복구하고 이후 start·refresh·늦은 폰트 콜백을 무시한다', () => {
  const f = fixture({ progress: .92 });
  f.win.emit('scroll'); f.controller.refresh();
  f.controller.dispose();
  assertNoMotionStyle(f);
  assert.equal(f.count.textContent, '08 FEATURES');
  assert.equal(f.frames.size, 0);
  f.controller.start(); f.controller.refresh(); f.fontCallbacks.forEach(fn => fn());
  f.win.emit('scroll'); f.win.emit('resize'); f.flush();
  assertNoMotionStyle(f);
  assert.equal(f.frames.size, 0);
  assert.equal(f.win.count('scroll'), 0);
  assert.ok(f.observers.every(observer => observer.disconnected));
});

test('지면이나 여덟 카드 구조가 맞지 않는 경우 lifecycle은 다른 페이지에 영향을 주지 않는다', () => {
  for (const options of [{ missing: true }, { cardCount: 6 }, { cardCount: 7 }, { cardCount: 9 }]) {
    const f = fixture(options);
    f.controller.start(); f.controller.refresh(); f.controller.stop(); f.controller.dispose();
    assert.equal(f.frames.size, 0);
    assert.equal(f.win.count('scroll'), 0);
    assert.equal(f.observers.length, 0);
    assertNoMotionStyle(f);
  }
});
