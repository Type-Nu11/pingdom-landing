import test from "node:test";
import assert from "node:assert/strict";
import {
  createDesktopPolish,
  entryState,
  journeyPolishState,
  merchantDesktopState,
  platformCardsState,
  webEntranceState,
} from "../dist/desktop-polish.mjs";
import { sequenceState } from "../dist/desktop-motion.mjs";

const states = [entryState, journeyPolishState, webEntranceState, merchantDesktopState, platformCardsState];
const numbers = (value) => typeof value === "number" ? [value] : Object.values(value).flatMap(numbers);

test("진행도 범위를 벗어나도 각 진입 상태는 시작점·끝점으로 제한된다", () => {
  for (const state of states) {
    assert.deepEqual(state(-1), state(0));
    assert.deepEqual(state(2), state(1));
  }
});

test("본문은 제목보다 늦게 등장하고 정착 후 원래 읽기 위치를 유지한다", () => {
  const middle = entryState(0.2);
  assert.ok(middle.bodyOpacity < middle.opacity);
  assert.ok(middle.cut > 0 && middle.cut < 100);
  assert.deepEqual(entryState(1), { opacity: 1, y: 0, cut: 0, bodyY: 0, bodyOpacity: 1 });
});

test("동네 사진 프레임을 줄여도 내부 이미지의 가로·세로 합성 배율이 같다", () => {
  for (let p = 0; p <= 1; p += 0.005) {
    const state = journeyPolishState(p);
    assert.ok(Math.abs(state.width * state.innerX - state.height * state.innerY) < 1e-10);
  }
  const initial = journeyPolishState(0), final = journeyPolishState(1);
  assert.equal(initial.width, 1);
  assert.equal(initial.height, 1);
  assert.equal(initial.phoneOpacity, 0);
  assert.equal(initial.copyOpacity, 0);
  assert.ok(Math.abs(final.width - 0.37) < 1e-10);
  assert.ok(Math.abs(final.height - 0.74) < 1e-10);
  assert.equal(final.phoneRY, 0);
  assert.equal(final.phoneRZ, 0);
  assert.equal(final.phoneScale, 1);
  assert.equal(final.copyOpacity, 1);
});

test("상점주 웹은 시작부터 보이고 작은 기울기만 정면으로 정착한다", () => {
  const initial = webEntranceState(0), final = webEntranceState(1);
  assert.ok(initial.rx > 0 && initial.rx <= 3);
  assert.equal(initial.ry, 0);
  assert.equal(initial.rz, 0);
  assert.ok(initial.scale >= .98 && initial.scale < 1);
  assert.equal(initial.opacity, 1);
  assert.deepEqual(final, { x: 0, y: 0, rx: 0, ry: 0, rz: 0, scale: 1, opacity: 1 });
});

test("플랫폼 파노라마는 이미지 경계를 넓히며 세 역할을 같은 프레임에 정착시킨다", () => {
  const initial = platformCardsState(0);
  assert.equal(initial.prologueOpacity, 0);
  assert.equal(initial.headingOpacity, 1);
  assert.ok(initial.cards.every((card) => card.opacity === 1 && card.y === 0 && card.cut === 0));
  assert.ok(initial.cards[0].width > initial.cards[1].width && initial.cards[1].width > initial.cards[2].width);
  const middle = platformCardsState(0.2);
  assert.ok(middle.cards[0].width < initial.cards[0].width);
  assert.ok(middle.cards[1].width > initial.cards[1].width && middle.cards[2].width > initial.cards[2].width);
  for (let p = 0; p <= 1; p += .005) {
    const state = platformCardsState(p);
    assert.ok(Math.abs(state.cards.reduce((sum, card) => sum + card.width, 0) - 1) < 1e-12);
    assert.ok(state.cards.every(card => card.width > 0));
  }
  const reading = platformCardsState(0.6);
  assert.equal(reading.prologueOpacity, 0);
  assert.equal(reading.headingOpacity, 1);
  assert.ok(reading.cards.every((card) => card.opacity === 1 && card.y === 0 && card.ry === 0));
  assert.ok(reading.cards.every((card) => card.cut === 0 && card.photoScale === 1 && card.photoY === 0));
  assert.ok(reading.cards.every(card => card.width === 1 / 3 && card.copyOpacity === 1));
});

test("순방향·역방향 계산은 결정적이고 상태값이 유한하다", () => {
  const progress = Array.from({ length: 1001 }, (_, i) => i / 1000);
  for (const state of states) {
    const forward = progress.map((p) => state(p));
    const reverse = [...progress].reverse().map((p) => state(p)).reverse();
    assert.deepEqual(forward, reverse);
    assert.ok(forward.every((value) => numbers(value).every(Number.isFinite)));
  }
});

