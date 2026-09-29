import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

// 실제 controller를 평가하되 renderer만 대체합니다. 셰이더 컴파일·GPU 출력·시각적 동일성 검증은 아닙니다.
const moduleSource = (await readFile(new URL('../dist/ring-flow.mjs', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?\n/gm, '')
  .replaceAll('export function', 'function');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
}
function fixture(t, { holdImage = false, reduced = false } = {}) {
  const classes = new Set(), frames = new Map();
  const imageLoad = deferred();
  if (!holdImage) imageLoad.resolve();
  let sequence = 0, decodeCount = 0, created = 0, resized = 0, disposed = 0;
  let clock = 0, rectReads = 0, failRender = false;
  const rendered = [], observers = [];
  const canvas = new EventTarget(), hero = new EventTarget(), window = new EventTarget();
  const reducedMotion = { matches: reduced };
  const rect = { left: 100, top: 200, width: 800, height: 300 };
  canvas.getBoundingClientRect = () => { rectReads++; return { ...rect }; };
  const image = { decode: () => { decodeCount++; return imageLoad.promise; } };
  hero.querySelector = selector => ({ '.ring-flow-canvas': canvas, '.hero-model img': image })[selector] ?? null;
  hero.classList = { add: name => classes.add(name), remove: name => classes.delete(name) };
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
    hero, window, reducedMotion,
    performance: { now: () => clock },
    ResizeObserver: ResizeObserverMock,
    requestAnimationFrame: callback => { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame: id => frames.delete(id),
    rendererFactory: (target, source) => {
      assert.equal(target, canvas);
      assert.equal(source, image);
      created++;
      return {
        resize: () => resized++,
        render: (seconds, pointer) => {
          if (failRender) throw new Error('renderer unavailable');
          rendered.push({ seconds, pointer: { ...pointer } });
        },
        dispose: () => disposed++
      };
    }
  });
  runInContext(moduleSource, context);
  const controller = runInContext('createRingFlowRenderer = rendererFactory; createRingFlow({ hero, reducedMotion })', context);
  t.after(() => controller.dispose());
  function advance(time) {
    clock = time;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(time));
  }
  function runFor(duration, step = 16) {
    const end = clock + duration;
    while (clock < end) advance(Math.min(clock + step, end));
  }
  return {
    controller, classes, frames, canvas, hero, window, imageLoad, rendered, observers, reducedMotion, rect,
    get decodeCount() { return decodeCount; },
    get created() { return created; },
    get resized() { return resized; },
    get disposed() { return disposed; },
    get rectReads() { return rectReads; },
    advance, runFor,
    async start() { controller.setPaused(false); await tick(); },
    async settle() { controller.setPaused(false); await tick(); runFor(1100); },
    move: (pointerType = 'mouse', clientX = 500, clientY = 350) => {
      const event = new Event('pointermove');
      Object.assign(event, { pointerType, clientX, clientY });
      Object.defineProperty(event, 'timeStamp', { value: clock });
      hero.dispatchEvent(event);
    },
    resize: () => observers.forEach(observer => {
      if (observer.observed.has(canvas)) observer.callback([{ target: canvas }]);
    }),
    loseContext: () => canvas.dispatchEvent(new Event('webglcontextlost')),
    failRender: () => { failRender = true; }
  };
}
function assertNeutral(pointer) {
  assert.equal(pointer.strength, 0);
  assert.equal(pointer.velocityX, 0);
  assert.equal(pointer.velocityY, 0);
}

test('일시정지 상태로 생성하면 이미지 디코딩과 GPU 초기화를 시작하지 않는다', async t => {
  const f = fixture(t);
  f.controller.setPaused(true);
  f.move();
  f.resize();
  await tick();
  assert.equal(f.decodeCount, 0);
  assert.equal(f.created, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.classes.has('ring-flow-ready'), false);
});

