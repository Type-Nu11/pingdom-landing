import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

// 실제 controller를 평가하되 renderer만 대체합니다. 셰이더 컴파일·GPU 출력·시각적 동일성 검증은 아닙니다.
const moduleSource = (await readFile(new URL('../dist/ring-flow.mjs', import.meta.url), 'utf8')).replaceAll('export function', 'function');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
}
function fixture(t, { holdImage = false } = {}) {
  const classes = new Set(), frames = new Map(), contextListeners = new Set();
  const imageLoad = deferred();
  if (!holdImage) imageLoad.resolve();
  let sequence = 0, decodeCount = 0, created = 0, resized = 0, disposed = 0;
  const rendered = [], observers = [];
  const canvas = new EventTarget();
  const addListener = canvas.addEventListener.bind(canvas);
  const removeListener = canvas.removeEventListener.bind(canvas);
  canvas.addEventListener = (name, listener) => {
    if (name === 'webglcontextlost') contextListeners.add(listener);
    addListener(name, listener);
  };
  canvas.removeEventListener = (name, listener) => {
    if (name === 'webglcontextlost') contextListeners.delete(listener);
    removeListener(name, listener);
  };
  const image = { decode: () => { decodeCount++; return imageLoad.promise; } };
  const hero = {
    querySelector: selector => selector === '.ring-flow-canvas' ? canvas : image,
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) }
  };
  class ResizeObserverMock {
    constructor(callback) {
      this.callback = callback;
      this.observed = new Set();
      this.disconnectCount = 0;
      observers.push(this);
    }
    observe(element) { this.observed.add(element); }
    disconnect() { this.disconnectCount++; this.observed.clear(); }
  }
  const context = createContext({
    hero,
    ResizeObserver: ResizeObserverMock,
    requestAnimationFrame: callback => { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame: id => frames.delete(id),
    rendererFactory: (target, source) => {
      assert.equal(target, canvas);
      assert.equal(source, image);
      created++;
      return {
        resize: () => resized++,
        render: seconds => rendered.push(seconds),
        dispose: () => disposed++
      };
    }
  });
  runInContext(moduleSource, context);
  const controller = runInContext('createRingFlowRenderer = rendererFactory; createRingFlow({ hero })', context);
  t.after(() => controller.dispose());
  return {
    controller, classes, frames, canvas, imageLoad, rendered, observers, contextListeners,
    get decodeCount() { return decodeCount; },
    get created() { return created; },
    get resized() { return resized; },
    get disposed() { return disposed; },
    advance: time => {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(time));
    },
    resize: () => observers.forEach(observer => {
      if (observer.observed.has(canvas)) observer.callback([{ target: canvas }]);
    }),
    loseContext: () => canvas.dispatchEvent(new Event('webglcontextlost'))
  };
}

test('일시정지 상태로 생성하면 이미지 디코딩과 GPU 초기화를 시작하지 않는다', async t => {
  const f = fixture(t);
  f.controller.setPaused(true);
  await tick();
  assert.equal(f.decodeCount, 0);
  assert.equal(f.created, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.classes.has('ring-flow-ready'), false);
});

test('시작과 반복 동기화에도 renderer와 프레임 루프는 하나만 생성한다', async t => {
  const f = fixture(t);
  f.controller.setPaused(false);
  f.controller.setPaused(false);
  f.controller.setPaused(false);
  await tick();
  assert.equal(f.decodeCount, 1);
  assert.equal(f.created, 1);
  assert.equal(f.resized, 1);
  assert.deepEqual(f.rendered, [0]);
  assert.equal(f.classes.has('ring-flow-ready'), true);
  assert.equal(f.frames.size, 1);
  f.controller.setPaused(false);
  f.controller.setPaused(false);
  await tick();
  f.advance(1000);
  assert.equal(f.created, 1);
  assert.equal(f.frames.size, 1);
  assert.deepEqual(f.rendered, [0, 0]);
});