class Target {
  listeners = new Map();
  addEventListener(type, callback) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(callback);
    this.listeners.set(type, set);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type, details = {}) {
    const event = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...details };
    for (const callback of [...(this.listeners.get(type) ?? [])]) callback(event);
    return event;
  }
  count(type) { return type ? this.listeners.get(type)?.size ?? 0 : [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}

function element() {
  const e = Object.assign(new Target(), { dataset: {}, attributes: new Map(), values: new Map([["color", "inherit"]]), classes: new Set(), inert: false, tagName: "IMG" });
  e.getAttribute = (name) => e.attributes.get(name) ?? null;
  e.setAttribute = (name, value) => e.attributes.set(name, String(value));
  e.removeAttribute = (name) => e.attributes.delete(name);
  e.closest = () => null;
  e.classList = {
    add: (...names) => names.forEach((name) => e.classes.add(name)),
    remove: (...names) => names.forEach((name) => e.classes.delete(name)),
    toggle: (name, active) => active ? e.classes.add(name) : e.classes.delete(name),
  };
  e.style = {
    getPropertyValue: (name) => e.values.get(name) ?? "",
    setProperty: (name, value) => e.values.set(name, String(value)),
    removeProperty: (name) => e.values.delete(name),
  };
  return e;
}

function fixture({ y = 6000, desktop = true, reduced = false, optionalApis = true, originalPictureLoading = "lazy", sourceInProduct = true, merchantV2 = false, visitCount = 3, dataVisit = false, nativeVisit = false } = {}) {
  const win = Object.assign(new Target(), { innerWidth: 1440, innerHeight: 900, scrollY: y });
  const media = {
    desktop: Object.assign(new Target(), { matches: desktop }),
    reduced: Object.assign(new Target(), { matches: reduced }),
  };
  win.matchMedia = (query) => query.includes("reduced-motion") ? media.reduced : media.desktop;
  const frames = new Map();
  let nextFrame = 0;
  win.requestAnimationFrame = (callback) => { frames.set(++nextFrame, callback); return nextFrame; };
  win.cancelAnimationFrame = (id) => frames.delete(id);
  const flush = () => {
    let ticks = 0;
    while (frames.size) {
      assert.ok(++ticks < 20, "정지 화면에서 무한 프레임이 예약되면 안 됩니다.");
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback());
    }
  };
  const scrollCalls = [];
  win.scrollTo = (options) => { scrollCalls.push(options); win.scrollY = options.top; };
  const root = Object.assign(new Target(), { hidden: false });
  root.documentElement = element();
  root.documentElement.scrollHeight = 20000;
  let reads = 0;
  const header = { getBoundingClientRect: () => { reads++; return { height: 72 }; } };
  const layout = (top, height = 300, width = 1440) => {
    const e = element();
    e.getBoundingClientRect = () => {
      reads++;
      // 진입 모션이 측정에 섞이는 실제 DOM 상황을 재현합니다.
      const visualY = parseFloat(e.values.get("--polish-copy-y") ?? 0);
      return { top: top - win.scrollY + visualY, height, width };
    };
    return e;
  };
  const journey = layout(1000, 2205), visit = layout(4000, visitCount * 828), platform = layout(7000, 1890), merchant = layout(10000, 2200), web = layout(10250, 220);
  journey.values.set("--polish-photo-x", "17px");
  platform.setAttribute("aria-labelledby", "platform-title");
  merchant.setAttribute("aria-labelledby", "merchant-title");
  const merchantDesktop = merchantV2 ? element() : null;
  const merchantEventImage = Object.assign(element(), { complete: true, naturalWidth: 1864 });
  const merchantScreens = merchantV2 ? [element(), element()] : [];
  merchantScreens.forEach(screen => { screen.querySelector = () => merchantEventImage; });
  const merchantCopies = merchantV2 ? [element(), element(), element()] : [];
  const oldMerchant = merchantV2 ? [element(), element()] : [];
  const board = element(), oldBoard = element(), oldCurtain = element();
  const visitCopies = Array.from({ length: visitCount }, (_, i) => layout(4000 + i * 828, 220));
  const visitProducts = Array.from({ length: visitCount }, () => element());
  visit.querySelectorAll = selector => !dataVisit ? [] : selector === '[data-visit-product]' ? visitProducts : selector === '[data-visit-copy]' ? visitCopies : [];
  const merchantBeats = [web, layout(11100, 220)];
  const copies = [...visitCopies, ...merchantBeats];
  const cards = Array.from({ length: 3 }, () => element());
  const image = element();
  image.setAttribute("src", "assets/map-preview.webp");
  image.setAttribute("loading", "lazy");
  image.dataset.desktopHq = "assets/desktop-polish/map.webp";
  const pictureImage = element();
  if (originalPictureLoading !== null) pictureImage.setAttribute("loading", originalPictureLoading);
  const source = element();
  source.tagName = "SOURCE";
  source.setAttribute("srcset", "assets/booking-preview.webp");
  source.dataset.desktopHq = "assets/desktop-polish/booking.webp";
  source.closest = (selector) => selector === "picture" ? { querySelector: () => pictureImage } : sourceInProduct ? {} : null;
  const newImage = element();
  newImage.dataset.desktopHq = "assets/desktop-polish/new.webp";
  const nativeVisitImages = nativeVisit ? visitProducts.map((product, i) => {
    const img = element();
    img.setAttribute('src', `assets/original-product-${i}.webp`);
    if (i !== 2) img.setAttribute('loading', i === 1 ? '' : 'lazy');
    img.dataset.desktopHq = `assets/full-product-${i}.webp`;
    img.closest = selector => selector === '.visit-grid' ? visit : null;
    return img;
  }) : [];
  const assets = [image, source, newImage, ...nativeVisitImages];
  const queries = new Map([
    [".site-header", header], [".journey-scene", journey], [".visit-grid", visit],
    [".merchant-section", merchant], [".merchant-register-copy", web], [".merchant-desktop", merchantDesktop],
    [".platform-scene", platform], [".platform-triptych", board], [".platform-board", oldBoard], [".platform-curtain", oldCurtain],
  ]);
  root.querySelector = (selector) => queries.get(selector) ?? null;
  root.querySelectorAll = (selector) => selector === "[data-desktop-hq]" ? assets : selector === "[data-platform-card]" ? cards : selector === ".visit-grid .card-copy, .merchant-beat" ? copies : selector === ".merchant-beat" ? merchantBeats : selector === "[data-merchant-screen]" ? merchantScreens : selector === "[data-merchant-copy]" ? merchantCopies : selector === ".merchant-section > .merchant-copy, .merchant-section > .merchant-product" ? oldMerchant : [];
  const observers = [];
  let resolveFonts;
  if (optionalApis) {
    root.fonts = { ready: new Promise((resolve) => { resolveFonts = resolve; }) };
    win.ResizeObserver = class {
      connected = true;
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.connected = false; }
    };
  }
  const controller = createDesktopPolish({ root, win });
  const jump = (value) => { win.scrollY = value; win.emit("scroll"); flush(); };
  const wheel = (delta, details = {}) => win.emit("wheel", { deltaX: 0, deltaY: delta, deltaMode: 0, ctrlKey: false, ...details });
  const snapshot = () => [journey, visit, merchant, board, ...copies, ...cards].map((e) => Object.fromEntries(e.values));
  return { win, root, media, frames, controller, flush, jump, wheel, scrollCalls, journey, visit, visitCopies, visitProducts, nativeVisitImages, platform, merchant, merchantDesktop, merchantEventImage, merchantScreens, merchantCopies, oldMerchant, board, oldBoard, oldCurtain, copies, cards, assets, image, source, newImage, pictureImage, observers, resolveFonts, snapshot, reads: () => reads };
}

