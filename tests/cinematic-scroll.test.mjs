import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { createCinematicScroll, sampleMotion, sceneProgress } from '../dist/cinematic-scroll.mjs';

// 실제 controller에 최소 DOM·RAF·ResizeObserver 대역을 주입합니다.
// 브라우저의 sticky 배치, CSS 합성 결과, 실제 스크롤 성능은 이 테스트 범위에 포함하지 않습니다.
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

const defaults = { x: 0, y: 0, s: 1, r: 0, rx: 0, ry: 0, sx: 1, sy: 1, o: 1 };
const motion = [
  { at: 0, x: -.5, y: .2, o: 0 },
  { at: .5, x: 0, y: 0, o: 1 },
  { at: 1, x: .5, y: -.2, s: 1.2, r: 10, rx: 5, ry: -5, sx: .8, sy: 1.1, o: 0 }
];

function element(attributes = {}, { top = 0, height = 100, operations = [] } = {}) {
  const attrs = new Map(Object.entries(attributes).map(([name, value]) => [name, String(value)]));
  const properties = new Map(), priorities = new Map(), classes = new Set();
  let inert = false;
  const node = Object.assign(new ObservedTarget(), {
    nodeType: 1,
    parentElement: null,
    children: [],
    rect: { top, height, left: 0, width: 1200 },
    reads: 0,
    writes: 0,
    getAttribute: name => attrs.get(name) ?? null,
    hasAttribute: name => attrs.has(name),
    setAttribute(name, value) { attrs.set(name, String(value)); },
    removeAttribute: name => attrs.delete(name),
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle(name, force) {
        const enabled = force ?? !classes.has(name);
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      }
    },
    append(...nodes) {
      nodes.forEach(child => { child.parentElement = node; node.children.push(child); });
    },
    matches(selector) {
      return selector.split(',').some(part => {
        const selected = part.trim();
        if (selected.startsWith('#')) return attrs.get('id') === selected.slice(1);
        const match = /^\[([^=\]]+)(?:=["']?([^\]"']*)["']?)?\]$/.exec(selected);
        return !!match && attrs.has(match[1]) && (match[2] === undefined || attrs.get(match[1]) === match[2]);
      });
    },
    closest(selector) {
      for (let current = node; current; current = current.parentElement) {
        if (current.matches(selector)) return current;
      }
      return null;
    },
    contains(candidate) {
      return candidate === node || node.children.some(child => child.contains(candidate));
    },
    querySelectorAll(selector) {
      return node.children.flatMap(child => [
        ...(child.matches(selector) ? [child] : []),
        ...child.querySelectorAll(selector)
      ]);
    },
    querySelector(selector) { return node.querySelectorAll(selector)[0] ?? null; },
    getBoundingClientRect() {
      node.reads++;
      operations.push({ kind: 'read', node });
      return { ...node.rect, bottom: node.rect.top + node.rect.height, right: node.rect.left + node.rect.width };
    }
  });
  const write = (name, value, priority = '') => {
    properties.set(name, String(value));
    priorities.set(name, priority);
    node.writes++;
    operations.push({ kind: 'write', node });
  };
  node.style = new Proxy({
    setProperty: write,
    getPropertyValue: name => properties.get(name) ?? '',
    getPropertyPriority: name => priorities.get(name) ?? '',
    removeProperty(name) {
      const previous = properties.get(name) ?? '';
      properties.delete(name);
      priorities.delete(name);
      node.writes++;
      operations.push({ kind: 'write', node });
      return previous;
    }
  }, {
    get: (target, name) => name in target ? target[name] : properties.get(name) ?? '',
    set: (_, name, value) => { write(name, value); return true; }
  });
  node.dataset = new Proxy({}, {
    get: (_, name) => attrs.get(`data-${String(name).replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`),
    set: (_, name, value) => {
      attrs.set(`data-${String(name).replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`, String(value));
      return true;
    }
  });
  Object.defineProperties(node, {
    id: { get: () => attrs.get('id') ?? '' },
    inert: {
      get: () => inert,
      set(value) { inert = Boolean(value); node.writes++; operations.push({ kind: 'write', node }); }
    }
  });
  return node;
}