test('일시정지는 예약 프레임을 취소하고 재개 시 정지 시간을 경과 시간에 더하지 않는다', async t => {
  const f = fixture(t);
  f.controller.setPaused(false);
  await tick();
  f.advance(1000);
  f.advance(1032);
  assert.equal(f.rendered.at(-1), .032);
  f.controller.setPaused(true);
  assert.equal(f.frames.size, 0);
  const beforePause = [...f.rendered];
  f.advance(10000);
  assert.deepEqual(f.rendered, beforePause);
  f.controller.setPaused(false);
  await tick();
  f.advance(20000);
  assert.equal(f.rendered.at(-1), .032);
  f.advance(20016);
  assert.ok(Math.abs(f.rendered.at(-1) - .048) < 1e-10);
  assert.equal(f.created, 1);
  assert.equal(f.frames.size, 1);
});

test('디코딩 중 일시정지하면 늦은 완료가 renderer를 생성하지 않으며 재개는 가능하다', async t => {
  const f = fixture(t, { holdImage: true });
  f.controller.setPaused(false);
  assert.equal(f.decodeCount, 1);
  f.controller.setPaused(true);
  f.imageLoad.resolve();
  await tick();
  assert.equal(f.created, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.classes.has('ring-flow-ready'), false);
  f.controller.setPaused(false);
  await tick();
  assert.equal(f.created, 1);
  assert.equal(f.frames.size, 1);
});

test('디코딩 중 dispose하면 늦은 완료나 재개 요청이 renderer를 생성하지 않는다', async t => {
  const f = fixture(t, { holdImage: true });
  f.controller.setPaused(false);
  f.controller.dispose();
  f.imageLoad.resolve();
  await tick();
  f.controller.setPaused(false);
  await tick();
  assert.equal(f.created, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.classes.has('ring-flow-ready'), false);
  assert.equal(f.observers[0].disconnectCount, 1);
});

test('context loss는 정적 이미지로 복구하고 프레임과 renderer를 정리한다', async t => {
  const f = fixture(t);
  f.controller.setPaused(false);
  await tick();
  f.loseContext();
  assert.equal(f.classes.has('ring-flow-ready'), false);
  assert.equal(f.frames.size, 0);
  assert.equal(f.disposed, 1);
  const renderedCount = f.rendered.length;
  f.controller.setPaused(false);
  await tick();
  f.advance(2000);
  assert.equal(f.created, 1);
  assert.equal(f.rendered.length, renderedCount);
  assert.equal(f.frames.size, 0);
});

test('resize는 다음 프레임에 한 번 적용하고 dispose는 관찰자와 이벤트를 한 번만 해제한다', async t => {
  const f = fixture(t);
  assert.deepEqual([...f.observers[0].observed], [f.canvas]);
  assert.equal(f.contextListeners.size, 1);
  f.controller.setPaused(false);
  await tick();
  f.resize();
  f.resize();
  assert.equal(f.resized, 1);
  f.advance(1000);
  assert.equal(f.resized, 2);
  f.advance(1016);
  assert.equal(f.resized, 2);
  f.controller.dispose();
  f.controller.dispose();
  assert.equal(f.observers[0].disconnectCount, 1);
  assert.equal(f.observers[0].observed.size, 0);
  assert.equal(f.contextListeners.size, 0);
  assert.equal(f.disposed, 1);
  assert.equal(f.classes.has('ring-flow-ready'), false);
  assert.equal(f.frames.size, 0);
  const renderedCount = f.rendered.length;
  f.resize();
  f.loseContext();
  f.controller.setPaused(false);
  await tick();
  f.advance(2000);
  assert.equal(f.created, 1);
  assert.equal(f.disposed, 1);
  assert.equal(f.resized, 2);
  assert.equal(f.rendered.length, renderedCount);
  assert.equal(f.frames.size, 0);
});