test("PC에서는 native 자산을 사용하고 기존 플랫폼 접근성 제목을 새 구성에 연결한다", () => {
  const f = fixture();
  assert.equal(f.image.getAttribute("src"), f.image.dataset.desktopHq);
  assert.equal(f.source.getAttribute("srcset"), f.source.dataset.desktopHq);
  assert.ok(f.root.documentElement.classes.has("desktop-polish"));
  assert.ok(f.root.documentElement.classes.has("desktop-polish-motion"));
  assert.equal(f.platform.getAttribute("aria-labelledby"), "platform-desktop-title");
  assert.equal(f.oldBoard.inert, true);
  assert.equal(f.oldCurtain.inert, true);
  f.controller.dispose();
});

test("narrow 또는 짧은 화면은 새 레이어·자산·스크롤 제어를 활성화하지 않는다", () => {
  const f = fixture({ desktop: false });
  assert.equal(f.image.getAttribute("src"), "assets/map-preview.webp");
  assert.equal(f.source.getAttribute("srcset"), "assets/booking-preview.webp");
  assert.equal(f.newImage.getAttribute("src"), null);
  assert.equal(f.oldBoard.inert, false);
  assert.equal(f.platform.getAttribute("aria-labelledby"), "platform-title");
  assert.equal(f.root.documentElement.classes.size, 0);
  assert.equal(f.wheel(20000).defaultPrevented, false);
  assert.equal(f.scrollCalls.length, 0);
  f.controller.dispose();
});