function fixture(t, { reduced = false, width = 1200, motionValue = motion, mobileMotion, secondScene = false, sceneProgressValue, sceneProgressPriority = '' } = {}) {
  const operations = [];
  const html = element({}, { operations });
  const scene = element({ 'data-scene': '', id: 'intro' }, { top: -1000, height: 3000, operations });
  if (sceneProgressValue !== undefined) scene.style.setProperty('--scene-progress', sceneProgressValue, sceneProgressPriority);
  const attrs = { 'data-motion': typeof motionValue === 'string' ? motionValue : JSON.stringify(motionValue) };
  if (mobileMotion !== undefined) attrs['data-motion-mobile'] = JSON.stringify(mobileMotion);
  const actor = element(attrs, { operations });
  actor.style.transform = 'rotate(2deg)';
  actor.style.opacity = '.8';
  actor.style.visibility = 'visible';
  actor.inert = false;
  scene.append(actor);
  html.append(scene);
  const scenes = [scene], actors = [actor];
  if (secondScene) {
    const nextScene = element({ 'data-scene': '', id: 'details' }, { top: 500, height: 2500, operations });
    const nextActor = element({ 'data-motion': JSON.stringify(motion) }, { operations });
    nextScene.append(nextActor);
    html.append(nextScene);
    scenes.push(nextScene);
    actors.push(nextActor);
  }
  let resolveFonts;
  const fonts = Object.assign(new ObservedTarget(), {
    ready: new Promise(resolve => { resolveFonts = resolve; })
  });
  const root = Object.assign(new ObservedTarget(), {
    hidden: false,
    documentElement: html,
    fonts,
    querySelectorAll: selector => html.querySelectorAll(selector),
    querySelector: selector => html.querySelector(selector),
    getElementById: id => html.querySelector(`#${id}`),
    contains: node => html.contains(node)
  });
  const reducedMotion = Object.assign(new ObservedTarget(), { matches: reduced });
  const frames = new Map(), observers = [], scrolls = [];
  let sequence = 0;
  class ResizeObserverMock {
    constructor(callback) {
      this.callback = callback;
      this.observed = new Set();
      this.disconnectCount = 0;
      observers.push(this);
    }
    observe(node) { this.observed.add(node); }
    unobserve(node) { this.observed.delete(node); }
    disconnect() { this.disconnectCount++; this.observed.clear(); }
  }
  const view = Object.assign(new ObservedTarget(), {
    innerHeight: 1000,
    innerWidth: width,
    scrollY: 1200,
    pageYOffset: 1200,
    matchMedia: () => reducedMotion,
    ResizeObserver: ResizeObserverMock,
    requestAnimationFrame: callback => { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame: id => frames.delete(id),
    scrollTo: options => scrolls.push(options)
  });
  const controller = createCinematicScroll({ root, view, reducedMotion });
  t.after(() => controller.destroy());
  return {
    controller, root, view, html, scene, actor, scenes, actors, reducedMotion,
    fonts, resolveFonts, operations, frames, observers, scrolls,
    emit: (target, name) => target.dispatchEvent(new Event(name)),
    scroll(y = view.scrollY + 1) {
      view.scrollY = y;
      view.pageYOffset = y;
      view.dispatchEvent(new Event('scroll'));
    },
    click(node) {
      const event = new Event('click', { cancelable: true });
      Object.defineProperty(event, 'target', { value: node });
      root.dispatchEvent(event);
      return event;
    },
    frame() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(16));
    }
  };
}

const opacity = node => Number(node.style.opacity);
function translation(node) {
  const values = /translate3d\(\s*([-+.\d]+)px\s*,\s*([-+.\d]+)px\s*,\s*[-+.\d]+(?:px)?\s*\)/.exec(node.style.transform);
  assert.ok(values, `translate3d 값이 없습니다: ${node.style.transform}`);
  return values.slice(1).map(Number);
}
function assertOriginal(actor) {
  assert.equal(actor.style.transform, 'rotate(2deg)');
  assert.equal(actor.style.opacity, '.8');
  assert.equal(actor.style.visibility, 'visible');
  assert.equal(actor.inert, false);
}

test('장면 진행도는 실제 이동 가능 높이를 사용하고 앞뒤 경계를 제한한다', () => {
  assert.equal(sceneProgress({ top: 100, height: 3000 }, 1000), 0);
  assert.equal(sceneProgress({ top: -1000, height: 3000 }, 1000), .5);
  assert.equal(sceneProgress({ top: -2500, height: 3000 }, 1000), 1);
  assert.equal(sceneProgress({ top: 0, height: 1000 }, 1000), 0);
  assert.equal(sceneProgress({ top: -1, height: 500 }, 1000), 1);
  assert.equal(sceneProgress(null, 1000), 0);
  assert.equal(sceneProgress({ top: NaN, height: 3000 }, 1000), 0);
  assert.equal(sceneProgress({ top: -1000, height: 3000 }, 0), 0);
});