test('반복 시작에도 renderer와 RAF는 하나이며 최초 전환이 끝나면 정지한다', async t => {
  const f = fixture(t);
  f.controller.setPaused(false);
  f.controller.setPaused(false);
  await f.start();
  assert.equal(f.decodeCount, 1);
  assert.equal(f.created, 1);
  assert.equal(f.resized, 1);
  assert.equal(f.rendered[0].seconds, 0);
  assert.equal(f.classes.has('ring-flow-ready'), true);
  assert.equal(f.frames.size, 1);
  f.controller.setPaused(false);
  assert.equal(f.frames.size, 1);
  f.runFor(1100);
  assert.ok(f.rendered.at(-1).seconds >= .9);
  assert.equal(f.frames.size, 0);
  const count = f.rendered.length;
  f.controller.setPaused(false);
  f.runFor(1000);
  assert.equal(f.rendered.length, count);
  assert.equal(f.created, 1);
});

test('마우스와 펜은 캔버스 좌표로 hover를 시작하고 중복 입력에도 RAF 하나만 유지한다', async t => {
  const f = fixture(t);
  await f.settle();
  f.move('mouse', 300, 275);
  f.move('mouse', 300, 275);
  assert.equal(f.frames.size, 1);
  f.runFor(200);
  assert.equal(f.rendered.at(-1).pointer.x, .25);
  assert.equal(f.rendered.at(-1).pointer.y, .25);
  assert.ok(f.rendered.at(-1).pointer.strength > 0);
  f.move('pen', 500, 350);
  f.runFor(100);
  assert.ok(f.rendered.at(-1).pointer.x > .25);
  assert.ok(f.rendered.at(-1).pointer.velocityX > 0);
  assert.ok(f.rendered.at(-1).pointer.velocityY > 0);
  assert.equal(f.frames.size, 1);
});

test('pointerleave·pointercancel·blur 이후 800ms 이내에 안착하고 RAF를 종료한다', async t => {
  const f = fixture(t);
  await f.settle();
  for (const [target, name] of [[f.hero, 'pointerleave'], [f.hero, 'pointercancel'], [f.window, 'blur']]) {
    f.move();
    f.runFor(400);
    assert.ok(f.rendered.at(-1).pointer.strength > .9);
    target.dispatchEvent(new Event(name));
    f.runFor(800);
    assertNeutral(f.rendered.at(-1).pointer);
    assert.equal(f.frames.size, 0, name);
  }
});

test('느린 프레임에서도 hover 종료 후 800ms 안착 시간이 늘어나지 않는다', async t => {
  const f = fixture(t);
  await f.settle();
  f.move();
  f.runFor(400);
  f.hero.dispatchEvent(new Event('pointerleave'));
  f.runFor(800, 100);
  assertNeutral(f.rendered.at(-1).pointer);
  assert.equal(f.frames.size, 0);
});

test('터치와 캔버스 밖 포인터는 정적 하프톤에 hover를 활성화하지 않는다', async t => {
  const f = fixture(t);
  await f.settle();
  const count = f.rendered.length;
  f.move('touch');
  f.runFor(100);
  assert.equal(f.rendered.length, count);
  assert.equal(f.frames.size, 0);
  f.move('mouse', 50, 150);
  f.runFor(100);
  assertNeutral(f.rendered.at(-1).pointer);
  assert.equal(f.frames.size, 0);
});

test('정적 상태의 캔버스 밖 포인터·scroll·leave는 RAF나 추가 draw를 만들지 않는다', async t => {
  const f = fixture(t);
  await f.settle();
  const count = f.rendered.length;
  const inactiveInputs = [
    () => f.move('mouse', 50, 150),
    () => f.move('pen', 1000, 600),
    () => f.window.dispatchEvent(new Event('scroll')),
    () => f.hero.dispatchEvent(new Event('pointerleave')),
    () => f.hero.dispatchEvent(new Event('pointercancel')),
    () => f.window.dispatchEvent(new Event('blur'))
  ];
  for (const input of inactiveInputs) {
    input();
    assert.equal(f.frames.size, 0);
    f.runFor(16);
    assert.equal(f.rendered.length, count);
  }
});