test("동작 줄이기에서는 새 PC 구성을 제공하되 모션·플랫폼 강제 정지를 적용하지 않는다", () => {
  const f = fixture({ reduced: true });
  assert.ok(f.root.documentElement.classes.has("desktop-polish"));
  assert.equal(f.root.documentElement.classes.has("desktop-polish-motion"), false);
  assert.equal(f.platform.dataset.polishProgress, undefined);
  assert.equal(f.journey.values.get("--polish-photo-x"), "17px");
  assert.equal(f.wheel(20000).defaultPrevented, false);
  f.jump(16000);
  assert.equal(f.win.scrollY, 16000);
  assert.equal(f.scrollCalls.length, 0);
  f.controller.dispose();
});

test("플랫폼은 wheel·키·터치와 큰 이동을 가로채지 않고 순방향·역방향 상태를 갱신한다", () => {
  const f = fixture();
  for (const type of ["wheel", "keydown", "touchstart", "touchmove"]) assert.equal(f.win.count(type), 0);
  assert.equal(f.wheel(20000).defaultPrevented, false);
  assert.equal(f.win.emit("keydown", { key: "End" }).defaultPrevented, false);
  assert.equal(f.win.emit("touchmove", { touches: [{ clientY: 0 }] }).defaultPrevented, false);
  f.jump(16000);
  assert.equal(f.win.scrollY, 16000);
  assert.ok(f.cards.every(card => card.values.get("--platform-copy-opacity") === "1"));
  f.jump(6500);
  assert.equal(f.win.scrollY, 6500);
  assert.ok(f.cards.every(card => card.values.get("--platform-copy-opacity") === "0"));
  assert.equal(f.scrollCalls.length, 0);
  f.controller.dispose();
});

test("확대 gesture와 가로 wheel을 가로채지 않는다", () => {
  const f = fixture();
  assert.equal(f.wheel(20000, { ctrlKey: true }).defaultPrevented, false);
  assert.equal(f.wheel(20000, { deltaX: 30000 }).defaultPrevented, false);
  assert.equal(f.scrollCalls.length, 0);
  f.controller.dispose();
});

test("중간 지점 새로고침은 현재 위치를 유지하고 플랫폼을 다시 정지시키지 않는다", () => {
  const f = fixture({ y: 16000 });
  assert.equal(f.wheel(1000).defaultPrevented, false);
  f.jump(16500);
  assert.equal(f.win.scrollY, 16500);
  assert.equal(f.scrollCalls.length, 0);
  f.controller.dispose();
});

test("버튼·입력·링크에 초점이 있는 키 입력을 페이지 이동으로 가로채지 않는다", () => {
  const f = fixture();
  const target = { closest: () => ({}) };
  assert.equal(f.win.emit("keydown", { key: "End", target }).defaultPrevented, false);
  assert.equal(f.scrollCalls.length, 0);
  f.controller.dispose();
});

test("hash·popstate 이동 직후에는 사용자가 선택한 목적지로 이동하도록 허용한다", (t) => {
  const clock = { now: 1000 };
  t.mock.method(Date, "now", () => clock.now);
  for (const event of ["hashchange", "popstate", "pingdom:navigate"]) {
    const f = fixture();
    f.win.emit(event);
    f.jump(16000);
    assert.equal(f.win.scrollY, 16000);
    assert.equal(f.scrollCalls.length, 0);
    f.controller.dispose();
  }
});

test("이미지/source 오류는 기존 원본으로 복구하고 이후 refresh에서 실패한 HQ 자산을 재요청하지 않는다", () => {
  const f = fixture();
  f.image.emit("error");
  f.pictureImage.emit("error");
  assert.equal(f.image.getAttribute("src"), "assets/map-preview.webp");
  assert.equal(f.source.getAttribute("srcset"), "assets/booking-preview.webp");
  f.controller.refresh();
  f.flush();
  assert.equal(f.image.getAttribute("src"), "assets/map-preview.webp");
  assert.equal(f.source.getAttribute("srcset"), "assets/booking-preview.webp");
  f.controller.dispose();
});

test("새 프레임에서 레이아웃을 재측정하지 않고 refresh에서도 모션 이동량이 좌표에 누적되지 않는다", () => {
  const f = fixture({ y: 3950 });
  const reads = f.reads();
  f.jump(4100);
  assert.equal(f.reads(), reads);
  const before = f.snapshot();
  f.controller.refresh();
  f.flush();
  assert.deepEqual(f.snapshot(), before);
  assert.ok(f.reads() > reads);
  f.controller.dispose();
});

test("숨겨진 문서는 페인트 예약을 취소하고 돌아올 때 현재 위치를 복원한다", () => {
  const f = fixture();
  f.win.emit("scroll");
  assert.equal(f.frames.size, 1);
  f.root.hidden = true;
  f.root.emit("visibilitychange");
  assert.equal(f.frames.size, 0);
  f.win.scrollY = 6300;
  f.win.emit("scroll");
  assert.equal(f.frames.size, 0);
  f.root.hidden = false;
  f.root.emit("visibilitychange");
  f.flush();
  assert.ok(f.journey.dataset.polishProgress);
  f.controller.dispose();
});