test('키프레임 경계는 완전한 기본값을 반환하고 누락 속성을 이전 프레임에서 이어받는다', () => {
  const keyframes = [{ at: .2, x: .4, s: .9 }, { at: .6, y: -.3 }, { at: .8, o: .2 }];
  assert.deepEqual(sampleMotion(keyframes, -1), { ...defaults, x: .4, s: .9 });
  assert.deepEqual(sampleMotion(keyframes, .6), { ...defaults, x: .4, y: -.3, s: .9 });
  assert.deepEqual(sampleMotion(keyframes, 2), { ...defaults, x: .4, y: -.3, s: .9, o: .2 });
  assert.deepEqual(sampleMotion([{ at: .4, ry: 12 }], .7), { ...defaults, ry: 12 });
});

test('구간 내부는 smoothstep으로 보간하고 역방향 재조회에도 같은 값을 반환한다', () => {
  const keyframes = [{ at: 0, x: 0, rx: 0, sy: 1 }, { at: 1, x: 1, rx: 32, sy: 2 }];
  const original = JSON.stringify(keyframes);
  assert.deepEqual(sampleMotion(keyframes, .25), { ...defaults, x: .15625, rx: 5, sy: 1.15625 });
  assert.deepEqual(sampleMotion(keyframes, NaN), defaults);
  assert.deepEqual(sampleMotion(keyframes, .75), { ...defaults, x: .84375, rx: 27, sy: 1.84375 });
  assert.deepEqual(sampleMotion(keyframes, .25), { ...defaults, x: .15625, rx: 5, sy: 1.15625 });
  assert.equal(JSON.stringify(keyframes), original);
});

test('잘못된 키프레임 배열·시점·비유한 수치는 모션 계산에서 제외한다', () => {
  const invalid = [
    null, {}, [], [null], [{}], [{ at: -1 }], [{ at: 2 }],
    [{ at: 0 }, { at: -.1 }], [{ at: 1 }, { at: 0 }],
    [{ at: NaN }], [{ at: Infinity }], [{ at: '0' }],
    [{ at: 0, x: Infinity }], [{ at: 0, o: NaN }], [{ at: 0, y: '1' }]
  ];
  for (const keyframes of invalid) assert.equal(sampleMotion(keyframes, .5), null);
});

test('초기 복원은 현재 위치를 렌더링하고 idle 상태에는 RAF를 남기지 않는다', t => {
  const f = fixture(t);
  assert.equal(f.html.classList.contains('cinema-ready'), true);
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.equal(opacity(f.actor), 1);
  assert.deepEqual(translation(f.actor), [0, 0]);
  assert.equal(f.actor.style.visibility, 'visible');
  assert.equal(f.actor.inert, false);
  assert.equal(f.frames.size, 0);
});

test('장면 CSS 진행률은 스크롤을 반영하고 모션 감소·종료 시 원래 값과 우선순위를 복구한다', t => {
  const f = fixture(t, { sceneProgressValue: '.375', sceneProgressPriority: 'important' });
  f.frame();
  assert.equal(Number(f.scene.style.getPropertyValue('--scene-progress')), .5);
  f.scene.rect.top = -500;
  f.scroll();
  f.frame();
  assert.equal(Number(f.scene.style.getPropertyValue('--scene-progress')), .25);
  f.reducedMotion.matches = true;
  f.emit(f.reducedMotion, 'change');
  assert.equal(f.scene.style.getPropertyValue('--scene-progress'), '.375');
  assert.equal(f.scene.style.getPropertyPriority('--scene-progress'), 'important');
  assert.equal(f.frames.size, 0);
  f.reducedMotion.matches = false;
  f.emit(f.reducedMotion, 'change');
  f.frame();
  assert.equal(Number(f.scene.style.getPropertyValue('--scene-progress')), .25);
  f.controller.destroy();
  assert.equal(f.scene.style.getPropertyValue('--scene-progress'), '.375');
  assert.equal(f.scene.style.getPropertyPriority('--scene-progress'), 'important');

  const withoutInlineValue = fixture(t);
  withoutInlineValue.frame();
  assert.equal(Number(withoutInlineValue.scene.style.getPropertyValue('--scene-progress')), .5);
  withoutInlineValue.controller.destroy();
  assert.equal(withoutInlineValue.scene.style.getPropertyValue('--scene-progress'), '');
  assert.equal(withoutInlineValue.scene.style.getPropertyPriority('--scene-progress'), '');
});