test('전환 중 일시정지는 프레임을 취소하고 재개 시 정지 시간을 더하지 않는다', async t => {
  const f = fixture(t);
  await f.start();
  f.advance(1000);
  f.advance(1032);
  assert.equal(f.rendered.at(-1).seconds, .032);
  f.controller.setPaused(true);
  assert.equal(f.frames.size, 0);
  const count = f.rendered.length;
  f.advance(10000);
  assert.equal(f.rendered.length, count);
  f.controller.setPaused(false);
  f.advance(20000);
  assert.equal(f.rendered.at(-1).seconds, .032);
  f.advance(20016);
  assert.ok(Math.abs(f.rendered.at(-1).seconds - .048) < 1e-10);
  assert.equal(f.created, 1);
  assert.equal(f.frames.size, 1);
});

test('화면 밖 일시정지는 hover를 제거하고 복귀 시 중립 프레임 한 번으로 멈춘다', async t => {
  const f = fixture(t);
  await f.settle();
  f.move();
  f.runFor(200);
  const seconds = f.rendered.at(-1).seconds;
  f.controller.setPaused(true);
  assert.equal(f.frames.size, 0);
  const count = f.rendered.length;
  f.move('pen');
  f.runFor(10000);
  assert.equal(f.rendered.length, count);
  f.controller.setPaused(false);
  f.runFor(16);
  assert.equal(f.rendered.length, count + 1);
  assert.equal(f.rendered.at(-1).seconds, seconds);
  assertNeutral(f.rendered.at(-1).pointer);
  assert.equal(f.frames.size, 0);
});

test('모션 감소의 초기 진입은 정적 하프톤을 표시하며 포인터와 재개로 루프를 만들지 않는다', async t => {
  const f = fixture(t, { reduced: true });
  await f.start();
  assert.equal(f.created, 1);
  assert.equal(f.classes.has('ring-flow-ready'), true);
  assert.ok(f.rendered.every(frame => frame.seconds >= .9));
  assertNeutral(f.rendered.at(-1).pointer);
  assert.equal(f.frames.size, 0);
  const count = f.rendered.length;
  f.move();
  f.move('pen');
  f.runFor(1000);
  assert.equal(f.rendered.length, count);
  f.controller.setPaused(true);
  f.controller.setPaused(false);
  assertNeutral(f.rendered.at(-1).pointer);
  assert.equal(f.frames.size, 0);
});

test('hover 중 모션 감소 전환은 중립 정적 프레임으로 바꾸고 예약 RAF를 취소한다', async t => {
  const f = fixture(t);
  await f.settle();
  f.move();
  f.runFor(200);
  assert.ok(f.rendered.at(-1).pointer.strength > 0);
  f.reducedMotion.matches = true;
  f.controller.setPaused(false);
  assertNeutral(f.rendered.at(-1).pointer);
  assert.equal(f.frames.size, 0);
  f.reducedMotion.matches = false;
  f.controller.setPaused(false);
  assert.equal(f.frames.size, 0);
  f.move();
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
  await f.start();
  assert.equal(f.created, 1);
  assert.equal(f.frames.size, 1);
});

test('디코딩 중 dispose하면 늦은 완료나 재개 요청이 renderer를 생성하지 않는다', async t => {
  const f = fixture(t, { holdImage: true });
  f.controller.setPaused(false);
  f.controller.dispose();
  f.imageLoad.resolve();
  await tick();
  await f.start();
  assert.equal(f.created, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.classes.has('ring-flow-ready'), false);
  assert.equal(f.observers[0].disconnectCount, 1);
});