test("화면을 줄이면 자산·스타일·inert·접근성 이름·정지 상태를 모두 복구한다", () => {
  const f = fixture();
  f.wheel(20000);
  f.media.desktop.matches = false;
  f.media.desktop.emit("change");
  f.flush();
  assert.equal(f.root.documentElement.classes.size, 0);
  assert.equal(f.image.getAttribute("src"), "assets/map-preview.webp");
  assert.equal(f.source.getAttribute("srcset"), "assets/booking-preview.webp");
  assert.equal(f.newImage.getAttribute("src"), null);
  assert.equal(f.oldBoard.inert, false);
  assert.equal(f.oldCurtain.inert, false);
  assert.equal(f.platform.getAttribute("aria-labelledby"), "platform-title");
  assert.equal(f.platform.dataset.scrollStop, undefined);
  assert.equal(f.journey.values.get("--polish-photo-x"), "17px");
  assert.deepEqual([...f.board.values], [["color", "inherit"]]);
  assert.equal(f.wheel(20000).defaultPrevented, false);
  f.controller.dispose();
});

test("동작 줄이기 설정을 켜면 모션 스타일을 즉시 제거한다", () => {
  const f = fixture();
  f.wheel(20000);
  f.media.reduced.matches = true;
  f.media.reduced.emit("change");
  f.flush();
  assert.equal(f.root.documentElement.classes.has("desktop-polish-motion"), false);
  assert.equal(f.journey.values.get("--polish-photo-x"), "17px");
  assert.equal(f.wheel(20000).defaultPrevented, false);
  f.controller.dispose();
});

test("모션 복구는 현재 읽던 위치를 유지한다", () => {
  const f = fixture({ reduced: true });
  f.jump(16000);
  f.media.reduced.matches = false;
  f.media.reduced.emit("change");
  f.flush();
  assert.equal(f.wheel(20000).defaultPrevented, false);
  assert.equal(f.scrollCalls.length, 0);
  f.controller.dispose();
});

test("PC 제품 SOURCE의 실제 IMG만 eager로 전환하고 일반 IMG의 lazy는 유지한다", () => {
  const f = fixture();
  assert.equal(f.pictureImage.getAttribute("loading"), "eager");
  assert.equal(f.image.getAttribute("loading"), "lazy");
  assert.equal(f.newImage.getAttribute("loading"), null);
  assert.equal(f.source.getAttribute("loading"), null);
  f.controller.dispose();
});

test("다섯 data 제품의 전환 수와 설명 전체를 보간하며 읽기 정지에서는 회전을 남기지 않는다", () => {
  const f = fixture({ visitCount: 5, dataVisit: true });
  for (const progress of [.06, .14, .28, .36, .5, .61, .72, .85, .94]) {
    f.visit.dataset.desktopProgress = String(progress);
    f.jump(6000);
    const expectedTurn = (1 - Math.max(...sequenceState(progress, 5))) * 9;
    assert.ok(Math.abs(parseFloat(f.visit.values.get('--polish-visit-ry')) - expectedTurn) < 1e-10);
  }
  assert.ok(f.visitCopies.every(copy => copy.values.has('--polish-copy-opacity')));
  assert.ok(f.visitCopies.every(copy => copy.values.has('--polish-body-opacity')));
  f.controller.dispose();
  assert.ok(f.visitCopies.every(copy => [...copy.values.keys()].every(key => key === 'color')));
});

test("다섯 단일 제품 IMG를 eager로 준비하고 늦은 load·원본 fallback·loading 복원을 유지한다", () => {
  const f = fixture({ visitCount: 5, dataVisit: true, nativeVisit: true });
  assert.equal(f.nativeVisitImages.length, 5);
  assert.ok(f.nativeVisitImages.every(image => image.getAttribute('loading') === 'eager'));
  assert.ok(f.nativeVisitImages.every(image => image.getAttribute('src') === image.dataset.desktopHq));
  assert.equal(f.image.getAttribute('loading'), 'lazy');
  const reads = f.reads();
  f.nativeVisitImages.forEach(image => image.emit('load'));
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.ok(f.reads() > reads);
  f.nativeVisitImages[0].emit('error');
  f.controller.refresh(); f.flush();
  assert.equal(f.nativeVisitImages[0].getAttribute('src'), 'assets/original-product-0.webp');
  f.media.desktop.matches = false; f.media.desktop.emit('change'); f.flush();
  assert.deepEqual(f.nativeVisitImages.map(image => image.getAttribute('loading')), ['lazy', '', null, 'lazy', 'lazy']);
  f.nativeVisitImages.forEach((image, index) => assert.equal(image.getAttribute('src'), `assets/original-product-${index}.webp`));
  f.controller.dispose();
});