test('scroll 연속 호출은 한 프레임에서 최신 geometry를 읽고 모든 측정 후에 쓴다', t => {
  const f = fixture(t, { secondScene: true });
  f.frame();
  f.scene.rect.top = -100;
  f.scroll();
  f.scene.rect.top = -500;
  for (let index = 0; index < 8; index++) f.scroll();
  const reads = f.scenes.map(scene => scene.reads);
  f.operations.length = 0;
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.deepEqual(f.scenes.map(scene => scene.reads), reads.map(count => count + 1));
  assert.equal(opacity(f.actor), .5);
  assert.deepEqual(translation(f.actor), [-300, 100]);
  const firstWrite = f.operations.findIndex(operation => operation.kind === 'write');
  const lastRead = f.operations.findLastIndex(operation => operation.kind === 'read');
  assert.ok(firstWrite > lastRead);
  assert.equal(f.frames.size, 0);
});

test('실제 위치 변화가 없는 scroll 이벤트는 새 프레임을 만들지 않는다', t => {
  const f = fixture(t);
  f.frame();
  const reads = f.scene.reads;
  f.emit(f.view, 'scroll');
  f.emit(f.view, 'scroll');
  assert.equal(f.frames.size, 0);
  assert.equal(f.scene.reads, reads);
});

test('불투명도가 사라진 요소는 inert 처리하고 역스크롤 시 다시 활성화한다', t => {
  const f = fixture(t);
  f.scene.rect.top = 0;
  f.frame();
  assert.equal(opacity(f.actor), 0);
  assert.equal(f.actor.style.visibility, 'hidden');
  assert.equal(f.actor.inert, true);
  f.scene.rect.top = -1000;
  f.scroll();
  f.frame();
  assert.equal(opacity(f.actor), 1);
  assert.equal(f.actor.style.visibility, 'visible');
  assert.equal(f.actor.inert, false);
});

test('잘못된 JSON과 키프레임은 원래 표시 상태를 유지한다', t => {
  for (const motionValue of ['{invalid', [{ at: 1 }, { at: 0 }], [{ at: 0, x: 'bad' }]]) {
    const f = fixture(t, { motionValue });
    f.frame();
    assertOriginal(f.actor);
    f.scroll();
    f.frame();
    assertOriginal(f.actor);
  }
});

test('모션 감소는 시작 시 프레임을 요청하지 않고 실행 중 전환도 원래 상태로 복구한다', t => {
  const initiallyReduced = fixture(t, { reduced: true });
  assert.equal(initiallyReduced.html.classList.contains('cinema-ready'), false);
  assertOriginal(initiallyReduced.actor);
  initiallyReduced.scroll();
  initiallyReduced.emit(initiallyReduced.view, 'resize');
  initiallyReduced.controller.refresh();
  assert.equal(initiallyReduced.frames.size, 0);

  const f = fixture(t);
  f.scene.rect.top = 0;
  f.frame();
  assert.equal(f.actor.inert, true);
  f.scroll();
  f.reducedMotion.matches = true;
  f.emit(f.reducedMotion, 'change');
  assert.equal(f.frames.size, 0);
  assert.equal(f.html.classList.contains('cinema-ready'), false);
  assertOriginal(f.actor);
  f.scene.rect.top = -1000;
  f.reducedMotion.matches = false;
  f.emit(f.reducedMotion, 'change');
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.equal(opacity(f.actor), 1);
  assert.equal(f.frames.size, 0);
});

test('700px 이하 모바일 키프레임을 선택하고 resize 후 desktop 키프레임으로 돌아간다', t => {
  const f = fixture(t, {
    width: 700,
    motionValue: [{ at: 0, x: 1, o: .2 }, { at: 1, x: 1, o: .2 }],
    mobileMotion: [{ at: 0, x: .25, o: .7 }, { at: 1, x: .25, o: .7 }]
  });
  f.frame();
  assert.equal(opacity(f.actor), .7);
  assert.deepEqual(translation(f.actor), [175, 0]);
  f.view.innerWidth = 701;
  f.emit(f.view, 'resize');
  f.frame();
  assert.equal(opacity(f.actor), .2);
  assert.deepEqual(translation(f.actor), [701, 0]);
  assert.equal(f.frames.size, 0);
});