test('context loss와 렌더 오류는 정적 이미지로 복구하고 후속 입력을 무시한다', async t => {
  for (const failure of ['context', 'render']) {
    const f = fixture(t);
    await f.settle();
    if (failure === 'context') f.loseContext();
    else { f.failRender(); f.resize(); f.runFor(16); }
    assert.equal(f.classes.has('ring-flow-ready'), false);
    assert.equal(f.frames.size, 0);
    assert.equal(f.disposed, 1);
    const count = f.rendered.length;
    await f.start();
    f.move();
    f.runFor(1000);
    assert.equal(f.created, 1);
    assert.equal(f.rendered.length, count);
    assert.equal(f.frames.size, 0);
  }
});

test('정적 resize는 한 프레임으로 합치고 화면 밖 resize는 재개할 때 적용한다', async t => {
  const f = fixture(t);
  await f.settle();
  const count = f.rendered.length;
  f.resize();
  f.resize();
  assert.equal(f.resized, 1);
  assert.equal(f.frames.size, 1);
  f.runFor(16);
  assert.equal(f.resized, 2);
  assert.equal(f.rendered.length, count + 1);
  assert.equal(f.frames.size, 0);
  f.controller.setPaused(true);
  f.resize();
  f.runFor(1000);
  assert.equal(f.resized, 2);
  assert.equal(f.frames.size, 0);
  f.controller.setPaused(false);
  f.runFor(16);
  assert.equal(f.resized, 3);
  assert.equal(f.frames.size, 0);
});

test('포인터 좌표는 캐시하되 scroll과 resize 후 캔버스의 새 위치를 사용한다', async t => {
  const f = fixture(t);
  await f.settle();
  f.move('mouse', 300, 275);
  f.move('pen', 300, 275);
  assert.equal(f.rectReads, 1);
  f.runFor(200);
  f.rect.left = 200;
  f.rect.top = 250;
  f.window.dispatchEvent(new Event('scroll'));
  f.runFor(800);
  assertNeutral(f.rendered.at(-1).pointer);
  assert.equal(f.frames.size, 0);
  f.move('mouse', 600, 400);
  assert.equal(f.rectReads, 2);
  f.runFor(32);
  assert.equal(f.rendered.at(-1).pointer.x, .5);
  assert.equal(f.rendered.at(-1).pointer.y, .5);
  f.hero.dispatchEvent(new Event('pointerleave'));
  f.runFor(800);
  f.rect.width = 400;
  f.resize();
  f.runFor(16);
  f.move('pen', 600, 400);
  assert.equal(f.rectReads, 3);
  f.runFor(32);
  assert.equal(f.rendered.at(-1).pointer.x, 1);
  assert.equal(f.rendered.at(-1).pointer.y, .5);
});

test('dispose는 관찰자·입력 이벤트·renderer를 한 번만 해제한다', async t => {
  const f = fixture(t);
  const subscriptions = [
    [f.hero, 'pointermove'], [f.hero, 'pointerleave'], [f.hero, 'pointercancel'],
    [f.window, 'blur'], [f.window, 'scroll'], [f.canvas, 'webglcontextlost']
  ];
  assert.deepEqual([...f.observers[0].observed], [f.canvas]);
  for (const [target, name] of subscriptions) assert.equal(getEventListeners(target, name).length, 1);
  await f.start();
  f.controller.dispose();
  f.controller.dispose();
  assert.equal(f.observers[0].disconnectCount, 1);
  assert.equal(f.observers[0].observed.size, 0);
  for (const [target, name] of subscriptions) assert.equal(getEventListeners(target, name).length, 0);
  assert.equal(f.disposed, 1);
  assert.equal(f.classes.has('ring-flow-ready'), false);
  assert.equal(f.frames.size, 0);
  const count = f.rendered.length;
  f.resize();
  f.loseContext();
  f.move();
  f.window.dispatchEvent(new Event('scroll'));
  await f.start();
  f.runFor(2000);
  assert.equal(f.created, 1);
  assert.equal(f.disposed, 1);
  assert.equal(f.rendered.length, count);
  assert.equal(f.frames.size, 0);
});
