import test from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { readFile } from "node:fs/promises";
import { createContext, runInContext } from "node:vm";
import { heroHandoffState } from "../dist/hero-handoff.mjs";
import { buildFlowPoints } from "../dist/halftone-renderer.mjs";

const source = (await readFile(new URL("../dist/hero-handoff.mjs", import.meta.url), "utf8"))
  .replace(/^import .*;\r?\n/gm, "")
  .replaceAll("export function", "function");
const tick = () => new Promise((resolve) => setImmediate(resolve));

function fixture(t, { desktop = true, reduced = false } = {}) {
  const frames = new Map(), nodes = [], rendered = [], resized = [], uniforms = [];
  let sequence = 0, created = 0, disposed = 0, decodes = 0, failRender = false, nightDraws = 0;
  const win = new EventTarget();
  Object.assign(win, {
    innerWidth: 1440, innerHeight: 900, scrollY: 0,
    requestAnimationFrame(callback) { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  const query = new EventTarget();
  query.matches = desktop;
  win.matchMedia = () => query;
  const reducedMotion = new EventTarget();
  reducedMotion.matches = reduced;
  function element(tag) {
    const node = new EventTarget(), styles = new Map(), classes = new Set();
    node.tagName = tag;
    node.hidden = false;
    node.dataset = {};
    node.style = {
      setProperty: (key, value) => styles.set(key, value), removeProperty: (key) => styles.delete(key),
      getPropertyValue: (key) => styles.get(key) || "", getPropertyPriority: () => "",
    };
    node.inert = false;
    node.styles = styles;
    node.classList = { add: (value) => classes.add(value), remove: (value) => classes.delete(value), contains: (value) => classes.has(value) };
    node.setAttribute = () => {};
    node.children = [];
    node.append = (...children) => node.children.push(...children);
    node.replaceChildren = (...children) => { node.children = children; };
    node.remove = () => { node.removed = true; };
    node.after = () => {};
    node.getBoundingClientRect = () => ({
      height: node.className === "hero-handoff-runway" ? node.hidden ? 0 : win.innerHeight * 1.8 : win.innerHeight,
    });
    node.getContext = () => ({ drawImage() { nightDraws++; } });
    Object.defineProperty(node, "clientWidth", { get: () => node.hidden ? 0 : win.innerWidth });
    Object.defineProperty(node, "clientHeight", { get: () => node.hidden ? 0 : win.innerHeight });
    node.decode = async () => {
      decodes++;
      if (node.src?.includes("broken")) throw new Error("replacement image unavailable");
    };
    node.complete = true;
    node.naturalWidth = 1920;
    node.naturalHeight = 1080;
    nodes.push(node);
    return node;
  }
  const image = element("img"), originalCanvas = element("canvas"), hero = element("hero"), nav = element("header"), nextPhoto = element("img"), heroArt = element("div"), heroImage = element("img");
  const modelBounds = { left: 40, top: 210, width: 1364, height: 454 };
  originalCanvas.getBoundingClientRect = () => ({ ...modelBounds, top: modelBounds.top - win.scrollY });
  hero.getBoundingClientRect = () => ({ top: -win.scrollY, height: 980 });
  nav.getBoundingClientRect = () => ({ height: 64 });
  heroArt.getBoundingClientRect = () => ({ left: 0, top: -176.4 - win.scrollY, width: win.innerWidth, height: 1156.4 });
  hero.querySelector = (selector) => ({ ".hero-model img": image, ".ring-flow-canvas": originalCanvas, ".hero-art": heroArt, ".hero-art img": heroImage })[selector];
  nextPhoto.src = "assets/rebuild/local-walk.webp";
  const root = new EventTarget();
  root.hidden = false;
  root.body = { append() {} };
  root.createElement = element;
  root.querySelector = (selector) => ({ ".journey-scene .local-photo img": nextPhoto, ".site-header": nav })[selector];
  const context = createContext({
    root, win, hero, reducedMotion,
    createHalftoneRenderer: (canvas, target, options) => {
      assert.equal(target, image);
      assert.equal(canvas.clientWidth, win.innerWidth, "초기 GPU 해상도는 숨김 상태의 1px이 아닌 뷰포트여야 합니다.");
      created++;
      uniforms.push(options);
      return {
        resize(values) { assert.equal(canvas.clientWidth, win.innerWidth); resized.push(values); },
        render(seconds, pointer, handoff) {
          if (failRender) throw new Error("GPU unavailable");
          rendered.push({ seconds, pointer, handoff });
        },
        dispose() { disposed++; },
        getStats() { return { flowPointCount: 22000 }; },
      };
    },
  });
  runInContext(source, context);
  const controller = runInContext("createHeroHandoff({ hero, reducedMotion, root, win })", context);
  t.after(() => controller.dispose());
  const overlayCanvas = nodes.find((node) => node.className === "hero-handoff-canvas");
  const surface = nodes.find((node) => node.className === "hero-handoff-surface");
  const night = nodes.find((node) => node.className === "hero-handoff-night");
  const runway = nodes.find((node) => node.className === "hero-handoff-runway");
  function advance() {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(0));
  }
  return {
    controller, hero, root, win, query, reducedMotion, overlayCanvas, surface, night, runway, nav, nextPhoto, rendered, resized, uniforms, frames,
    get created() { return created; }, get disposed() { return disposed; }, get decodes() { return decodes; },
    get nightDraws() { return nightDraws; },
    advance,
    async start() { controller.setPaused(false); advance(); await tick(); },
    scroll(y) { win.scrollY = y; win.dispatchEvent(new Event("scroll")); advance(); },
    failRender() { failRender = true; },
  };
}

test("첫 화면과 완전히 넘어간 위치는 출구 전환을 활성화하지 않는다", () => {
  for (const y of [0, 28, 1044, 1800]) assert.equal(heroHandoffState(y, 0, 980, 900, 64).active, false);
  assert.equal(heroHandoffState(0, 0, 980, 900, 64).copyOpacity, 1);
});

test("출구 흐름은 실제 로고 점의 anchor·크기·alpha를 보존하고 지연 방출을 곡선 분포로 만든다", () => {
  const logo = new Float32Array([
    .2, .3, 1, .1, .4, .8, 5, .1,
    .4, .6, 1, .8, .9, 1, 5, .2,
    .8, .3, 1, .3, .5, .5, 4, .3,
  ]);
  let reference;
  for (const [width, height] of [[1000, 701], [1280, 720], [1440, 900], [1920, 1080]]) {
    const cloud = buildFlowPoints(width, height, logo);
    assert.equal(cloud.count, logo.length / 8 * 2);
    assert.equal(cloud.values.length, cloud.count * 11);
    const targets = [];
    for (let point = 0; point < cloud.count; point++) {
      const offset = point * 11, source = point % 3 * 8;
      assert.deepEqual([...cloud.values.slice(offset, offset + 8)], [...logo.slice(source, source + 8)], "랜덤 색이나 불투명 alpha로 바꾸지 않고 각 실제 점의 정체성을 유지해야 합니다.");
      assert.equal(cloud.values[offset + 10], Math.floor(point / 3));
      targets.push([cloud.values[offset + 8], cloud.values[offset + 9]]);
    }
    assert.equal(new Set(targets.map((target) => target.join(","))).size, cloud.count);
    if (reference) assert.deepEqual(cloud.values, reference, "뷰포트 면적에 따라 점 수나 원본 점 크기가 늘어나지 않아야 합니다.");
    reference = cloud.values;
  }
  assert.throws(() => buildFlowPoints(1280, 720, []), /decoded halftone/);
});

test("출구 상태는 역방향·직접 복원에서도 같은 스크롤 위치에 같은 결과를 준다", () => {
  const reference = heroHandoffState(580, 0, 980, 900, 64);
  heroHandoffState(1000, 0, 980, 900, 64);
  assert.deepEqual(heroHandoffState(580, 0, 980, 900, 64), reference);
  assert.equal(reference.copyOpacity, 0);
  assert.ok(reference.photoOpacity > 0 && reference.photoOpacity < 1);
});

test("긴 runway에서 원형 점 흐름과 전체 사진은 천천히 교차하며 nav 아래에 끝 정렬한다", () => {
  const atProgress = (p) => heroHandoffState(28 + p * 2636, 0, 980, 900, 64, 1620);
  assert.equal(atProgress(0).nightOpacity, 0);
  for (const p of [0.35, 0.45, 0.60]) assert.equal(atProgress(p).flowing, true);
  assert.equal(atProgress(0.35).photoOpacity, 0);
  assert.ok(atProgress(0.60).photoOpacity > 0 && atProgress(0.60).photoOpacity < 1);
  assert.equal(atProgress(0.76).photoOpacity, 1);
  assert.equal(atProgress(0.65).nightOpacity, 1, "사진이 완전히 보이기 전까지 동일 야경이 배경을 유지해야 합니다.");
  assert.equal(atProgress(0.96).photoOpacity, 1);
  assert.equal(atProgress(0.96).nightOpacity, 0);
  assert.equal(atProgress(0.96).photoTop, 64);
  assert.equal(atProgress(0.975).navOpacity, 0);
  assert.equal(atProgress(1).photoOpacity, 0);
  assert.equal(atProgress(1).navOpacity, 1);
  const oneViewport = heroHandoffState(900, 0, 980, 900, 64, 1620);
  assert.ok(oneViewport.progress < 0.35, "한 뷰포트 스크롤로 사진 reveal까지 뛰어넘지 않아야 합니다.");
});

test("야경 고정면과 nav는 복원되며 BFCache pause 중 runway 높이는 유지한다", async (t) => {
  const f = fixture(t);
  await f.start();
  assert.equal(f.night.hidden, true);
  assert.equal(f.runway.hidden, false);
  assert.equal(f.nav.inert, false);
  assert.equal(f.nav.styles.size, 0);
  f.scroll(600);
  assert.equal(f.night.hidden, false);
  assert.equal(f.night.styles.get("--handoff-night-opacity"), "1");
  assert.equal(f.nightDraws, 1);
  assert.equal(f.nav.inert, true);
  assert.equal(f.nav.styles.get("--handoff-nav-opacity"), "0");
  f.controller.setPaused(true);
  assert.equal(f.night.hidden, true);
  assert.equal(f.runway.hidden, false);
  assert.equal(f.nav.inert, false);
  assert.equal(f.nav.styles.size, 0);
  assert.equal(f.nav.classList.contains("hero-handoff-nav"), false);
  f.nav.inert = true;
  f.nav.style.setProperty("--handoff-nav-opacity", "0.4");
  f.controller.setPaused(false);
  f.advance();
  f.scroll(2664);
  assert.equal(f.night.hidden, true);
  assert.equal(f.nav.inert, true, "미리 설정된 inert는 종료 뒤에도 보존해야 합니다.");
  assert.equal(f.nav.styles.get("--handoff-nav-opacity"), "0.4");
  f.scroll(600);
  f.controller.dispose();
  assert.equal(f.night.removed, true);
  assert.equal(f.runway.removed, true);
  assert.equal(f.nav.inert, true);
  assert.equal(f.nav.styles.get("--handoff-nav-opacity"), "0.4");
});

test("모바일·짧은 데스크톱과 모션 감소는 출구 이미지 디코딩·GPU·RAF를 시작하지 않는다", async (t) => {
  for (const options of [{ desktop: false }, { reduced: true }]) {
    const f = fixture(t, options);
    await f.start();
    f.scroll(500);
    assert.equal(f.decodes, 0);
    assert.equal(f.created, 0);
    assert.equal(f.frames.size, 0);
    assert.equal(f.overlayCanvas.hidden, true);
    assert.equal(f.runway.hidden, true);
    assert.equal(f.hero.classList.contains("hero-handoff-active"), false);
  }
});

test("기존 원형은 첫 화면에서 그대로이며 실제 같은 하프톤 크기를 투영해 한 프레임씩 그린다", async (t) => {
  const f = fixture(t);
  await f.start();
  assert.equal(f.created, 1);
  assert.equal(f.overlayCanvas.hidden, true);
  assert.equal(f.rendered.length, 0);
  assert.equal(f.uniforms[0].sampleWidth, 1364 / 1.12);
  f.scroll(41);
  assert.equal(f.overlayCanvas.hidden, false);
  assert.equal(f.hero.classList.contains("hero-handoff-active"), true);
  assert.equal(f.frames.size, 0, "스크롤 정지 뒤 연속 RAF는 남지 않아야 합니다.");
  const frame = f.rendered.at(-1);
  assert.equal(frame.seconds, 0.9);
  assert.equal(frame.pointer.strength, 0);
  assert.equal(frame.handoff.projection.left, 40 / 1440);
  assert.equal(frame.handoff.projection.top, (210 - 41) / 900);
  assert.equal(frame.handoff.projection.width, 1364 / 1440);
  assert.equal(f.uniforms[0].exitFlow, true);
  assert.equal(f.overlayCanvas.dataset.flowPoints, "22000");
  f.scroll(1000);
  assert.equal(f.overlayCanvas.dataset.flowing, "true");
  f.scroll(0);
  assert.equal(f.overlayCanvas.hidden, true);
  assert.equal(f.runway.hidden, false);
  assert.equal(f.hero.classList.contains("hero-handoff-active"), false);
  assert.equal(f.hero.styles.size, 0);
});

test("BFCache 일시정지와 숨김 이후 복귀는 현재 위치를 다시 측정하고 같은 입자 상태로 복원한다", async (t) => {
  const f = fixture(t);
  await f.start();
  f.scroll(550);
  const expected = f.rendered.at(-1).handoff;
  f.controller.setPaused(true);
  assert.equal(f.overlayCanvas.hidden, true);
  f.scroll(700);
  const count = f.rendered.length;
  f.win.scrollY = 550;
  f.controller.setPaused(false);
  f.advance();
  assert.equal(f.created, 1);
  assert.equal(f.rendered.length, count + 1);
  assert.deepEqual(f.rendered.at(-1).handoff, expected);
  f.root.hidden = true;
  f.root.dispatchEvent(new Event("visibilitychange"));
  assert.equal(f.overlayCanvas.hidden, true);
  assert.equal(f.frames.size, 0);
});

test("모션 설정 변경과 GPU 실패는 원래 히어로로 복구하며 출구 overlay를 남기지 않는다", async (t) => {
  const f = fixture(t);
  await f.start();
  f.scroll(420);
  f.reducedMotion.matches = true;
  f.reducedMotion.dispatchEvent(new Event("change"));
  assert.equal(f.overlayCanvas.hidden, true);
  assert.equal(f.hero.styles.size, 0);
  f.reducedMotion.matches = false;
  f.reducedMotion.dispatchEvent(new Event("change"));
  f.advance();
  f.failRender();
  f.scroll(500);
  assert.equal(f.disposed, 1);
  assert.equal(f.runway.hidden, true);
  assert.equal(f.overlayCanvas.hidden, true);
  assert.equal(f.hero.classList.contains("hero-handoff-active"), false);
  const count = f.rendered.length;
  f.scroll(600);
  assert.equal(f.rendered.length, count);
});

test("여행 사진 source가 늦게 고해상도로 교체되어도 decode 뒤 같은 사진을 원자적으로 이어 받는다", async (t) => {
  const f = fixture(t);
  await f.start();
  f.scroll(600);
  const previous = f.surface.children[0];
  assert.equal(previous.src, "assets/rebuild/local-walk.webp");
  f.nextPhoto.currentSrc = "assets/desktop-polish/local-walk-native.webp";
  f.nextPhoto.dispatchEvent(new Event("load"));
  assert.equal(f.surface.children[0], previous, "새 사진 decode 이전에는 기존 사진이 유지되어야 합니다.");
  await tick();
  f.advance();
  assert.equal(f.surface.children[0].src, f.nextPhoto.currentSrc);
  assert.equal(f.overlayCanvas.hidden, false);
  assert.equal(f.created, 1, "사진 교체는 GPU를 다시 생성하지 않습니다.");
  const current = f.surface.children[0];
  f.nextPhoto.currentSrc = "assets/desktop-polish/broken.webp";
  f.nextPhoto.dispatchEvent(new Event("load"));
  await tick();
  assert.equal(f.surface.children[0], current);
  assert.equal(f.disposed, 0);
});

test("고해상도 decode 중 원본으로 되돌아오면 늦은 완료가 새 source를 덮어쓰지 않는다", async (t) => {
  const f = fixture(t);
  await f.start();
  const original = f.surface.children[0];
  f.nextPhoto.currentSrc = "assets/desktop-polish/local-walk-native.webp";
  f.nextPhoto.dispatchEvent(new Event("load"));
  f.nextPhoto.currentSrc = original.src;
  f.nextPhoto.dispatchEvent(new Event("load"));
  await tick();
  assert.equal(f.surface.children[0], original);
});

test("히어로 가시 영역이 끝난 뒤에도 다음 사진이 nav 아래에 안착할 때까지 출구를 유지한다", async (t) => {
  const f = fixture(t);
  await f.start();
  f.scroll(980);
  assert.equal(f.overlayCanvas.hidden, false);
  assert.ok(f.rendered.at(-1).handoff.progress < 1);
  f.scroll(2664);
  assert.equal(f.overlayCanvas.hidden, true);
  assert.equal(f.surface.hidden, true);
});

test("dispose는 overlay·입력·RAF·GPU를 한 번만 정리한다", async (t) => {
  const f = fixture(t);
  await f.start();
  f.scroll(420);
  f.win.dispatchEvent(new Event("scroll"));
  assert.equal(f.frames.size, 1);
  f.controller.dispose();
  f.controller.dispose();
  assert.equal(f.disposed, 1);
  assert.equal(f.frames.size, 0);
  assert.equal(f.overlayCanvas.removed, true);
  assert.equal(f.surface.removed, true);
  assert.equal(getEventListeners(f.win, "scroll").length, 0);
  assert.equal(getEventListeners(f.query, "change").length, 0);
  assert.equal(f.hero.styles.size, 0);
});