test("narrow 초기 상태와 제품 밖 SOURCE의 IMG loading은 변경하지 않는다", () => {
  for (const options of [{ desktop: false }, { sourceInProduct: false }]) {
    const f = fixture(options);
    assert.equal(f.pictureImage.getAttribute("loading"), "lazy");
    f.controller.dispose();
  }
});

test("SOURCE 대신 실제 picture IMG의 load에서 좌표와 읽기 상태를 갱신한다", () => {
  const f = fixture();
  assert.equal(f.source.count("load"), 0);
  assert.equal(f.pictureImage.count("load"), 1);
  const reads = f.reads();
  f.pictureImage.emit("load");
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.ok(f.reads() > reads);
  f.controller.dispose();
});

test("narrow/clear와 dispose는 loading의 lazy·빈 값·미지정 상태를 정확히 복구한다", () => {
  for (const originalPictureLoading of ["lazy", "", null]) {
    const f = fixture({ originalPictureLoading });
    assert.equal(f.pictureImage.getAttribute("loading"), "eager");
    f.media.desktop.matches = false;
    f.media.desktop.emit("change");
    f.flush();
    assert.equal(f.pictureImage.getAttribute("loading"), originalPictureLoading);
    f.media.desktop.matches = true;
    f.media.desktop.emit("change");
    f.flush();
    assert.equal(f.pictureImage.getAttribute("loading"), "eager");
    f.controller.dispose();
    assert.equal(f.pictureImage.getAttribute("loading"), originalPictureLoading);
  }
});

test("BFCache stop/start는 eager 상태를 보존하고 실제 IMG 리스너를 중복 등록하지 않는다", () => {
  const f = fixture();
  f.controller.stop();
  assert.equal(f.pictureImage.getAttribute("loading"), "eager");
  assert.equal(f.pictureImage.count("load"), 0);
  f.controller.start();
  assert.equal(f.pictureImage.getAttribute("loading"), "eager");
  assert.equal(f.pictureImage.count("load"), 1);
  f.controller.dispose();
  assert.equal(f.pictureImage.getAttribute("loading"), "lazy");
  assert.equal(f.pictureImage.count("load"), 0);
});

test("stop/start/dispose은 중복 리스너와 남은 예약을 만들지 않는다", () => {
  const f = fixture();
  const listenerCount = f.win.count();
  f.controller.start();
  assert.equal(f.win.count(), listenerCount);
  f.controller.stop();
  assert.equal(f.win.count(), 0);
  assert.equal(f.root.count(), 0);
  assert.equal(f.image.count(), 0);
  assert.equal(f.pictureImage.count(), 0);
  assert.equal(f.frames.size, 0);
  assert.ok(f.observers.every((observer) => !observer.connected));
  f.controller.start();
  assert.equal(f.win.count(), listenerCount);
  f.controller.dispose();
  assert.equal(f.win.count(), 0);
  assert.equal(f.root.documentElement.classes.size, 0);
  assert.equal(f.journey.values.get("--polish-photo-x"), "17px");
});

test("ResizeObserver/fonts API가 없는 환경에서도 현재 구도를 계산하고 정리한다", () => {
  const f = fixture({ optionalApis: false });
  assert.ok(f.journey.dataset.polishProgress);
  f.controller.refresh();
  f.flush();
  assert.doesNotThrow(() => f.controller.dispose());
});


test("상점주 큰 웹은 뒤로 기울어진 구도에서 다가와 .18부터 정면 프레임을 유지한다", () => {
  const first = merchantDesktopState(0), middle = merchantDesktopState(.09);
  assert.equal(first.x, 0);
  assert.equal(first.y, .16);
  assert.equal(first.z, -.16);
  assert.equal(first.rx, 18);
  assert.equal(first.ry, -12);
  assert.equal(first.rz, -2);
  assert.equal(first.scale, .94);
  assert.equal(middle.x, 0);
  assert.ok(middle.y > 0 && middle.y < first.y);
  assert.ok(middle.z > first.z && middle.z < 0);
  assert.ok(middle.rx > 0 && middle.rx < first.rx);
  assert.ok(middle.ry > first.ry && middle.ry < 0);
  assert.ok(middle.rz > first.rz && middle.rz < 0);
  assert.ok(middle.scale > first.scale && middle.scale < 1);
  for (const progress of [.18, .20, .50, .64, .86, 1]) {
    const state = merchantDesktopState(progress);
    assert.equal(state.x, 0); assert.equal(state.y, 0); assert.equal(state.z, 0);
    assert.equal(state.rx, 0); assert.equal(state.ry, 0); assert.equal(state.rz, 0);
    assert.equal(state.scale, 1);
    assert.equal(state.cameraScale, 1);
    assert.equal(state.cameraX, 0); assert.equal(state.cameraY, 0);
  }
});