test('탭 숨김과 pagehide는 대기 작업을 멈추고 복귀 시 최신 위치를 갱신한다', t => {
  const f = fixture(t);
  f.frame();
  f.scroll();
  f.root.hidden = true;
  f.emit(f.root, 'visibilitychange');
  assert.equal(f.frames.size, 0);
  const writes = f.actor.writes;
  f.scene.rect.top = 0;
  f.scroll();
  f.emit(f.view, 'resize');
  f.frame();
  assert.equal(f.actor.writes, writes);
  f.root.hidden = false;
  f.emit(f.root, 'visibilitychange');
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.equal(opacity(f.actor), 0);
  f.scroll();
  f.emit(f.view, 'pagehide');
  assert.equal(f.frames.size, 0);
  f.scene.rect.top = -1000;
  f.scroll();
  assert.equal(f.frames.size, 0);
  f.emit(f.view, 'pageshow');
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.equal(opacity(f.actor), 1);
});

test('폰트와 resize observer 통지는 새 배치 측정을 한 프레임으로 모은다', async t => {
  const f = fixture(t);
  f.frame();
  f.scene.rect.height = 5000;
  f.resolveFonts();
  await f.fonts.ready;
  await Promise.resolve();
  f.emit(f.fonts, 'loadingdone');
  f.observers.forEach(observer => observer.callback([{ target: f.scene }]));
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.equal(opacity(f.actor), .5);
  assert.equal(f.frames.size, 0);
});

test('장면 이동 버튼의 자식 클릭도 장면 절대 위치와 이동 비율을 계산한다', t => {
  for (const reduced of [false, true]) {
    const f = fixture(t, { reduced });
    const button = element({ 'data-seek': '.75' });
    const label = element();
    button.append(label);
    f.scene.append(button);
    f.click(label);
    assert.deepEqual(f.scrolls, [{ top: 1700, behavior: reduced ? 'auto' : 'smooth' }]);
    button.setAttribute('data-seek', 'invalid');
    f.click(label);
    assert.equal(f.scrolls.length, 1);
  }
});

test('본문 바로 보기와 같은 진행값의 장면 버튼도 현재 표시를 유지한다', t => {
  const f = fixture(t);
  const shortcut = element({ 'data-seek': '.5', 'data-scene-shortcut': '' });
  const chapter = element({ 'data-seek': '.5' });
  f.scene.append(shortcut, chapter);
  f.controller.refresh();
  f.frame();
  assert.equal(shortcut.getAttribute('aria-current'), null);
  assert.equal(chapter.getAttribute('aria-current'), 'step');
  f.click(shortcut);
  assert.deepEqual(f.scrolls, [{ top: 1200, behavior: 'smooth' }]);
});

test('destroy는 원본을 복구하고 이벤트·observer·대기 프레임과 늦은 콜백을 정리한다', async t => {
  const f = fixture(t);
  f.frame();
  f.scroll();
  assert.equal(f.frames.size, 1);
  assert.ok(f.root.listenerCount > 0);
  assert.ok(f.view.listenerCount > 0);
  f.controller.destroy();
  f.controller.destroy();
  assertOriginal(f.actor);
  assert.equal(f.html.classList.contains('cinema-ready'), false);
  assert.equal(f.frames.size, 0);
  assert.equal(f.root.listenerCount, 0);
  assert.equal(f.view.listenerCount, 0);
  assert.equal(f.reducedMotion.listenerCount, 0);
  assert.equal(f.fonts.listenerCount, 0);
  assert.ok(f.observers.every(observer => observer.disconnectCount === 1 && observer.observed.size === 0));
  const writes = f.actor.writes;
  f.resolveFonts();
  await f.fonts.ready;
  await Promise.resolve();
  f.observers.forEach(observer => observer.callback([{ target: f.scene }]));
  f.scroll();
  f.emit(f.view, 'resize');
  f.emit(f.view, 'pageshow');
  f.emit(f.root, 'visibilitychange');
  f.emit(f.fonts, 'loadingdone');
  f.emit(f.reducedMotion, 'change');
  f.controller.refresh();
  f.frame();
  assert.equal(f.actor.writes, writes);
  assert.equal(f.frames.size, 0);
});