test("상점주 .20·.50·.86 정지점은 각각 전체 소개·등록·이벤트 화면의 읽기 상태다", () => {
  const first = merchantDesktopState(.20), register = merchantDesktopState(.50), last = merchantDesktopState(.86);
  assert.equal(first.eventOpacity, 0);
  assert.equal(first.introCopyOpacity, 1);
  assert.equal(first.registerCopyOpacity, 0);
  assert.equal(first.eventCopyOpacity, 0);
  assert.equal(first.activeCopy, 0);
  assert.equal(register.introCopyOpacity, 0);
  assert.equal(register.registerCopyOpacity, 1);
  assert.equal(register.registerCopyY, 0);
  assert.equal(register.eventCopyOpacity, 0);
  assert.equal(register.eventOpacity, 0);
  assert.equal(register.activeCopy, 1);
  assert.equal(last.eventOpacity, 1);
  assert.equal(last.eventCopyOpacity, 1);
  assert.equal(last.eventCopyY, 0);
  assert.equal(last.registerCopyOpacity, 0);
  assert.equal(last.introCopyOpacity, 0);
  assert.equal(last.activeCopy, 2);
  assert.equal(merchantDesktopState(.259).activeCopy, 0);
  assert.equal(merchantDesktopState(.26).activeCopy, 1);
  assert.equal(merchantDesktopState(.639).activeCopy, 1);
  assert.equal(merchantDesktopState(.64).activeCopy, 2);
});

test("왼쪽 설명은 위로 교체되고 내부 웹은 카메라 이동 없이 빈 구간 없는 crossfade 값을 제공한다", () => {
  for (let index = 0; index <= 200; index++) {
    const state = merchantDesktopState(index / 200);
    const weights = [state.introCopyOpacity, state.registerCopyOpacity, state.eventCopyOpacity];
    assert.ok(weights.every(weight => weight >= 0 && weight <= 1));
    // 설명을 교체하는 동안 하나 이상의 가중치가 남아 빈 구간을 피합니다.
    assert.ok(weights.reduce((sum, weight) => sum + weight, 0) > 0);
    assert.ok(state.introCopyY >= -.34 && state.introCopyY <= 0);
    assert.ok(state.registerCopyY >= -.34 && state.registerCopyY <= .34);
    assert.ok(state.eventCopyY >= 0 && state.eventCopyY <= .34);
    assert.ok(state.eventOpacity >= 0 && state.eventOpacity <= 1);
    assert.equal(state.cameraScale, 1);
    assert.equal(state.cameraX, 0); assert.equal(state.cameraY, 0);
  }
  const introTurn = merchantDesktopState(.28), eventTurn = merchantDesktopState(.62);
  assert.ok(introTurn.introCopyOpacity > 0 && introTurn.registerCopyOpacity > 0);
  assert.ok(eventTurn.registerCopyOpacity > 0 && eventTurn.eventCopyOpacity > 0);
  assert.ok(Math.abs(merchantDesktopState(.66).eventOpacity - .5) < 1e-10);
  assert.equal(merchantDesktopState(.30).introCopyY, -.34);
  assert.equal(merchantDesktopState(.42).registerCopyY, 0);
  assert.equal(merchantDesktopState(.66).registerCopyY, -.34);
  assert.equal(merchantDesktopState(.76).eventCopyY, 0);
});

test("웹 진입과 설명 이동은 현재 viewport의 px로 변환하고 읽기·역스크롤·refresh에서 같은 프레임을 유지한다", () => {
  const f = fixture({ merchantV2: true, y: 9928 });
  assert.equal(f.merchantDesktop.values.get('--merchant-web-x'), '0px');
  assert.ok(Math.abs(parseFloat(f.merchantDesktop.values.get('--merchant-web-y')) - 132.48) < 1e-10);
  assert.ok(Math.abs(parseFloat(f.merchantDesktop.values.get('--merchant-web-z')) + 230.4) < 1e-10);
  assert.equal(f.merchantDesktop.values.get('--merchant-web-rx'), '18deg');
  assert.equal(f.merchantDesktop.values.get('--merchant-web-ry'), '-12deg');
  assert.equal(f.merchantDesktop.values.get('--merchant-web-rz'), '-2deg');
  assert.equal(f.merchantDesktop.values.get('--merchant-web-scale'), '0.94');
  assert.ok(Math.abs(parseFloat(f.merchantDesktop.values.get('--merchant-register-copy-y')) - 281.52) < 1e-10);
  const reads = f.reads();
  const readingSnapshots = new Map();
  for (const progress of [.20, .50, .86]) {
    f.jump(9928 + 1372 * progress);
    for (const variable of ['--merchant-web-x', '--merchant-web-y', '--merchant-web-z']) assert.equal(f.merchantDesktop.values.get(variable), '0px');
    for (const variable of ['--merchant-web-rx', '--merchant-web-ry', '--merchant-web-rz']) assert.equal(f.merchantDesktop.values.get(variable), '0deg');
    assert.equal(f.merchantDesktop.values.get('--merchant-web-scale'), '1');
    assert.equal(f.merchantDesktop.values.get('--merchant-camera-scale'), '1');
    assert.equal(f.merchantDesktop.values.get('--merchant-camera-x'), '0%');
    assert.equal(f.merchantDesktop.values.get('--merchant-camera-y'), '0%');
    assert.equal(f.merchant.dataset.merchantSettled, 'true');
    readingSnapshots.set(progress, Object.fromEntries(f.merchantDesktop.values));
  }
  assert.equal(f.reads(), reads);
  f.jump(9928 + 1372 * .50);
  assert.deepEqual(Object.fromEntries(f.merchantDesktop.values), readingSnapshots.get(.50));
  assert.equal(f.merchantDesktop.values.get('--merchant-register-copy-y'), '0px');
  assert.equal(f.merchantCopies[1].getAttribute('aria-hidden'), 'false');
  f.controller.refresh(); f.flush();
  assert.deepEqual(Object.fromEntries(f.merchantDesktop.values), readingSnapshots.get(.50));
  assert.ok(f.reads() > reads);
  f.controller.dispose();
  assert.deepEqual([...f.merchantDesktop.values], [['color', 'inherit']]);
});

test("새 PC 상점주 지면은 중복 모바일 문서를 접근성 트리에서 숨기고 종료 시 복원한다", () => {
  const f = fixture({ merchantV2: true, y: 10000 });
  f.flush();
  assert.equal(f.merchant.getAttribute('aria-labelledby'), 'merchant-v2-title');
  assert.equal(f.merchantDesktop.getAttribute('aria-hidden'), 'false');
  assert.ok(f.oldMerchant.every(element => element.inert));
  f.jump(9928 + 1372 * .17997);
  assert.equal(f.merchant.dataset.merchantSettled, 'false');
  f.jump(9928 + 1372 * .18003);
  assert.equal(f.merchant.dataset.merchantSettled, 'true');
  f.jump(9928 + 1372 * .9);
  assert.equal(f.merchantDesktop.values.get('--merchant-screen-blend'), '1');
  assert.equal(f.merchantScreens[0].getAttribute('aria-hidden'), 'true');
  assert.equal(f.merchantScreens[1].getAttribute('aria-hidden'), 'false');
  assert.equal(f.merchantCopies[2].getAttribute('aria-hidden'), 'false');
  f.controller.dispose();
  assert.equal(f.merchant.getAttribute('aria-labelledby'), 'merchant-title');
  assert.equal(f.merchantDesktop.getAttribute('aria-hidden'), 'true');
  assert.ok(f.oldMerchant.every(element => !element.inert));
  assert.equal(f.merchant.dataset.merchantSettled, undefined);
});

test("이벤트 원본이 준비되지 않으면 .50 등록 읽기 상태를 유지하고 준비 후 현재 이벤트 위치를 복원한다", () => {
  for (const notReady of [{ complete: false }, { naturalWidth: 0 }]) {
    const f = fixture({ merchantV2: true, y: 10000 });
    Object.assign(f.merchantEventImage, notReady);
    f.jump(9928 + 1372 * .86);
    assert.equal(f.merchantDesktop.values.get('--merchant-screen-blend'), '0');
    assert.equal(f.merchantDesktop.values.get('--merchant-register-copy'), '1');
    assert.equal(f.merchantDesktop.values.get('--merchant-register-copy-y'), '0px');
    assert.equal(f.merchantDesktop.values.get('--merchant-event-copy'), '0');
    assert.equal(f.merchantDesktop.values.get('--merchant-camera-scale'), '1');
    assert.equal(f.merchantCopies[1].getAttribute('aria-hidden'), 'false');
    assert.equal(f.merchantScreens[0].getAttribute('aria-hidden'), 'false');
    assert.equal(f.merchantScreens[1].getAttribute('aria-hidden'), 'true');
    Object.assign(f.merchantEventImage, { complete: true, naturalWidth: 1864 });
    f.controller.refresh(); f.flush();
    assert.equal(f.merchantDesktop.values.get('--merchant-screen-blend'), '1');
    assert.equal(f.merchantDesktop.values.get('--merchant-event-copy'), '1');
    assert.equal(f.merchantDesktop.values.get('--merchant-event-copy-y'), '0px');
    assert.equal(f.merchantCopies[2].getAttribute('aria-hidden'), 'false');
    assert.equal(f.merchantScreens[0].getAttribute('aria-hidden'), 'true');
    assert.equal(f.merchantScreens[1].getAttribute('aria-hidden'), 'false');
    f.controller.dispose();
  }
});
