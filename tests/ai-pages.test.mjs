import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { aiPageState, consultingFlightState, consultingGlobeState, consultingGlobeTitleState, consultingFlightStep, globalVisionState, globalVisionTitleState, createAiPages } from "../dist/ai-pages.mjs";

test("AI 진행도는 범위를 벗어나도 시작·완료 상태로 제한된다", () => {
  assert.deepEqual(aiPageState(-1), aiPageState(0));
  assert.deepEqual(aiPageState(2), aiPageState(1));
});

test("두 제품은 짧은 등장 뒤 정면으로 정착하고 읽는 동안 상태를 유지한다", () => {
  const opening = aiPageState(0);
  assert.equal(opening.appearance, 0);
  assert.equal(opening.alignment, 0);
  assert.equal(aiPageState(0.18).appearance, 1);
  assert.equal(aiPageState(0.18).alignment < 1, true);
  for (const p of [0.24, 0.4, 0.6, 0.9, 1]) assert.deepEqual(aiPageState(p), aiPageState(1));
});

test("연속·역방향 진행도는 같은 구도를 복원하고 모든 값이 유한하다", () => {
  const progress = Array.from({ length: 1001 }, (_, i) => i / 1000);
  const forward = progress.map((p) => JSON.stringify(aiPageState(p)));
  const reverse = [...progress].reverse().map((p) => JSON.stringify(aiPageState(p))).reverse();
  assert.deepEqual(reverse, forward);
  for (const json of forward) {
    assert.ok(!json.includes("null"));
    assert.ok(Object.values(JSON.parse(json)).every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
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
  emit(type, values = {}) { for (const callback of [...(this.listeners.get(type) ?? [])]) callback({ type, target: this, ...values }); }
  count(type) { return this.listeners.get(type)?.size ?? 0; }
}

function element() {
  const target = Object.assign(new Target(), { dataset: {}, attributes: new Map(), classes: new Set(), values: new Map([["color", "inherit"]]) });
  target.getAttribute = (name) => target.attributes.get(name) ?? null;
  target.setAttribute = (name, value) => target.attributes.set(name, String(value));
  target.removeAttribute = (name) => target.attributes.delete(name);
  target.classList = {
    add: (...names) => names.forEach((name) => target.classes.add(name)),
    remove: (...names) => names.forEach((name) => target.classes.delete(name)),
    toggle: (name, on) => on ? target.classes.add(name) : target.classes.delete(name),
    contains: (name) => target.classes.has(name),
  };
  target.style = {
    setProperty: (name, value) => target.values.set(name, String(value)),
    removeProperty: (name) => target.values.delete(name),
  };
  return target;
}

function fixture({ desktop = true, compact = false, viewportWidth = compact ? 390 : 1440, viewportHeight = 900, reduced = false, loaded = true, withModel = false, withGlobe = withModel, productCount = withGlobe && !withModel ? 0 : 1, type = withGlobe ? "consulting" : "traveler", withCopy = true, withHeading = true, withDialog = false, withFlight = withGlobe, flightLoaded = true, withVideo = withGlobe, videoLoaded = true, videoDuration = withGlobe ? 12 : 9, initialProgress } = {}) {
  const win = Object.assign(new Target(), { innerWidth: viewportWidth, innerHeight: viewportHeight, scrollY: 1500 });
  const desktopQuery = Object.assign(new Target(), { matches: desktop });
  const compactQuery = Object.assign(new Target(), { matches: compact });
  const reducedQuery = Object.assign(new Target(), { matches: reduced });
  win.matchMedia = (query) => query.includes("reduced-motion") ? reducedQuery : query.includes("max-width") ? compactQuery : desktopQuery;
  const frames = new Map();
  let frameId = 0;
  win.requestAnimationFrame = (callback) => { frames.set(++frameId, callback); return frameId; };
  win.cancelAnimationFrame = (id) => frames.delete(id);
  let now = 0;
  const flushOne = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    now += 16;
    callbacks.forEach((callback) => callback(now));
  };
  const flush = () => {
    let attempts = 0;
    while (frames.size) {
      assert.ok(++attempts < 200);
      flushOne();
    }
  };
  let reads = 0;
  const header = { getBoundingClientRect: () => { reads++; return { height: 72 }; } };
  const scene = element();
  scene.dataset.aiPage = type;
  if (type === "global") scene.dataset.globalVision = "";
  if (withGlobe) scene.dataset.consultingGlobe = "";
  if (withModel) scene.dataset.consultingModel = "";
  const copy = element(), heading = element();
  scene.querySelector = selector => selector === ".ai-stage-copy" && withCopy ? copy : selector === ".ai-stage-copy h3" && withHeading ? heading : null;
  const sceneHeight = type === "global" ? 2700 : withFlight || withVideo ? 3150 : 1395;
  scene.getBoundingClientRect = () => { reads++; return { top: 2000 - win.scrollY, height: sceneHeight, width: 1440 }; };
  const products = Array.from({ length: productCount }, () => element());
  const assets = Array.from({ length: type === "global" ? 1 : withModel ? 2 : 4 }, (_, i) => {
    const asset = element();
    asset.dataset.desktopSrc = type === "global" ? "assets/consulting-flight/korea-globe-poster-v29.webp" : withModel ? i === 0 ? "assets/ai-refresh/consulting-neighborhood-base-v13.png" : "assets/consulting-flight/pingdom-pin-clean.webp" : `assets/ai-${i}.webp`;
    if (withModel || type === "global") asset.dataset.aiRequired = "";
    asset.complete = loaded;
    asset.naturalWidth = loaded ? 960 : 0;
    return asset;
  });
  if (!withModel && type !== "global") {
    assets[0].dataset.aiFallback = "assets/original-ai.webp";
    assets[3].dataset.aiRequired = "";
    assets[3].dataset.aiFallback = "assets/original-response.webp";
  }
  const flightAsset = element();
  flightAsset.dataset.desktopSrc = type === "global" ? "assets/consulting-flight/global-globe-poster-v29.webp" : withGlobe ? "assets/consulting-flight/seoul-globe-poster-v14.webp" : "assets/real-city-aerial.webp";
  flightAsset.dataset.flightImage = "";
  flightAsset.complete = flightLoaded;
  flightAsset.naturalWidth = flightLoaded ? 3600 : 0;
  const flightPins = Array.from({ length: withGlobe ? 0 : 8 }, () => element());
  const video = element(), seeks = [];
  let videoTime = 0, videoLoads = 0, videoPauses = 0;
  video.dataset.flightVideo = "";
  video.dataset.desktopSrc = type === "global" ? "assets/consulting-flight/korea-global-flight-v29.mp4" : withGlobe ? "assets/consulting-flight/seoul-globe-flight-v14.mp4" : "assets/consulting-flight/seoul-night-flight.mp4";
  video.duration = videoLoaded ? videoDuration : NaN;
  video.readyState = videoLoaded ? 2 : 0;
  video.videoWidth = videoLoaded ? 1920 : 0;
  video.seeking = false;
  video.error = null;
  video.paused = true;
  Object.defineProperty(video, "currentTime", {
    get: () => videoTime,
    set: (value) => { seeks.push(value); videoTime = value; video.seeking = true; },
  });
  video.pause = () => { videoPauses++; video.paused = true; };
  video.load = () => { videoLoads++; videoTime = 0; video.readyState = 0; video.videoWidth = 0; video.duration = NaN; video.seeking = false; video.error = null; };
  const decodedVideo = () => { video.duration = videoDuration; video.readyState = 2; video.videoWidth = 1920; video.error = null; video.emit("loadeddata"); };
  const finishSeek = () => { video.seeking = false; video.emit("seeked"); };
  if (withFlight || withVideo) scene.dataset.consultingFlight = "";
  scene.querySelectorAll = (selector) => selector === "[data-ai-product]" ? products :
    selector === "img[data-desktop-src]" ? [...(withGlobe && !withModel && type !== "global" ? [] : assets), ...(withFlight ? [flightAsset] : [])] :
    withFlight && selector === "img[data-flight-image]" ? [flightAsset] :
    withVideo && selector === "video[data-flight-video]" ? [video] :
    (withFlight || withVideo) && selector === "[data-flight-pin]" ? flightPins : [];
  const wrapper = element();
  const dialog = element(), trigger = element(), closer = element(), dialogAsset = element();
  const dialogError = { hidden: true };
  let focusReturns = 0;
  dialog.id = "ai-example";
  dialog.open = false;
  dialog.querySelectorAll = (selector) => selector === "img[data-ai-dialog-src]" ? [dialogAsset] : selector === "[data-ai-dialog-close]" ? [closer] : [];
  dialog.querySelector = (selector) => selector === ".ai-dialog-error" ? dialogError : null;
  dialogAsset.dataset.aiDialogSrc = "assets/native-example.webp";
  dialogAsset.dataset.aiFallback = "assets/native-example-fallback.webp";
  dialogAsset.complete = false;
  dialogAsset.naturalWidth = 0;
  trigger.dataset.aiDialogOpen = dialog.id;
  trigger.setAttribute("aria-expanded", "false");
  wrapper.querySelectorAll = (selector) => selector === "[data-ai-page]" ? [scene] :
    withDialog && selector === "dialog[data-ai-dialog]" ? [dialog] :
    withDialog && selector === "[data-ai-dialog-open]" ? [trigger] : [];
  const aiSection = element();
  aiSection.setAttribute("aria-labelledby", "ai-title");
  const documentElement = element();
  const observed = [];
  let observeCallback;
  win.ResizeObserver = class {
    constructor(callback) { observeCallback = callback; }
    observe(target) { observed.push(target); }
    disconnect() {}
  };
  const root = Object.assign(new Target(), { hidden: false, documentElement });
  dialog.showModal = () => { dialog.open = true; root.activeElement = closer; };
  dialog.close = () => { dialog.open = false; dialog.emit("close"); };
  trigger.focus = () => { focusReturns++; root.activeElement = trigger; };
  root.querySelector = (selector) => selector === ".ai-pages" ? wrapper : selector === ".site-header" ? header : selector === "#ai" ? aiSection : null;
  const setProgress = (progress) => { const viewport = viewportHeight - 72; win.scrollY = 2000 - 72 - viewport * 0.2 + (sceneHeight - viewport + viewport * 0.2) * progress; };
  if (initialProgress !== undefined) setProgress(initialProgress);
  const controller = createAiPages({ root, win });
  return { controller, win, root, scene, assets, products, wrapper, aiSection, desktopQuery, compactQuery, reducedQuery, flush, flushOne, pending: () => frames.size, setProgress, flightAsset, flightPins, video, seeks, decodedVideo, finishSeek, videoLoads: () => videoLoads, videoPauses: () => videoPauses, reads: () => reads, observed, resize: () => observeCallback(), dialog, trigger, closer, dialogAsset, dialogError, focusReturns: () => focusReturns };
}

const globalProgress = seconds => seconds >= 7.184 ? .90 : .42 + .48 * seconds / 7.184;
const globalFixture = options => fixture({ type: "global", withGlobe: true, withModel: false,
  productCount: 0, withFlight: true, withVideo: true, videoDuration: 7.2, ...options });

test("유효한 화면 media query가 없으면 AI 자산과 모션을 설정하지 않는다", () => {
  const f = fixture({ desktop: false });
  assert.ok(f.assets.every((asset) => !asset.attributes.has("src")));
  assert.equal(f.wrapper.classes.has("ai-pages-motion"), false);
  assert.deepEqual([...f.scene.values], [["color", "inherit"]]);
  f.controller.dispose();
});

test("동작 줄이기 설정에서는 새 두 제품 소개를 정지 상태로 제공한다", () => {
  const f = fixture({ reduced: true });
  assert.ok(f.assets.every((asset) => asset.attributes.has("src")));
  assert.equal(f.wrapper.classes.has("ai-pages-motion"), false);
  assert.equal(f.scene.classes.has("ai-page-static"), true);
  assert.equal(f.scene.dataset.aiProgress, undefined);
  assert.deepEqual([...f.scene.values], [["color", "inherit"]]);
  f.controller.dispose();
});

test("스크롤 페인트는 캐시된 좌표를 사용하고 역방향 이동도 같은 스타일을 복원한다", () => {
  const f = fixture();
  const reads = f.reads();
  f.win.scrollY = 1880;
  f.win.emit("scroll");
  f.flush();
  const original = Object.fromEntries(f.scene.values);
  f.win.scrollY = 3200;
  f.win.emit("scroll");
  f.flush();
  f.win.scrollY = 1880;
  f.win.emit("scroll");
  f.flush();
  assert.deepEqual(Object.fromEntries(f.scene.values), original);
  assert.equal(f.reads(), reads);
  f.controller.dispose();
});

test("stop/start는 중복 리스너를 만들지 않고 dispose는 추가 스타일·자산만 정리한다", () => {
  const f = fixture();
  assert.equal(f.win.count("scroll"), 1);
  f.controller.start();
  assert.equal(f.win.count("scroll"), 1);
  f.controller.stop();
  assert.equal(f.win.count("scroll"), 0);
  f.controller.start();
  assert.equal(f.win.count("scroll"), 1);
  f.controller.dispose();
  assert.equal(f.win.count("scroll"), 0);
  assert.equal(f.assets[0].count("load"), 0);
  assert.ok(f.assets.every((asset) => !asset.attributes.has("src")));
  assert.deepEqual([...f.scene.values], [["color", "inherit"]]);
  assert.ok(f.products.every((product) => [...product.values.keys()].length === 1));
});

test("화면 폭을 줄이면 새 PC 모션과 자산이 원래 상태로 복구된다", () => {
  const f = fixture();
  f.desktopQuery.matches = false;
  f.desktopQuery.emit("change");
  f.flush();
  assert.equal(f.wrapper.classes.has("ai-pages-motion"), false);
  assert.ok(f.assets.every((asset) => !asset.attributes.has("src")));
  assert.deepEqual([...f.scene.values], [["color", "inherit"]]);
  f.controller.dispose();
});

test("PC의 AI 접근성 이름은 새 구성에 맞추고 비활성화 시 원래 제목 연결을 복구한다", () => {
  const f = fixture();
  assert.equal(f.aiSection.getAttribute("aria-labelledby"), null);
  assert.equal(f.aiSection.getAttribute("aria-label"), "핑덤 AI 서비스");
  f.desktopQuery.matches = false;
  f.desktopQuery.emit("change");
  f.flush();
  assert.equal(f.aiSection.getAttribute("aria-labelledby"), "ai-title");
  assert.equal(f.aiSection.getAttribute("aria-label"), null);
  f.controller.dispose();
});

test("늦게 로드된 자산은 모두 준비된 뒤 현재 스크롤 구도로 전환한다", () => {
  const f = fixture({ loaded: false });
  assert.equal(f.scene.dataset.aiProgress, undefined);
  assert.equal(f.scene.classes.has("ai-page-pending"), true);
  f.assets.forEach((asset) => { asset.complete = true; asset.naturalWidth = 960; });
  f.assets[0].emit("load");
  f.flush();
  assert.ok(f.scene.dataset.aiProgress);
  assert.equal(f.scene.classes.has("ai-page-prepared"), true);
  assert.equal(f.scene.classes.has("ai-page-pending"), false);
  f.controller.dispose();
});

test("보조 자산이 실패해 원본으로 복구되어도 정상 장면 진행을 유지한다", () => {
  const f = fixture();
  f.assets[0].emit("error");
  f.flush();
  assert.equal(f.assets[0].getAttribute("src"), "assets/original-ai.webp");
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  assert.ok(f.scene.dataset.aiProgress);
  f.controller.dispose();
});

test("핵심 그림 자산이 실패하면 fallback으로 복구하고 정지 상태로 제공한다", () => {
  const f = fixture();
  f.assets[3].emit("error");
  f.flush();
  assert.equal(f.assets[3].getAttribute("src"), "assets/original-response.webp");
  assert.equal(f.scene.classes.has("ai-page-static"), true);
  assert.equal(f.scene.dataset.aiProgress, undefined);
  f.controller.dispose();
});

test("PC 자산의 늦은 오류가 좁은 화면에서 fallback 요청을 재시작하지 않는다", () => {
  const f = fixture();
  f.desktopQuery.matches = false;
  f.desktopQuery.emit("change");
  f.flush();
  f.assets[0].emit("error");
  f.flush();
  assert.equal(f.assets[0].getAttribute("src"), null);
  f.desktopQuery.matches = true;
  f.desktopQuery.emit("change");
  f.flush();
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  f.controller.dispose();
});

test("이전 cosmic fragment나 부족한 제품면과 새 모듈이 섞여도 정지 상태로 안전하게 전환한다", () => {
  for (const settings of [{ type: "cosmic" }, { productCount: 0 }, { productCount: 2 }]) {
    const f = fixture(settings);
    assert.equal(f.scene.classes.has("ai-page-static"), true);
    assert.equal(f.scene.dataset.aiProgress, undefined);
    f.controller.dispose();
  }
});

test("앞선 섹션 높이가 바뀌면 문서 루트 관찰로 장면 좌표를 다시 읽는다", () => {
  const f = fixture();
  assert.ok(f.observed.includes(f.root.documentElement));
  const reads = f.reads();
  f.resize(); f.flush();
  assert.ok(f.reads() > reads);
  f.controller.dispose();
});

test("cosmos 배경만 실패해도 새 제품면을 유지하고 비활성화 때 실패 표시를 정리한다", () => {
  const f = fixture();
  delete f.assets[0].dataset.aiFallback;
  f.assets[0].naturalWidth = 0;
  f.assets[0].emit("error"); f.flush();
  assert.equal(f.assets[0].classes.has("ai-asset-failed"), true);
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  assert.equal(f.scene.classes.has("ai-page-pending"), false);
  assert.ok(f.scene.dataset.aiProgress);
  f.controller.dispose();
  assert.equal(f.assets[0].classes.has("ai-asset-failed"), false);
});

test("BFCache 정지는 현재 구도를 유지하고 재시작은 복귀 위치로 갱신한다", () => {
  const f = fixture();
  f.win.scrollY = 1880;
  f.win.emit("scroll"); f.flush();
  const values = Object.fromEntries(f.scene.values);
  const progress = f.scene.dataset.aiProgress;
  f.controller.stop();
  assert.deepEqual(Object.fromEntries(f.scene.values), values);
  assert.equal(f.scene.dataset.aiProgress, progress);
  assert.ok(f.assets.every((asset) => asset.getAttribute("src")));
  f.win.scrollY = 2400;
  f.controller.start();
  assert.notEqual(f.scene.dataset.aiProgress, progress);
  assert.equal(f.win.count("scroll"), 1);
  f.controller.dispose();
});

test("동작 줄이기를 실행 중 바꾸면 새 제품을 정지 구도로 복구한다", () => {
  const f = fixture();
  assert.ok(f.scene.values.has("--ai-visual-y"));
  f.reducedQuery.matches = true;
  f.reducedQuery.emit("change"); f.flush();
  assert.equal(f.wrapper.classes.has("ai-pages-motion"), false);
  assert.equal(f.scene.classes.has("ai-page-static"), true);
  assert.equal(f.scene.values.has("--ai-visual-y"), false);
  assert.ok(f.assets.every((asset) => asset.getAttribute("src")));
  f.reducedQuery.matches = false;
  f.reducedQuery.emit("change"); f.flush();
  assert.ok(f.scene.dataset.aiProgress);
  f.controller.dispose();
});

test("입장 시에도 완성된 제품면은 보이고 안정 구간에서는 움직임이 멈춘다", () => {
  for (const type of ["traveler", "consulting"]) {
    const f = fixture({ type });
    assert.equal(f.scene.values.get("--ai-visual-opacity"), "0.9");
    assert.equal(f.scene.values.get("--ai-visual-y"), type === "traveler" ? "32px" : "24px");
    assert.equal(f.scene.values.get("--ai-visual-scale"), type === "traveler" ? "0.96" : "0.98");
    f.win.scrollY = 2250;
    f.win.emit("scroll"); f.flush();
    assert.equal(f.scene.values.get("--ai-visual-opacity"), "1");
    assert.equal(f.scene.values.get("--ai-visual-y"), "0px");
    assert.equal(f.scene.values.has("--ai-visual-angle"), false);
    assert.equal(f.scene.values.get("--ai-visual-scale"), "1");
    const values = Object.fromEntries(f.scene.values);
    f.win.scrollY = 2350;
    f.win.emit("scroll"); f.flush();
    assert.deepEqual(Object.fromEntries(f.scene.values), values);
    f.controller.dispose();
  }
});

test("문서가 숨겨지면 대기 페인트를 취소하고 복귀할 때 현재 위치를 다시 읽는다", () => {
  const f = fixture();
  f.win.emit("scroll");
  const progress = f.scene.dataset.aiProgress;
  f.root.hidden = true;
  f.root.emit("visibilitychange");
  f.win.scrollY = 2300;
  f.flush();
  assert.equal(f.scene.dataset.aiProgress, progress);
  const reads = f.reads();
  f.root.hidden = false;
  f.root.emit("visibilitychange"); f.flush();
  assert.ok(f.reads() > reads);
  assert.notEqual(f.scene.dataset.aiProgress, progress);
  f.controller.dispose();
});

test("AI fragment가 없으면 기존 페이지에 영향 없이 종료된다", () => {
  const controller = createAiPages({ root: { querySelector: () => null }, win: {} });
  for (const action of ["start", "stop", "refresh", "dispose"]) assert.doesNotThrow(() => controller[action]());
});

test("native 예시는 클릭할 때만 로드되고 닫기와 native close가 포커스를 복구한다", () => {
  const f = fixture({ withDialog: true });
  assert.equal(f.dialogAsset.getAttribute("src"), null);
  f.trigger.emit("click");
  assert.equal(f.dialog.open, true);
  assert.equal(f.dialogAsset.getAttribute("src"), "assets/native-example.webp");
  assert.equal(f.trigger.getAttribute("aria-expanded"), "true");
  assert.equal(f.root.activeElement, f.closer);
  f.closer.emit("click");
  assert.equal(f.dialog.open, false);
  assert.equal(f.trigger.getAttribute("aria-expanded"), "false");
  assert.equal(f.root.activeElement, f.trigger);
  assert.equal(f.focusReturns(), 1);
  f.trigger.emit("click");
  // Escape의 기본 동작이 발생시키는 close 이벤트는 가로채지 않습니다.
  f.dialog.close();
  assert.equal(f.focusReturns(), 2);
  assert.equal(f.dialog.count("cancel"), 0);
  f.controller.dispose();
});

test("stop과 dispose는 열린 native dialog를 닫고 재시작 시 리스너를 중복 등록하지 않는다", () => {
  const f = fixture({ withDialog: true });
  f.trigger.emit("click");
  f.controller.stop();
  assert.equal(f.dialog.open, false);
  assert.equal(f.trigger.getAttribute("aria-expanded"), "false");
  assert.equal(f.trigger.count("click"), 0);
  assert.equal(f.dialog.count("close"), 0);
  assert.equal(f.dialogAsset.getAttribute("src"), "assets/native-example.webp");
  f.trigger.emit("click");
  assert.equal(f.dialog.open, false);
  f.controller.start(); f.controller.start();
  assert.equal(f.trigger.count("click"), 1);
  f.trigger.emit("click");
  f.controller.dispose();
  assert.equal(f.dialog.open, false);
  assert.equal(f.dialogAsset.getAttribute("src"), null);
  assert.equal(f.dialogAsset.count("error"), 0);
  assert.equal(f.closer.count("click"), 0);
});

test("PC 밖으로 바뀌면 모달과 원본 요청을 복구하고 늦은 오류가 요청을 재시작하지 않는다", () => {
  const f = fixture({ withDialog: true });
  f.trigger.emit("click");
  f.desktopQuery.matches = false;
  f.desktopQuery.emit("change"); f.flush();
  assert.equal(f.dialog.open, false);
  assert.equal(f.dialogAsset.getAttribute("src"), null);
  f.dialogAsset.emit("error");
  f.trigger.emit("click");
  assert.equal(f.dialog.open, false);
  assert.equal(f.dialogAsset.getAttribute("src"), null);
  f.desktopQuery.matches = true;
  f.desktopQuery.emit("change"); f.flush();
  assert.equal(f.dialogAsset.getAttribute("src"), null);
  f.trigger.emit("click");
  assert.equal(f.dialogAsset.getAttribute("src"), "assets/native-example.webp");
  f.controller.dispose();
});

test("예시 이미지 실패는 읽을 수 있는 오류로 복구하고 소개 그림의 흐름에 영향을 주지 않는다", () => {
  const f = fixture({ withDialog: true });
  f.trigger.emit("click");
  const progress = f.scene.dataset.aiProgress;
  f.dialogAsset.emit("error");
  assert.equal(f.dialogAsset.getAttribute("src"), "assets/native-example-fallback.webp");
  f.dialogAsset.emit("error");
  assert.equal(f.dialog.classes.has("ai-dialog-failed"), true);
  assert.equal(f.dialogError.hidden, false);
  assert.equal(f.scene.dataset.aiProgress, progress);
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  f.dialogAsset.complete = true;
  f.dialogAsset.naturalWidth = 221;
  f.dialogAsset.emit("load");
  assert.equal(f.dialog.classes.has("ai-dialog-failed"), false);
  assert.equal(f.dialogError.hidden, true);
  f.controller.dispose();
});

test("컨설팅은 소개 정지 뒤 핀 줌을 거쳐 실제 항공뷰와 순차 핀으로 전환한다", () => {
  const intro = consultingFlightState(0.32);
  assert.equal(intro.copyOpacity, 1);
  assert.equal(intro.modelScale, 1);
  assert.equal(intro.modelOpacity, 1);
  assert.equal(intro.flightOpacity, 0);
  assert.ok(intro.pins.every((pin) => pin.opacity === 0));
  const zoom = consultingFlightState(0.55);
  assert.equal(zoom.modelScale, 1.9);
  const halfwayZoom = consultingFlightState(0.455);
  assert.ok(Math.abs(halfwayZoom.modelScale - Math.sqrt(1.9)) < 1e-10);
  assert.ok(Math.abs(zoom.modelY) <= 0.04);
  assert.equal(zoom.modelOpacity, 1);
  assert.ok(zoom.flightOpacity > 0 && zoom.flightOpacity < 1);
  const entry = consultingFlightState(0.58);
  assert.equal(entry.flightOpacity, 1);
  assert.equal(entry.modelOpacity, 0);
  assert.equal(entry.veilOpacity, 0);
  assert.equal(entry.flightProgress, 0);
  const moving = consultingFlightState(0.66);
  assert.equal(moving.pins[0].opacity, 1);
  assert.equal(moving.pins.at(-1).opacity, 0);
  const settled = consultingFlightState(0.95);
  assert.equal(settled.copyOpacity, 0);
  assert.equal(settled.modelOpacity, 0);
  assert.equal(settled.flightOpacity, 1);
  assert.equal(settled.flightProgress, 1);
  assert.equal(settled.cameraY, 24);
  assert.ok(settled.pins.every((pin) => pin.opacity === 1 && pin.ringOpacity === 0));
  assert.deepEqual(settled, consultingFlightState(1));
});

test("항공 경로는 역방향과 빠른 seek에 동일하고 잘못된 입력도 유한한 값으로 제한된다", () => {
  const progress = Array.from({ length: 1001 }, (_, index) => index / 1000);
  const forward = progress.map((p) => consultingFlightState(p));
  assert.deepEqual([...progress].reverse().map((p) => consultingFlightState(p)).reverse(), forward);
  for (const state of [...forward, consultingFlightState(NaN), consultingFlightState(undefined), consultingFlightState(Infinity), consultingFlightState(-Infinity)]) {
    assert.ok(Object.values(state).filter((value) => typeof value === "number").every(Number.isFinite));
    assert.ok(state.pins.every((pin) => Object.values(pin).every(Number.isFinite)));
  }
  assert.deepEqual(consultingFlightState(-10), consultingFlightState(0));
  assert.deepEqual(consultingFlightState(10), consultingFlightState(1));
  assert.equal(consultingFlightState(0.8, -10).pins.length, 0);
  assert.equal(consultingFlightState(0.8, 100).pins.length, 24);
});

test("비행 보간은 두 큰 이동을 약 1.5~2초에 마치고 짧은 입력과 역방향에 즉시 반응한다", () => {
  const city = 0.58 + 0.37 * (7.6 / 22);
  const global = 0.58 + 0.37 * (21.9 / 22);
  for (const [start, destination] of [[0.32, city], [city, global]]) {
    let current = start, frames = 0;
    const route = [];
    while (current !== destination) {
      const next = consultingFlightStep(current, destination, 16);
      assert.ok(next > current && next <= destination);
      current = next;
      route.push(current);
      assert.ok(++frames < 130);
    }
    assert.ok(frames * 16 >= 1500 && frames * 16 <= 2000);
    if (start === 0.32) {
      assert.ok(route.some((p) => p >= 0.36 && p < 0.55));
      assert.ok(route.some((p) => p >= 0.58 && p < city));
    }
  }
  let short = 0.6, frames = 0;
  while (short !== 0.605) { short = consultingFlightStep(short, 0.605, 16); assert.ok(++frames <= 10); }
  assert.equal(consultingFlightStep(0.78, 0.32, 16), 0.32);
  assert.equal(consultingFlightStep(0.36, 0.32, 0), 0.32);
  assert.equal(consultingFlightStep(0.32, 0.78, 0), 0.32);
  assert.equal(consultingFlightStep(NaN, 0.78), 0.78);
  assert.ok(Number.isFinite(consultingFlightStep(0.32, Infinity, NaN)));
});

test("보간 중 역스크롤은 아직 앞에 있는 논리 목적지에서도 전진을 즉시 취소한다", () => {
  const f = fixture({ type: "consulting", withVideo: true, videoDuration: 22, initialProgress: 0.32 });
  const city = 0.58 + 0.37 * (8.3 / 22);
  f.setProgress(city); f.win.emit("scroll"); f.flushOne();
  assert.ok(Number(f.scene.dataset.flightDisplayProgress) < 0.4);
  f.setProgress(0.68); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.6800");
  assert.equal(f.pending(), 0);
  assert.ok(Math.abs(f.video.currentTime - (0.68 - 0.58) / 0.37 * 22) < 1e-10);
  f.finishSeek();
  f.setProgress(0.32); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.dataset.flightPhase, "intro");
  assert.equal(f.video.currentTime, 0);
  f.controller.dispose();
});

test("새 컨설팅 소개는 늘어난 runway에서도 먼저 완성되고 빠른 스크롤만 비행 보간을 사용한다", () => {
  const f = fixture({ type: "consulting", withFlight: true, initialProgress: 0.08 });
  assert.equal(f.scene.values.get("--ai-visual-scale"), "1");
  assert.equal(f.scene.values.get("--ai-copy-y"), "0px");
  f.setProgress(0.32); f.controller.refresh();
  const reads = f.reads();
  assert.equal(f.scene.dataset.flightPhase, "intro");
  f.setProgress(0.78); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.dataset.aiProgress, "0.7800");
  assert.ok(Number(f.scene.dataset.flightDisplayProgress) > 0.32 && Number(f.scene.dataset.flightDisplayProgress) < 0.78);
  assert.equal(f.pending(), 1);
  f.flush();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.7800");
  assert.equal(f.scene.dataset.flightPhase, "flight");
  assert.equal(f.pending(), 0);
  assert.equal(f.reads(), reads);
  const forward = Object.fromEntries(f.scene.values);
  f.setProgress(0.32); f.win.emit("scroll"); f.flushOne();
  assert.ok(Number(f.scene.dataset.flightDisplayProgress) < 0.78);
  f.flush();
  assert.equal(f.scene.values.get("--consult-model-scale"), "1");
  f.setProgress(0.78); f.win.emit("scroll"); f.flush();
  assert.deepEqual(Object.fromEntries(f.scene.values), forward);
  f.controller.dispose();
});

test("늦은 항공 사진은 원래 소개 준비를 막지 않으며 현재 위치에서 바로 복원한다", () => {
  const f = fixture({ type: "consulting", withFlight: true, flightLoaded: false, initialProgress: 0.78 });
  assert.equal(f.scene.classes.has("ai-page-prepared"), true);
  assert.equal(f.scene.classes.has("ai-page-pending"), false);
  assert.equal(f.scene.classes.has("flight-unavailable"), true);
  assert.equal(f.scene.classes.has("flight-ready"), false);
  assert.equal(f.scene.values.get("--ai-visual-opacity"), "1");
  assert.equal(f.scene.values.has("--consult-model-opacity"), false);
  f.flightAsset.complete = true; f.flightAsset.naturalWidth = 3600;
  f.flightAsset.emit("load"); f.flush();
  assert.equal(f.scene.classes.has("flight-ready"), true);
  assert.equal(f.scene.classes.has("flight-unavailable"), false);
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.7800");
  assert.equal(f.pending(), 0);
  f.controller.dispose();
});

test("항공 사진 실패는 긴 소개 높이와 읽을 수 있는 제품면을 보존한다", () => {
  const f = fixture({ type: "consulting", withFlight: true, initialProgress: 0.78 });
  const height = f.scene.getBoundingClientRect().height;
  f.flightAsset.complete = true; f.flightAsset.naturalWidth = 0;
  f.flightAsset.emit("error"); f.flush();
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  assert.equal(f.scene.classes.has("ai-page-prepared"), true);
  assert.equal(f.scene.classes.has("flight-ready"), false);
  assert.equal(f.scene.classes.has("flight-unavailable"), true);
  assert.equal(f.scene.values.get("--ai-visual-opacity"), "1");
  assert.equal(f.scene.values.has("--flight-opacity"), false);
  assert.equal(f.scene.getBoundingClientRect().height, height);
  assert.ok(f.flightPins.every((pin) => [...pin.values.keys()].length === 1));
  f.flightAsset.naturalWidth = 3600; f.flightAsset.emit("load"); f.flush();
  assert.equal(f.scene.classes.has("flight-ready"), true);
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.7800");
  f.controller.dispose();
});

test("동작 줄이기는 비행 사진을 처음부터 요청하지 않고 전환 중 적용해도 비행을 제거한다", () => {
  const reduced = fixture({ type: "consulting", withFlight: true, reduced: true });
  assert.equal(reduced.flightAsset.getAttribute("src"), null);
  assert.equal(reduced.scene.classes.has("flight-ready"), false);
  assert.equal(reduced.scene.values.has("--flight-opacity"), false);
  reduced.controller.dispose();
  const f = fixture({ type: "consulting", withFlight: true, initialProgress: 0.32 });
  f.setProgress(0.78); f.win.emit("scroll"); f.flushOne();
  f.reducedQuery.matches = true; f.reducedQuery.emit("change"); f.flush();
  assert.equal(f.scene.classes.has("ai-page-static"), true);
  assert.equal(f.scene.classes.has("flight-ready"), false);
  assert.equal(f.scene.dataset.flightDisplayProgress, undefined);
  assert.deepEqual([...f.scene.values], [["color", "inherit"]]);
  assert.ok(f.flightPins.every((pin) => [...pin.values.keys()].length === 1));
  assert.equal(f.pending(), 0);
  f.reducedQuery.matches = false; f.reducedQuery.emit("change"); f.flush();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.7800");
  f.controller.dispose();
});

test("비행 RAF는 숨김·정지 때 취소되고 복귀·resize는 현재 스크롤 구도로 바로 초기화한다", () => {
  const f = fixture({ type: "consulting", withFlight: true, initialProgress: 0.32 });
  f.setProgress(0.78); f.win.emit("scroll"); f.flushOne();
  const values = Object.fromEntries(f.scene.values);
  f.root.hidden = true; f.root.emit("visibilitychange");
  assert.equal(f.pending(), 0);
  assert.deepEqual(Object.fromEntries(f.scene.values), values);
  f.setProgress(0.9); f.root.hidden = false; f.root.emit("visibilitychange"); f.flush();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.9000");
  f.setProgress(0.32); f.win.emit("scroll"); f.flushOne();
  const beforeStop = Object.fromEntries(f.scene.values);
  f.controller.stop();
  assert.equal(f.pending(), 0);
  assert.deepEqual(Object.fromEntries(f.scene.values), beforeStop);
  f.setProgress(0.95); f.controller.start();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.9500");
  assert.equal(f.scene.dataset.flightPhase, "settled");
  f.setProgress(0.4); f.win.emit("resize"); f.flush();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.4000");
  assert.equal(f.pending(), 0);
  f.controller.dispose();
  assert.equal(f.flightAsset.getAttribute("src"), null);
  assert.equal(f.flightAsset.count("load"), 0);
  assert.equal(f.flightAsset.count("error"), 0);
  assert.equal(f.scene.classes.has("flight-ready"), false);
  assert.deepEqual([...f.scene.values], [["color", "inherit"]]);
  assert.ok(f.flightPins.every((pin) => [...pin.values.keys()].length === 1));
});

test("좁은 화면은 비행 자산을 복원하고 늦은 오류를 무시한다", () => {
  const f = fixture({ type: "consulting", withFlight: true, initialProgress: 0.78 });
  f.desktopQuery.matches = false; f.desktopQuery.emit("change"); f.flush();
  assert.equal(f.flightAsset.getAttribute("src"), null);
  assert.equal(f.scene.classes.has("flight-ready"), false);
  assert.equal(f.scene.classes.has("flight-unavailable"), false);
  assert.deepEqual([...f.scene.values], [["color", "inherit"]]);
  f.flightAsset.emit("error"); f.flush();
  assert.equal(f.flightAsset.getAttribute("src"), null);
  assert.equal(f.flightAsset.classes.has("ai-asset-failed"), false);
  f.controller.dispose();
});

test("프로그램 이동과 같은 hash 히스토리 복원은 다음 프레임의 최종 위치를 바로 표시한다", () => {
  for (const type of ["pingdom:navigate", "popstate"]) {
    const f = fixture({ type: "consulting", withFlight: true, initialProgress: 0.32 });
    assert.equal(f.win.count(type), 1);
    // app.js는 이동 이벤트를 먼저 알리고 같은 작업에서 instant scroll을 수행합니다.
    f.win.emit(type);
    assert.equal(f.scene.dataset.flightDisplayProgress, "0.3200");
    f.setProgress(0.78); f.win.emit("scroll"); f.flushOne();
    assert.equal(f.scene.dataset.aiProgress, "0.7800");
    assert.equal(f.scene.dataset.flightDisplayProgress, "0.7800");
    assert.equal(f.pending(), 0);
    // 사용자 스크롤 보간 중 복원되더라도 이전 항로를 이어서 재생하지 않습니다.
    f.setProgress(0.32); f.win.emit("scroll"); f.flushOne();
    assert.equal(f.scene.dataset.flightDisplayProgress, "0.3200");
    f.win.emit(type); f.setProgress(0.95); f.win.emit("scroll"); f.flushOne();
    assert.equal(f.scene.dataset.flightDisplayProgress, "0.9500");
    assert.equal(f.scene.dataset.flightPhase, "settled");
    assert.equal(f.pending(), 0);
    f.controller.stop();
    assert.equal(f.win.count(type), 0);
    f.controller.start(); f.controller.start();
    assert.equal(f.win.count(type), 1);
    f.controller.dispose();
    assert.equal(f.win.count(type), 0);
  }
});

test("비행 영상의 metadata와 첫 프레임 대기는 기존 소개 준비를 막지 않는다", () => {
  const f = fixture({ type: "consulting", withVideo: true, videoLoaded: false, initialProgress: 0.78 });
  assert.equal(f.video.getAttribute("src"), "assets/consulting-flight/seoul-night-flight.mp4");
  assert.equal(f.scene.classes.has("ai-page-prepared"), true);
  assert.equal(f.scene.classes.has("ai-page-pending"), false);
  assert.equal(f.scene.classes.has("flight-video-pending"), true);
  assert.equal(f.scene.classes.has("flight-ready"), false);
  assert.equal(f.scene.values.get("--ai-visual-opacity"), "1");
  f.video.duration = 9; f.video.videoWidth = 1920; f.video.readyState = 1;
  f.video.emit("loadedmetadata"); f.flush();
  assert.equal(f.scene.classes.has("flight-video-ready"), false);
  assert.equal(f.seeks.length, 0);
  f.decodedVideo(); f.flush();
  assert.equal(f.scene.classes.has("flight-video-ready"), true);
  assert.equal(f.scene.classes.has("flight-video-pending"), false);
  assert.equal(f.scene.dataset.flightMedia, "video");
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.7800");
  assert.ok(Math.abs(f.seeks[0] - (0.78 - 0.58) / 0.37 * 9) < 1e-10);
  assert.equal(f.pending(), 0);
  f.controller.dispose();
});

test("첫 프레임을 확인한 영상은 seek 중 decode 대기에도 준비를 유지하고 오류와 자산 해제에서 초기화한다", () => {
  const f = fixture({ type: "consulting", withVideo: true, videoDuration: 22, initialProgress: 0.58 + 0.37 * (8.3 / 22) });
  assert.equal(f.scene.classes.has("flight-video-ready"), true);
  f.video.readyState = 1;
  f.controller.refresh();
  assert.equal(f.scene.classes.has("flight-video-ready"), true);
  assert.equal(f.scene.classes.has("flight-video-pending"), false);
  f.setProgress(0.58 + 0.37 * (21.9 / 22)); f.controller.refresh();
  assert.ok(Math.abs(f.video.currentTime - 8.3) < 1e-10);
  f.finishSeek();
  assert.ok(Math.abs(f.video.currentTime - 21.9) < 1e-10);
  f.video.error = { code: 4 }; f.video.emit("error"); f.flush();
  assert.equal(f.scene.classes.has("flight-video-ready"), false);
  assert.equal(f.scene.classes.has("flight-video-unavailable"), true);
  f.video.error = null; f.video.readyState = 1; f.video.emit("loadedmetadata"); f.flush();
  assert.equal(f.scene.classes.has("flight-video-ready"), false);
  f.decodedVideo(); f.flush();
  assert.equal(f.scene.classes.has("flight-video-ready"), true);
  f.reducedQuery.matches = true; f.reducedQuery.emit("change"); f.flush();
  f.reducedQuery.matches = false; f.reducedQuery.emit("change"); f.flush();
  assert.equal(f.scene.classes.has("flight-video-ready"), false);
  assert.equal(f.scene.classes.has("flight-video-pending"), true);
  f.controller.dispose();
});

test("비행 영상은 baked 카메라와 핀만 사용하고 scroll 진행도를 영상 길이에 연결한다", () => {
  const f = fixture({ type: "consulting", withVideo: true, withFlight: true, initialProgress: 0.32 });
  assert.equal(f.scene.dataset.flightMedia, "video");
  assert.equal(f.scene.values.get("--flight-x"), "0%");
  assert.equal(f.scene.values.get("--flight-y"), "0%");
  assert.equal(f.scene.values.get("--flight-scale"), "1");
  assert.equal(f.scene.values.get("--flight-bank"), "0deg");
  assert.equal(f.scene.values.get("--flight-focus-opacity"), "0");
  assert.ok(f.flightPins.every((pin) => pin.values.get("--flight-pin-opacity") === "0" && pin.values.get("--flight-pin-ring-opacity") === "0"));
  assert.equal(f.seeks.length, 0);
  f.setProgress(0.55); f.controller.refresh();
  assert.equal(f.scene.values.get("--consult-model-scale"), "1.9");
  assert.equal(f.seeks.length, 0);
  f.setProgress(1); f.controller.refresh();
  assert.equal(f.video.currentTime, 9);
  f.finishSeek();
  f.setProgress(0.32); f.controller.refresh();
  assert.equal(f.video.currentTime, 0);
  assert.equal(f.scene.values.get("--consult-model-scale"), "1");
  f.controller.dispose();
});

test("비행 영상은 native seek 중 최신 목적지만 저장하고 seeked 때 역방향 목적지를 적용한다", () => {
  const f = fixture({ type: "consulting", withVideo: true, initialProgress: 0.78 });
  assert.equal(f.seeks.length, 1);
  const first = f.video.currentTime;
  f.setProgress(0.95); f.controller.refresh();
  f.setProgress(0.65); f.controller.refresh();
  assert.equal(f.seeks.length, 1);
  assert.equal(f.video.currentTime, first);
  f.finishSeek();
  assert.equal(f.seeks.length, 2);
  assert.ok(Math.abs(f.video.currentTime - (0.65 - 0.58) / 0.37 * 9) < 1e-10);
  f.finishSeek();
  f.win.emit("scroll"); f.flush();
  assert.equal(f.seeks.length, 2);
  f.setProgress(0.6501); f.controller.refresh();
  assert.equal(f.seeks.length, 2);
  f.controller.dispose();
});

test("비행 영상의 canplay는 진행 중인 줌 보간을 건너뛰거나 좌표를 다시 측정하지 않는다", () => {
  const f = fixture({ type: "consulting", withVideo: true, initialProgress: 0.32 });
  const reads = f.reads();
  f.setProgress(0.78); f.win.emit("scroll"); f.flushOne();
  const display = Number(f.scene.dataset.flightDisplayProgress);
  f.video.emit("canplay"); f.flushOne();
  assert.ok(Number(f.scene.dataset.flightDisplayProgress) > display && Number(f.scene.dataset.flightDisplayProgress) < 0.78);
  assert.equal(f.reads(), reads);
  f.flush();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.7800");
  assert.equal(f.pending(), 0);
  assert.equal(f.seeks.length, 1);
  f.finishSeek();
  assert.ok(Math.abs(f.video.currentTime - (0.78 - 0.58) / 0.37 * 9) < 1e-10);
  f.controller.dispose();
});

test("비행 영상 실패는 별도 준비된 사진으로 복구하고 사진마저 대기하면 소개를 보존한다", () => {
  const f = fixture({ type: "consulting", withVideo: true, withFlight: true, flightLoaded: false, initialProgress: 0.78 });
  f.video.error = { code: 4 }; f.video.readyState = 0; f.video.emit("error"); f.flush();
  assert.equal(f.scene.classes.has("flight-video-unavailable"), true);
  assert.equal(f.scene.classes.has("flight-video-ready"), false);
  assert.equal(f.scene.classes.has("ai-page-prepared"), true);
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  assert.equal(f.scene.values.get("--ai-visual-opacity"), "1");
  assert.equal(f.scene.values.has("--consult-model-opacity"), false);
  const seekCount = f.seeks.length;
  f.finishSeek();
  assert.equal(f.seeks.length, seekCount);
  f.flightAsset.complete = true; f.flightAsset.naturalWidth = 3600; f.flightAsset.emit("load"); f.flush();
  assert.equal(f.scene.dataset.flightMedia, "image");
  assert.equal(f.scene.classes.has("flight-ready"), true);
  assert.notEqual(f.scene.values.get("--flight-scale"), "1");
  assert.ok(f.flightPins.some((pin) => Number(pin.values.get("--flight-pin-opacity")) > 0));
  f.decodedVideo(); f.flush();
  assert.equal(f.scene.dataset.flightMedia, "video");
  assert.equal(f.scene.classes.has("flight-video-unavailable"), false);
  f.controller.dispose();
});

test("비행 영상은 좁은 화면과 reduced-motion에서 요청하지 않고 비활성 전환 시 버퍼를 해제한다", () => {
  for (const settings of [{ desktop: false }, { reduced: true }]) {
    const f = fixture({ type: "consulting", withVideo: true, ...settings });
    assert.equal(f.video.getAttribute("src"), null);
    assert.equal(f.seeks.length, 0);
    assert.equal(f.scene.classes.has("flight-video-ready"), false);
    f.controller.dispose();
  }
  const f = fixture({ type: "consulting", withVideo: true, initialProgress: 0.78 });
  f.reducedQuery.matches = true; f.reducedQuery.emit("change"); f.flush();
  assert.equal(f.video.getAttribute("src"), null);
  assert.equal(f.videoLoads(), 1);
  assert.equal(f.scene.classes.has("flight-video-ready"), false);
  assert.equal(f.scene.dataset.flightVideoTime, undefined);
  const seekCount = f.seeks.length;
  f.video.emit("error"); f.finishSeek();
  assert.equal(f.seeks.length, seekCount);
  assert.equal(f.scene.classes.has("flight-video-unavailable"), false);
  f.reducedQuery.matches = false; f.reducedQuery.emit("change"); f.flush();
  assert.ok(f.video.getAttribute("src"));
  f.decodedVideo(); f.flush();
  assert.equal(f.scene.dataset.flightMedia, "video");
  f.desktopQuery.matches = false; f.desktopQuery.emit("change"); f.flush();
  assert.equal(f.video.getAttribute("src"), null);
  assert.equal(f.videoLoads(), 2);
  assert.deepEqual([...f.scene.values], [["color", "inherit"]]);
  f.controller.dispose();
});

test("비행 영상은 hidden과 BFCache stop 동안 seek를 멈추고 복귀 위치를 최신 목적지로 복원한다", () => {
  const f = fixture({ type: "consulting", withVideo: true, initialProgress: 0.78 });
  const source = f.video.getAttribute("src");
  f.root.hidden = true; f.root.emit("visibilitychange");
  const seekCount = f.seeks.length;
  f.setProgress(0.9); f.finishSeek();
  assert.equal(f.seeks.length, seekCount);
  f.root.hidden = false; f.root.emit("visibilitychange"); f.flush();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.9000");
  assert.ok(Math.abs(f.video.currentTime - (0.9 - 0.58) / 0.37 * 9) < 1e-10);
  f.controller.stop();
  assert.equal(f.video.getAttribute("src"), source);
  assert.equal(f.video.count("seeked"), 0);
  f.setProgress(0.32); f.finishSeek();
  f.controller.start(); f.controller.start();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.3200");
  assert.equal(f.video.currentTime, 0);
  assert.equal(f.video.count("seeked"), 1);
  assert.ok(f.videoPauses() > 0);
  f.controller.dispose();
  assert.equal(f.video.getAttribute("src"), null);
  for (const type of ["loadedmetadata", "loadeddata", "canplay", "seeked", "error"]) assert.equal(f.video.count(type), 0);
});

test("비행 영상의 무한·빈 duration은 소개를 유지하고 seek를 시작하지 않는다", () => {
  const f = fixture({ type: "consulting", withVideo: true, videoLoaded: false, initialProgress: 0.78 });
  for (const duration of [Infinity, NaN, 0, -1]) {
    f.video.duration = duration; f.video.videoWidth = 1920; f.video.readyState = 2;
    f.video.emit("loadedmetadata"); f.flush();
    assert.equal(f.scene.classes.has("flight-video-ready"), false);
    assert.equal(f.scene.classes.has("ai-page-static"), false);
    assert.equal(f.seeks.length, 0);
  }
  f.controller.dispose();
});

test("22초 비행 영상은 도시 7.6초에서 지구와 네트워크를 거쳐 최종 21.9초 구도로 연결한다", () => {
  const city = 0.58 + 0.37 * (7.6 / 22);
  const global = 0.58 + 0.37 * (21.9 / 22);
  const f = fixture({ type: "consulting", withVideo: true, videoDuration: 22, initialProgress: city });
  assert.ok(Math.abs(f.video.currentTime - 7.6) < 1e-10);
  assert.equal(f.scene.dataset.flightPhase, "flight");
  for (const [progress, time] of [[0.58 + 0.37 * (7.8 / 22), 7.8], [0.58 + 0.37 * (11.5 / 22), 11.5], [global, 21.9], [0.95, 22], [1, 22]]) {
    f.finishSeek(); f.setProgress(progress); f.controller.refresh();
    assert.ok(Math.abs(f.video.currentTime - time) < 1e-10);
  }
  assert.equal(f.scene.dataset.flightPhase, "settled");
  f.finishSeek(); f.setProgress(city); f.controller.refresh(); f.finishSeek();
  f.setProgress(global); f.win.emit("scroll"); f.flush(); f.finishSeek();
  assert.equal(f.scene.dataset.flightDisplayProgress, global.toFixed(4));
  assert.equal(f.scene.dataset.flightVideoTime, "21.9000");
  assert.ok(Math.abs(f.video.currentTime - 21.9) < 1e-10);
  assert.equal(f.pending(), 0);
  f.finishSeek(); f.setProgress(0.32); f.controller.refresh();
  assert.equal(f.video.currentTime, 0);
  assert.equal(f.scene.dataset.flightPhase, "intro");
  f.controller.dispose();
});

test("직접 지구 상태는 소개 다음 첫 구면으로 이어지고 연결선·pullback·최종 구도를 결정적으로 복원한다", () => {
  const intro = consultingGlobeState(0.32);
  assert.equal(intro.copyOpacity, 1);
  assert.equal(intro.flightOpacity, 0);
  assert.equal(intro.modelOpacity, 0);
  assert.equal(intro.modelScale, 1);
  const reveal = consultingGlobeState(0.37);
  assert.ok(reveal.flightOpacity > 0 && reveal.flightOpacity < 1);
  assert.equal(reveal.flightProgress, 0);
  assert.equal(reveal.stage, "reveal");
  const entry = consultingGlobeState(0.40);
  assert.equal(entry.flightOpacity, 1);
  assert.equal(entry.copyOpacity, 0);
  assert.equal(entry.stage, "globe");
  for (const [seconds, stage] of [[2, "network"], [7.18, "network"], [8, "pullback"], [11.9, "settled"]]) {
    const state = consultingGlobeState(0.40 + 0.52 * seconds / 12);
    assert.ok(Math.abs(state.flightProgress * 12 - seconds) < 1e-10);
    assert.equal(state.stage, stage);
  }
  assert.deepEqual(consultingGlobeState(0.92), consultingGlobeState(1));
  const progress = [0, 0.32, 0.37, 0.40, 0.7111333333333333, 0.9156666666666667, 1];
  assert.deepEqual(progress.map(consultingGlobeState), [...progress].reverse().map(consultingGlobeState).reverse());
  for (const p of [...progress, NaN, undefined, Infinity, -Infinity]) {
    const state = consultingGlobeState(p);
    assert.ok(Object.values(state).filter(value => typeof value === "number").every(Number.isFinite));
    assert.equal(state.pins.length, 0);
    assert.equal(state.cameraScale, 1);
    assert.equal(state.cameraBank, 0);
  }
});

test("직접 지구는 제품 없는 copy-only 구성을 허용하고 제목·영상·poster 누락과 기존 traveler의 제품 누락을 정적으로 처리한다", () => {
  const valid = fixture({ withGlobe: true, initialProgress: 0.32 });
  assert.equal(valid.products.length, 0);
  assert.equal(valid.scene.classes.has("ai-page-static"), false);
  assert.equal(valid.scene.dataset.flightPhase, "intro");
  assert.ok(valid.assets.every(asset => asset.getAttribute("src") === null));
  valid.controller.dispose();
  for (const options of [{ withCopy: false }, { withHeading: false }, { withVideo: false }, { withFlight: false }, { productCount: 1 }]) {
    const f = fixture({ withGlobe: true, ...options });
    assert.equal(f.scene.classes.has("ai-page-static"), true);
    assert.equal(f.scene.classes.has("flight-ready"), false);
    assert.equal(f.scene.dataset.flightPhase, undefined);
    f.controller.dispose();
  }
  const traveler = fixture({ productCount: 0 });
  assert.equal(traveler.scene.classes.has("ai-page-static"), true);
  traveler.controller.dispose();
});

test("직접 지구의 빠른 입력은 네트워크와 최종 지점을 보간하고 역방향은 즉시 최신 native seek 목적지를 적용한다", () => {
  const network = 0.40 + 0.52 * (7.18 / 12), final = 0.40 + 0.52 * (11.9 / 12);
  const f = fixture({ withGlobe: true, initialProgress: 0.32 });
  const reads = f.reads();
  f.setProgress(network); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.dataset.aiProgress, network.toFixed(4));
  assert.ok(Number(f.scene.dataset.flightDisplayProgress) > 0.32 && Number(f.scene.dataset.flightDisplayProgress) < network);
  f.flush(); f.finishSeek(); f.finishSeek();
  assert.equal(f.scene.dataset.flightPhase, "network");
  assert.equal(f.scene.dataset.flightVideoTime, "7.1800");
  assert.ok(Math.abs(f.video.currentTime - 7.18) < 1e-10);
  f.setProgress(final); f.win.emit("scroll"); f.flush();
  assert.equal(f.scene.dataset.flightVideoTime, "11.9000");
  assert.equal(f.scene.dataset.flightPhase, "settled");
  f.setProgress(0.50); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.5000");
  assert.equal(f.pending(), 0);
  f.finishSeek();
  assert.ok(Math.abs(f.video.currentTime - (0.50 - 0.40) / 0.52 * 12) < 1e-10);
  assert.equal(f.reads(), reads);
  f.finishSeek(); f.setProgress(0.32); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.video.currentTime, 0);
  assert.equal(f.scene.dataset.flightPhase, "intro");
  f.controller.dispose();
});

test("직접 지구는 늦은 canplay를 현재 위치에 복원하고 첫 decode 이후 seek 대기에는 준비를 유지한다", () => {
  const f = fixture({ withGlobe: true, videoLoaded: false, flightLoaded: false, initialProgress: 0.7111333333333333 });
  assert.equal(f.scene.classes.has("ai-page-prepared"), true);
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  assert.equal(f.scene.classes.has("flight-ready"), false);
  f.video.duration = 12; f.video.videoWidth = 2560; f.video.readyState = 1;
  f.video.emit("loadedmetadata"); f.flush();
  assert.equal(f.seeks.length, 0);
  f.video.readyState = 2; f.video.emit("canplay"); f.flush();
  assert.equal(f.scene.classes.has("flight-video-ready"), true);
  assert.equal(f.scene.dataset.flightVideoTime, "7.1800");
  assert.ok(Math.abs(f.video.currentTime - 7.18) < 1e-10);
  f.video.readyState = 1; f.controller.refresh();
  assert.equal(f.scene.classes.has("flight-video-ready"), true);
  f.controller.dispose();
});

test("직접 지구의 영상 실패는 완성 poster로 복구하고 poster도 실패하면 읽을 수 있는 소개를 유지한다", () => {
  const f = fixture({ withGlobe: true, initialProgress: 0.9156666666666667 });
  f.video.error = { code: 4 }; f.video.readyState = 0; f.video.emit("error"); f.flush();
  assert.equal(f.scene.classes.has("flight-video-ready"), false);
  assert.equal(f.scene.classes.has("flight-video-unavailable"), true);
  assert.equal(f.scene.classes.has("flight-ready"), true);
  assert.equal(f.scene.dataset.flightMedia, "image");
  assert.equal(f.scene.values.get("--flight-scale"), "1");
  assert.equal(f.scene.values.get("--flight-opacity"), "1");
  assert.equal(f.flightPins.length, 0);
  f.flightAsset.naturalWidth = 0; f.flightAsset.emit("error"); f.flush();
  assert.equal(f.scene.classes.has("flight-ready"), false);
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  assert.equal(f.scene.values.has("--consult-copy-opacity"), false);
  const seeks = f.seeks.length;
  f.finishSeek();
  assert.equal(f.seeks.length, seeks);
  f.controller.dispose();
});

test("직접 지구는 reduced-motion에서 최종 poster만 요청하고 좁은 화면·dispose에서는 모든 새 자산을 해제한다", () => {
  const f = fixture({ withGlobe: true, reduced: true });
  assert.equal(f.video.getAttribute("src"), null);
  assert.equal(f.flightAsset.getAttribute("src"), "assets/consulting-flight/seoul-globe-poster-v14.webp");
  assert.equal(f.scene.classes.has("ai-page-static"), true);
  assert.equal(f.scene.dataset.flightPhase, undefined);
  assert.equal(f.seeks.length, 0);
  f.desktopQuery.matches = false; f.desktopQuery.emit("change"); f.flush();
  assert.equal(f.flightAsset.getAttribute("src"), null);
  f.flightAsset.emit("error"); f.video.emit("error"); f.flush();
  assert.equal(f.flightAsset.getAttribute("src"), null);
  f.controller.dispose();
  const narrow = fixture({ withGlobe: true, desktop: false });
  assert.equal(narrow.video.getAttribute("src"), null);
  assert.equal(narrow.flightAsset.getAttribute("src"), null);
  narrow.controller.dispose();
});

test("직접 지구의 hidden·BFCache·히스토리 복원은 보간을 중단하고 현재 위치의 구도를 바로 재구성한다", () => {
  const f = fixture({ withGlobe: true, initialProgress: 0.32 });
  f.setProgress(0.9156666666666667); f.win.emit("scroll"); f.flushOne();
  f.root.hidden = true; f.root.emit("visibilitychange");
  assert.equal(f.pending(), 0);
  f.setProgress(0.7111333333333333); f.finishSeek();
  f.root.hidden = false; f.root.emit("visibilitychange"); f.flush();
  assert.equal(f.scene.dataset.flightVideoTime, "7.1800");
  f.controller.stop();
  assert.equal(f.video.count("seeked"), 0);
  f.finishSeek(); f.setProgress(0.9156666666666667); f.controller.start();
  assert.equal(f.scene.dataset.flightVideoTime, "11.9000");
  assert.equal(f.pending(), 0);
  f.win.emit("pingdom:navigate"); f.setProgress(0.32); f.flush();
  assert.equal(f.scene.dataset.flightPhase, "intro");
  assert.equal(f.pending(), 0);
  f.controller.dispose();
  assert.equal(f.flightAsset.getAttribute("src"), null);
  assert.equal(f.video.getAttribute("src"), null);
  assert.equal(f.video.count("canplay"), 0);
});

test("모델 지구는 원래 소개 뒤 1.4배 이하의 짧은 초점을 거쳐 야경 없이 첫 구면과 연결선으로 전환한다", () => {
  const state = p => consultingGlobeState(p, true);
  const intro = state(0.32);
  assert.equal(intro.modelOpacity, 1);
  assert.equal(intro.modelScale, 1);
  assert.equal(intro.copyOpacity, 1);
  assert.equal(intro.flightOpacity, 0);
  assert.equal(state(0.55).modelScale, 1.4);
  assert.ok(Math.abs(state(0.455).modelScale - Math.sqrt(1.4)) < 1e-10);
  assert.equal(state(0.46).copyOpacity, 0);
  assert.equal(state(0.46).flightOpacity, 0);
  assert.equal(state(0.55).modelOpacity, 1);
  assert.equal(state(0.55).flightProgress, 0);
  const entry = state(0.58);
  assert.equal(entry.modelOpacity, 0);
  assert.equal(entry.flightOpacity, 1);
  assert.equal(entry.flightProgress, 0);
  assert.equal(entry.stage, "globe");
  for (const [seconds, stage] of [[2, "network"], [7.18, "network"], [8, "pullback"], [11.9, "settled"]]) {
    const pose = state(0.58 + 0.37 * seconds / 12);
    assert.ok(Math.abs(pose.flightProgress * 12 - seconds) < 1e-10);
    assert.equal(pose.stage, stage);
  }
  const progress = Array.from({ length: 101 }, (_, i) => i / 100);
  assert.deepEqual(progress.map(state), [...progress].reverse().map(state).reverse());
  for (const pose of [...progress.map(state), state(NaN), state(Infinity), state(-Infinity)]) {
    assert.ok(pose.modelScale >= 1 && pose.modelScale <= 1.4);
    assert.ok(Math.abs(pose.modelY) <= 0.04);
    assert.equal(pose.pins.length, 0);
    assert.equal(pose.cameraX, 0);
    assert.equal(pose.cameraY, 0);
    assert.equal(pose.cameraScale, 1);
    assert.equal(pose.cameraBank, 0);
    assert.ok(Object.values(pose).filter(value => typeof value === "number").every(Number.isFinite));
  }
  assert.deepEqual(state(0.95), state(1));
});

test("모델 지구는 실제 제품 한 개와 원본·공식 핀 준비를 요구하고 누락·필수 자산 실패에는 정적으로 복구한다", () => {
  const f = fixture({ withModel: true, loaded: false, initialProgress: 0.32 });
  assert.equal(f.products.length, 1);
  assert.deepEqual(f.assets.map(asset => asset.getAttribute("src")), ["assets/ai-refresh/consulting-neighborhood-base-v13.png", "assets/consulting-flight/pingdom-pin-clean.webp"]);
  assert.equal(f.scene.classes.has("ai-page-pending"), true);
  assert.equal(f.scene.classes.has("flight-ready"), false);
  f.assets[0].complete = true; f.assets[0].naturalWidth = 1536; f.assets[0].emit("load"); f.flush();
  assert.equal(f.scene.classes.has("ai-page-pending"), true);
  f.assets[1].complete = true; f.assets[1].naturalWidth = 1254; f.assets[1].emit("load"); f.flush();
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  assert.equal(f.scene.dataset.flightPhase, "intro");
  assert.equal(f.scene.values.get("--consult-model-opacity"), "1");
  f.assets[1].naturalWidth = 0; f.assets[1].emit("error"); f.flush();
  assert.equal(f.scene.classes.has("ai-page-static"), true);
  assert.equal(f.scene.classes.has("flight-ready"), false);
  assert.equal(f.scene.dataset.flightPhase, undefined);
  f.controller.dispose();
  for (const options of [{ productCount: 0 }, { productCount: 2 }, { withHeading: false }]) {
    const invalid = fixture({ withModel: true, ...options });
    assert.equal(invalid.scene.classes.has("ai-page-static"), true);
    invalid.controller.dispose();
  }
});

test("모델 지구의 큰 이동은 2400ms 안에 네트워크·최종 구도로 수렴하고 역방향 native seek는 최신 위치를 따른다", () => {
  const network = 0.58 + 0.37 * (7.18 / 12), final = 0.58 + 0.37 * (11.9 / 12);
  for (const [from, target] of [[0.32, network], [network, final]]) {
    let current = from, frames = 0;
    while (current !== target) {
      const next = consultingFlightStep(current, target, 16, true);
      assert.ok(next > current && next <= target);
      current = next;
      assert.ok(++frames < 150);
    }
    assert.ok(frames * 16 < 2200);
  }
  const f = fixture({ withModel: true, initialProgress: 0.32 });
  const reads = f.reads();
  f.setProgress(network); f.win.emit("scroll"); f.flushOne();
  assert.ok(Number(f.scene.dataset.flightDisplayProgress) < 0.36);
  f.flush(); f.finishSeek(); f.finishSeek();
  assert.equal(f.scene.dataset.flightPhase, "network");
  assert.equal(f.scene.dataset.flightVideoTime, "7.1800");
  assert.ok(Math.abs(f.video.currentTime - 7.18) < 1e-10);
  f.setProgress(final); f.win.emit("scroll"); f.flushOne();
  assert.ok(Number(f.scene.dataset.flightDisplayProgress) < final);
  f.setProgress(0.83); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.8300");
  assert.equal(f.pending(), 0);
  f.finishSeek();
  assert.ok(Math.abs(f.video.currentTime - (0.83 - 0.58) / 0.37 * 12) < 1e-10);
  f.finishSeek(); f.setProgress(final); f.controller.refresh();
  assert.equal(f.scene.dataset.flightVideoTime, "11.9000");
  assert.equal(f.scene.dataset.flightPhase, "settled");
  assert.equal(f.scene.values.get("--consult-model-opacity"), "0");
  assert.equal(f.reads(), reads + 2);
  f.controller.dispose();
});

test("250ms 정지 중에는 큰 전진도 부드럽게 수렴해 네트워크와 최종 구도를 정지 해제 전에 표시한다", () => {
  const network = 0.58 + 0.37 * (7.18 / 12), final = 0.58 + 0.37 * (11.9 / 12);
  for (const dt of [16, 33]) {
    for (const [from, target] of [[0, network], [0.32, network], [network, final]]) {
      let current = from, elapsed = 0;
      while (current !== target && elapsed < 250) {
        const next = consultingFlightStep(current, target, dt, true, true);
        assert.ok(next > current && next <= target);
        current = next;
        elapsed += dt;
      }
      assert.equal(current, target);
      assert.ok(elapsed < 250);
    }
  }
  assert.equal(consultingFlightStep(final, 0.70, 16, true, true), 0.70);
  const f = fixture({ withModel: true, initialProgress: 0.32 });
  for (const [id, target, seconds] of [['consulting-network', network, 7.18], ['consulting-global', final, 11.9]]) {
    f.root.documentElement.dataset.scrollStop = id;
    f.setProgress(target); f.win.emit('scroll');
    f.flushOne();
    assert.ok(Number(f.scene.dataset.flightDisplayProgress) < target);
    let frames = 1;
    while (f.pending()) { f.finishSeek(); f.flushOne(); assert.ok(++frames < 16); }
    assert.ok(frames * 16 < 250);
    f.finishSeek(); f.finishSeek();
    assert.ok(Math.abs(Number(f.scene.dataset.flightDisplayProgress) - target) < 0.0001);
    assert.ok(Math.abs(f.video.currentTime - seconds) < 1e-8);
    delete f.root.documentElement.dataset.scrollStop;
  }
  f.controller.dispose();
});

test("모델 지구는 decode 대기에도 준비를 유지하며 영상 실패 시 야경 대신 중립 카메라의 최종 poster로 복구한다", () => {
  const final = 0.58 + 0.37 * (11.9 / 12);
  const f = fixture({ withModel: true, initialProgress: final });
  f.video.readyState = 1; f.controller.refresh();
  assert.equal(f.scene.classes.has("flight-video-ready"), true);
  f.video.error = { code: 4 }; f.video.emit("error"); f.flush();
  assert.equal(f.scene.classes.has("flight-video-ready"), false);
  assert.equal(f.scene.classes.has("flight-ready"), true);
  assert.equal(f.scene.dataset.flightMedia, "image");
  assert.equal(f.scene.values.get("--flight-scale"), "1");
  assert.equal(f.scene.values.get("--flight-bank"), "0deg");
  assert.equal(f.scene.values.get("--consult-model-opacity"), "0");
  assert.equal(f.flightPins.length, 0);
  f.flightAsset.naturalWidth = 0; f.flightAsset.emit("error"); f.flush();
  assert.equal(f.scene.classes.has("flight-ready"), false);
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  assert.equal(f.scene.values.has("--consult-model-opacity"), false);
  f.controller.dispose();
});

test("모델 지구는 reduced-motion에서 모델과 poster만 제공하고 hidden·BFCache·narrow 복원은 현재 위치로 재개한다", () => {
  const reduced = fixture({ withModel: true, reduced: true });
  assert.ok(reduced.assets.every(asset => asset.getAttribute("src")));
  assert.ok(reduced.flightAsset.getAttribute("src"));
  assert.equal(reduced.video.getAttribute("src"), null);
  assert.equal(reduced.scene.classes.has("ai-page-static"), true);
  assert.equal(reduced.scene.values.has("--consult-model-scale"), false);
  reduced.controller.dispose();
  const f = fixture({ withModel: true, initialProgress: 0.32 });
  f.setProgress(0.8013833333333333); f.win.emit("scroll"); f.flushOne();
  f.root.hidden = true; f.root.emit("visibilitychange");
  assert.equal(f.pending(), 0);
  f.setProgress(0.9469166666666666); f.finishSeek();
  f.root.hidden = false; f.root.emit("visibilitychange"); f.flush();
  assert.equal(f.scene.dataset.flightVideoTime, "11.9000");
  f.controller.stop(); f.finishSeek(); f.setProgress(0.32); f.controller.start();
  assert.equal(f.scene.dataset.flightPhase, "intro");
  assert.equal(f.scene.values.get("--consult-model-scale"), "1");
  f.desktopQuery.matches = false; f.desktopQuery.emit("change"); f.flush();
  assert.ok(f.assets.every(asset => asset.getAttribute("src") === null));
  assert.equal(f.video.getAttribute("src"), null);
  assert.equal(f.flightAsset.getAttribute("src"), null);
  f.controller.dispose();
});


test("한국 제목은 연결선 완성까지 유지하고 줌아웃 중 세계 제목으로 전환되며 역방향도 복원한다", () => {
  for (const seconds of [0, 1.2, 7.18, 8]) {
    assert.deepEqual(consultingGlobeTitleState(seconds), { koreaOpacity: 1, globalOpacity: 0 });
  }
  for (const seconds of [9.2, 11.9, 12]) {
    assert.deepEqual(consultingGlobeTitleState(seconds), { koreaOpacity: 0, globalOpacity: 1 });
  }
  const times = Array.from({ length: 121 }, (_, i) => i / 10);
  assert.deepEqual(times.map(consultingGlobeTitleState), [...times].reverse().map(consultingGlobeTitleState).reverse());
  for (const seconds of [...times, NaN, undefined, Infinity, -Infinity]) {
    const title = consultingGlobeTitleState(seconds);
    assert.ok(Object.values(title).every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    assert.equal(title.koreaOpacity * title.globalOpacity, 0);
  }
});

test("한국 정지와 최종 지구의 제목은 영상 진행도에 맞고 영상 실패 시 세계 메시지로 복구한다", () => {
  const f = fixture({ withModel: true, initialProgress: .58 + .37 * (1.2 / 12) });
  assert.equal(f.scene.values.get("--globe-korea-title"), "1");
  assert.equal(f.scene.values.get("--globe-global-title"), "0");
  f.finishSeek(); f.setProgress(.58 + .37 * (11.9 / 12)); f.controller.refresh();
  assert.equal(f.scene.values.get("--globe-korea-title"), "0");
  assert.equal(f.scene.values.get("--globe-global-title"), "1");
  f.video.error = { code: 4 }; f.video.emit("error"); f.flush();
  assert.equal(f.scene.values.get("--globe-global-title"), "1");
  f.controller.dispose();
  assert.equal(f.scene.values.has("--globe-global-title"), false);
});

test("글로벌 비전은 한국 지도에서 큰 네트워크 구면으로 전환하고 추가 후퇴 없이 역방향 상태를 복원한다", () => {
  const intro = globalVisionState(.22);
  assert.equal(intro.stage, "intro");
  assert.equal(intro.copyOpacity, 1);
  assert.equal(intro.copyY, 0);
  assert.equal(intro.flightOpacity, 0);
  assert.equal(intro.flightProgress, 0);
  assert.equal(intro.videoSeconds, 0);
  assert.equal(intro.mapOpacity, 1);
  assert.equal(intro.mapX, 22);
  assert.equal(intro.mapScale, .92);
  assert.equal(intro.titleOpacity, 0);
  assert.equal(globalVisionState(.25).stage, "reveal");
  assert.equal(globalVisionState(.33).copyOpacity, 0);
  assert.ok(globalVisionState(.34).flightOpacity > 0 && globalVisionState(.34).flightOpacity < 1);
  const entry = globalVisionState(.42);
  assert.equal(entry.stage, "globe");
  assert.equal(entry.flightProgress, 0);
  assert.equal(entry.flightOpacity, 1);
  assert.equal(entry.mapOpacity, 0);
  assert.equal(entry.mapX, 0);
  assert.equal(entry.mapScale, 1);
  assert.equal(entry.titleOpacity, 1);
  for (const [seconds, stage] of [[1.2,"globe"], [6,"network"], [7.184,"settled"]]) {
    const state = globalVisionState(globalProgress(seconds));
    assert.ok(Math.abs(state.videoSeconds - seconds) < 1e-10);
    assert.equal(state.stage, stage);
    assert.equal(state.modelOpacity, 0);
    assert.deepEqual(state.pins, []);
  }
  const progress = Array.from({ length: 1001 }, (_, index) => index / 1000);
  assert.deepEqual(progress.map(globalVisionState), [...progress].reverse().map(globalVisionState).reverse());
  let mapX = 22, mapScale = .92;
  for (const state of progress.map(globalVisionState)) {
    assert.ok(state.mapX <= mapX && state.mapX >= 0);
    assert.ok(state.mapScale >= mapScale && state.mapScale <= 1);
    assert.ok(state.mapOpacity >= 0 && state.mapOpacity <= 1);
    assert.ok(state.videoSeconds >= 0 && state.videoSeconds <= 7.184);
    assert.notEqual(state.stage, "pullback");
    assert.ok(state.copyY >= -32 && state.copyY <= 0);
    mapX = state.mapX;
    mapScale = state.mapScale;
  }
  for (const p of [...progress, NaN, undefined, Infinity, -Infinity]) {
    const state = globalVisionState(p);
    assert.ok(Object.values(state).filter(value => typeof value === "number").every(Number.isFinite));
  }
  assert.deepEqual(globalVisionState(-1), globalVisionState(0));
  assert.deepEqual(globalVisionState(2), globalVisionState(1));
  assert.deepEqual(globalVisionState(.90), globalVisionState(1));
});

test("글로벌 제목은 6.25~7.05초에 순차 전환하고 기존 Consulting 12초 제목 계약을 유지한다", () => {
  assert.deepEqual(globalVisionTitleState(6.25), { koreaOpacity: 1, globalOpacity: 0 });
  assert.deepEqual(globalVisionTitleState(6.65), { koreaOpacity: 0, globalOpacity: 0 });
  assert.deepEqual(globalVisionTitleState(7.05), { koreaOpacity: 0, globalOpacity: 1 });
  assert.deepEqual(globalVisionTitleState(7.184), globalVisionTitleState(20));
  assert.deepEqual(globalVisionTitleState(NaN), globalVisionTitleState(0));
  assert.deepEqual(consultingGlobeTitleState(7.05), { koreaOpacity: 1, globalOpacity: 0 });
  const times = [0, 1.2, 6.25, 6.45, 6.65, 6.85, 7.05, 7.184];
  assert.deepEqual(times.map(globalVisionTitleState), [...times].reverse().map(globalVisionTitleState).reverse());
});

test("활성 HTML은 Consulting 모델을 유지하고 글로벌에 v29 흰 연결선 미디어와 한국 지도를 한 번만 연결한다", () => {
  const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
  const article = id => html.match(new RegExp(`<article\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<\\/article>`))?.[0];
  const consulting = article("ai-consulting"), global = article("global-vision");
  assert.ok(consulting && global);
  assert.ok(html.indexOf(consulting) < html.indexOf(global));
  assert.match(consulting, /data-consulting-model/);
  assert.match(consulting, /consulting-neighborhood-base-v13\.png/);
  assert.match(consulting, /pingdom-pin-clean\.webp/);
  assert.equal((consulting.match(/data-ai-product/g) ?? []).length, 1);
  assert.doesNotMatch(consulting, /data-consulting-(?:flight|globe)|data-flight-(?:video|image)/);
  assert.match(global, /data-ai-page="global"/);
  assert.match(global, /data-global-vision/);
  assert.doesNotMatch(global, /data-ai-product|data-consulting-model/);
  assert.equal((global.match(/data-flight-video/g) ?? []).length, 1);
  assert.equal((global.match(/data-flight-image/g) ?? []).length, 1);
  assert.match(global, /korea-global-flight-v29\.mp4/);
  assert.match(global, /korea-globe-poster-v29\.webp/);
  assert.match(global, /global-globe-poster-v29\.webp/);
  assert.doesNotMatch(global, /global-vision-orbit|consulting-flight-camera[^>]*clip-path/);
  const manifest = JSON.parse(readFileSync(new URL("../dist/assets/consulting-flight/global-flight-manifest-v29.json", import.meta.url), "utf8"));
  assert.equal(manifest.version, 29);
  assert.equal(manifest.duration_seconds, 7.2);
  assert.equal(manifest.runtime_end_seconds, 7.184);
  assert.equal(manifest.network_routes.count, 32);
  assert.equal(manifest.style_values.route_color_hex, "#FFFFFF");
  assert.equal(manifest.style_values.hub_brand_hex, "#FF1956");
  for (const asset of [manifest.output, ...manifest.posters]) {
    const buffer = readFileSync(new URL("../" + asset.file, import.meta.url));
    assert.equal(buffer.length, asset.bytes);
    assert.equal(createHash("sha256").update(buffer).digest("hex"), asset.sha256);
  }
});

test("Consulting 독립 모델은 끝까지 제품과 문구를 유지하며 글로벌 영상의 준비 상태를 요구하지 않는다", () => {
  const consulting = fixture({ type: "consulting", withModel: true, withGlobe: false,
    withFlight: false, withVideo: false, initialProgress: .32 });
  const global = globalFixture({ videoLoaded: false, flightLoaded: false, initialProgress: .22 });
  assert.equal(consulting.products.length, 1);
  assert.equal(global.products.length, 0);
  for (const p of [.32, .7, 1]) {
    consulting.setProgress(p); consulting.controller.refresh();
    assert.equal(consulting.scene.classes.has("ai-page-prepared"), true);
    assert.equal(consulting.scene.classes.has("ai-page-static"), false);
    assert.equal(consulting.scene.values.get("--ai-visual-opacity"), "1");
    assert.equal(consulting.scene.values.get("--ai-visual-scale"), "1");
    assert.equal(consulting.scene.values.has("--consult-copy-opacity"), false);
    assert.equal(consulting.scene.values.has("--consult-model-opacity"), false);
    assert.equal(consulting.scene.dataset.flightPhase, undefined);
    assert.equal(consulting.video.getAttribute("src"), null);
    assert.deepEqual(consulting.seeks, []);
  }
  global.video.error = { code: 4 }; global.video.emit("error"); global.flush();
  assert.equal(consulting.scene.classes.has("ai-page-prepared"), true);
  assert.equal(consulting.scene.classes.has("ai-page-static"), false);
  consulting.controller.dispose(); global.controller.dispose();
});

test("글로벌 영상은 자체 구간에서 한국·네트워크·세계의 시간과 native 제목을 연결한다", () => {
  const f = globalFixture({ initialProgress: .22 });
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  assert.equal(f.scene.dataset.flightPhase, "intro");
  assert.equal(f.scene.values.get("--consult-copy-opacity"), "1");
  assert.equal(f.scene.values.get("--flight-opacity"), "0");
  assert.equal(f.scene.values.get("--global-map-opacity"), "1");
  assert.equal(f.scene.values.get("--global-map-x"), "22%");
  assert.equal(f.scene.values.get("--global-map-scale"), "0.92");
  assert.equal(f.scene.values.get("--global-title-opacity"), "0");
  for (const [seconds, stage] of [[1.2,"globe"], [6,"network"], [7.184,"settled"]]) {
    f.setProgress(globalProgress(seconds)); f.controller.refresh(); f.finishSeek();
    assert.equal(f.scene.dataset.flightPhase, stage);
    assert.equal(f.scene.dataset.flightVideoTime, seconds.toFixed(4));
    assert.ok(Math.abs(f.video.currentTime - seconds) < 1e-8);
    assert.equal(f.scene.values.get("--globe-korea-title"), seconds < 6.25 ? "1" : "0");
    assert.equal(f.scene.values.get("--globe-global-title"), seconds < 6.25 ? "0" : "1");
    assert.equal(f.scene.values.get("--flight-scale"), "1");
    assert.equal(f.scene.values.get("--flight-bank"), "0deg");
    assert.equal(f.scene.values.get("--global-map-opacity"), "0");
    assert.equal(f.scene.values.get("--global-map-x"), "0%");
    assert.equal(f.scene.values.get("--global-map-scale"), "1");
    assert.equal(f.scene.values.get("--global-title-opacity"), "1");
  }
  f.controller.dispose();
});

test("global 정지 ID의 빠른 입력은 250ms 전에 실제 해당 영상 구도로 수렴한다", () => {
  const f = globalFixture({ initialProgress: .22 });
  for (const [id, seconds] of [["global-korea",1.2], ["global-world",7.184]]) {
    f.root.documentElement.dataset.scrollStop = id;
    const target = globalProgress(seconds);
    f.setProgress(target); f.win.emit("scroll"); f.flushOne();
    let frames = 1;
    while (f.pending()) { f.finishSeek(); f.flushOne(); assert.ok(++frames < 16); }
    assert.ok(frames * 16 < 250);
    f.finishSeek(); f.finishSeek();
    assert.ok(Math.abs(Number(f.scene.dataset.flightDisplayProgress) - target) < .0001);
    assert.ok(Math.abs(f.video.currentTime - seconds) < 1e-8);
    delete f.root.documentElement.dataset.scrollStop;
  }
  f.controller.dispose();
});

test("글로벌 느린 입력 뒤 빠른 이탈은 진행도를 즉시 맞추고 seek 지연 중에도 종료 poster를 표시한다", () => {
  const f = globalFixture({ initialProgress: globalProgress(1.2) });
  f.finishSeek();
  for (const seconds of [1.24, 1.30, 1.4]) {
    const target = globalProgress(seconds);
    f.setProgress(target); f.win.emit("scroll"); f.flushOne();
    assert.equal(f.scene.dataset.flightDisplayProgress, target.toFixed(4));
    assert.equal(f.scene.dataset.flightVideoTime, seconds.toFixed(4));
    assert.equal(f.pending(), 0);
  }
  // 이전 seek를 완료하지 않고 화면이 구간 끝을 넘는 실제 순서를 재현합니다.
  assert.equal(f.video.seeking, true);
  f.setProgress(.95); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.dataset.flightDisplayProgress, "0.9500");
  assert.equal(f.scene.dataset.flightPhase, "settled");
  assert.equal(f.scene.dataset.flightVideoTime, "7.1840");
  assert.equal(f.scene.dataset.flightMedia, "image");
  assert.equal(f.scene.classes.has("flight-final-frame"), true);
  assert.equal(f.scene.values.get("--globe-global-title"), "1");
  assert.ok(f.video.currentTime < 7.184);
  assert.equal(f.pending(), 0);
  f.flush();
  assert.equal(f.pending(), 0);
  f.finishSeek(); f.finishSeek();
  assert.equal(f.video.currentTime, 7.184);
  assert.equal(f.video.paused, true);
  f.setProgress(1); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.classes.has("flight-final-frame"), true);
  assert.equal(f.pending(), 0);
  const reverse = globalProgress(2.5);
  f.setProgress(reverse); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.dataset.flightDisplayProgress, reverse.toFixed(4));
  assert.equal(f.scene.classes.has("flight-final-frame"), false);
  assert.equal(f.scene.dataset.flightMedia, "video");
  assert.equal(f.pending(), 0);
  f.controller.dispose();
  assert.equal(f.scene.classes.has("flight-final-frame"), false);
});

test("글로벌 종료 poster는 준비 후 표시하며 실패·narrow 전환에서 잔여 표시를 정리한다", () => {
  const f = globalFixture({ initialProgress: .90, flightLoaded: false });
  assert.equal(f.scene.classes.has("flight-final-frame"), false);
  assert.equal(f.scene.dataset.flightMedia, "video");
  f.flightAsset.complete = true; f.flightAsset.naturalWidth = 2560;
  f.flightAsset.emit("load"); f.flush();
  assert.equal(f.scene.classes.has("flight-final-frame"), true);
  assert.equal(f.scene.dataset.flightMedia, "image");
  f.flightAsset.naturalWidth = 0; f.flightAsset.emit("error"); f.flush();
  assert.equal(f.scene.classes.has("flight-final-frame"), false);
  assert.equal(f.scene.dataset.flightMedia, "video");
  f.flightAsset.naturalWidth = 2560; f.flightAsset.emit("load"); f.flush();
  assert.equal(f.scene.classes.has("flight-final-frame"), true);
  f.desktopQuery.matches = false; f.desktopQuery.emit("change"); f.flush();
  assert.equal(f.scene.classes.has("flight-final-frame"), false);
  assert.equal(f.scene.dataset.flightDisplayProgress, undefined);
  assert.equal(f.pending(), 0);
  f.controller.dispose();
});

test("글로벌 최종 구도는 .90 이후 7.184초에 고정되며 metadata 길이를 넘겨 seek하지 않는다", () => {
  for (const duration of [7.2, 6.5, 12]) {
    const f = globalFixture({ videoDuration: duration, initialProgress: .22 });
    for (const p of [.90, .95, 1]) {
      f.setProgress(p); f.controller.refresh(); f.finishSeek();
      assert.equal(f.scene.dataset.flightPhase, "settled");
      assert.ok(Math.abs(f.video.currentTime - Math.min(7.184, duration)) < 1e-8);
      assert.equal(f.scene.values.get("--globe-global-title"), "1");
    }
    assert.ok(f.seeks.every(time => time <= duration && time <= 7.184));
    assert.equal(f.pending(), 0);
    f.controller.dispose();
  }
});

test("글로벌 세계 정지의 픽셀 반올림과 한 프레임 미만 차이는 마지막 연결선 프레임까지 seek한다", () => {
  const f = globalFixture({ initialProgress: globalProgress(7.174) });
  f.finishSeek();
  f.setProgress(.90);
  f.win.scrollY = Math.floor(f.win.scrollY);
  f.controller.refresh();
  f.finishSeek();
  assert.equal(f.scene.dataset.flightPhase, "settled");
  assert.equal(f.scene.dataset.flightVideoTime, "7.1840");
  assert.equal(f.video.currentTime, 7.184);
  assert.equal(f.scene.values.get("--globe-global-title"), "1");
  assert.equal(f.pending(), 0);
  f.setProgress(globalProgress(6));
  f.controller.refresh(); f.finishSeek();
  assert.equal(f.scene.dataset.flightPhase, "network");
  assert.ok(Math.abs(f.video.currentTime - 6) < 1e-8);
  f.controller.dispose();
});

test("글로벌 역방향은 전진 보간을 즉시 취소하고 pending seek에는 최신 목적지만 남긴다", () => {
  const f = globalFixture({ initialProgress: globalProgress(6) });
  assert.equal(f.video.seeking, true);
  f.setProgress(globalProgress(7.184)); f.win.emit("scroll"); f.flushOne();
  const reverse = globalProgress(2.5);
  f.setProgress(reverse); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.dataset.flightDisplayProgress, reverse.toFixed(4));
  assert.equal(f.scene.dataset.flightVideoTime, "2.5000");
  assert.equal(f.pending(), 0);
  assert.ok(Math.abs(f.video.currentTime - 6) < 1e-8);
  f.finishSeek();
  assert.ok(Math.abs(f.video.currentTime - 2.5) < 1e-8);
  f.controller.dispose();
});

test("글로벌 늦은 decode와 미디어 실패는 독립 소개·완성 poster·현재 영상 시간을 복구한다", () => {
  const f = globalFixture({ videoLoaded: false, flightLoaded: false, initialProgress: globalProgress(7.184) });
  assert.equal(f.scene.classes.has("ai-page-prepared"), true);
  assert.equal(f.scene.classes.has("flight-ready"), false);
  f.decodedVideo(); f.flush(); f.finishSeek();
  assert.equal(f.scene.classes.has("flight-video-ready"), true);
  assert.equal(f.scene.dataset.flightVideoTime, "7.1840");
  f.video.readyState = 1; f.controller.refresh();
  assert.equal(f.scene.classes.has("flight-video-ready"), true);
  f.flightAsset.complete = true; f.flightAsset.naturalWidth = 2560; f.flightAsset.emit("load"); f.flush();
  f.video.error = { code: 4 }; f.video.emit("error"); f.flush();
  assert.equal(f.scene.classes.has("flight-video-ready"), false);
  assert.equal(f.scene.classes.has("flight-ready"), true);
  assert.equal(f.scene.dataset.flightMedia, "image");
  assert.equal(f.scene.values.get("--globe-global-title"), "1");
  assert.equal(f.scene.values.get("--flight-scale"), "1");
  f.flightAsset.naturalWidth = 0; f.flightAsset.emit("error"); f.flush();
  assert.equal(f.scene.classes.has("flight-ready"), false);
  assert.equal(f.scene.classes.has("ai-page-prepared"), true);
  assert.equal(f.scene.dataset.flightVideoTime, undefined);
  f.controller.dispose();
});

test("글로벌 한국 지도 준비는 runway를 유지하고 필수 지도 실패에는 정적 세계 poster로 복구한다", () => {
  const f = globalFixture({ loaded: false, initialProgress: .22 });
  assert.equal(f.assets.length, 1);
  assert.equal(f.assets[0].getAttribute("src"), "assets/consulting-flight/korea-globe-poster-v29.webp");
  assert.equal(f.scene.classes.has("ai-page-pending"), true);
  assert.equal(f.scene.values.has("--global-map-x"), false);
  f.assets[0].complete = true; f.assets[0].naturalWidth = 2560; f.assets[0].emit("load"); f.flush();
  assert.equal(f.scene.classes.has("ai-page-static"), false);
  assert.equal(f.scene.values.get("--global-map-x"), "22%");
  f.assets[0].naturalWidth = 0; f.assets[0].emit("error"); f.flush();
  assert.equal(f.scene.classes.has("ai-page-static"), true);
  assert.equal(f.scene.classes.has("flight-ready"), false);
  assert.equal(f.scene.dataset.flightVideoTime, undefined);
  assert.equal(f.scene.values.has("--global-map-opacity"), false);
  assert.ok(f.flightAsset.getAttribute("src"));
  f.controller.dispose();
});

test("독립 글로벌은 reduced-motion에서 poster만 제공하고 narrow·hidden·BFCache·dispose에서 자산과 RAF를 정리한다", () => {
  const reduced = globalFixture({ reduced: true });
  assert.equal(reduced.scene.classes.has("ai-page-static"), true);
  assert.ok(reduced.flightAsset.getAttribute("src"));
  assert.equal(reduced.video.getAttribute("src"), null);
  assert.equal(reduced.scene.values.has("--flight-opacity"), false);
  reduced.controller.dispose();
  const f = globalFixture({ initialProgress: .22 });
  f.setProgress(globalProgress(6)); f.win.emit("scroll"); f.flushOne();
  f.root.hidden = true; f.root.emit("visibilitychange");
  assert.equal(f.pending(), 0);
  f.setProgress(globalProgress(7.184)); f.finishSeek();
  f.root.hidden = false; f.root.emit("visibilitychange"); f.flush();
  assert.equal(f.scene.dataset.flightVideoTime, "7.1840");
  f.controller.stop();
  assert.equal(f.pending(), 0);
  assert.equal(f.win.count("scroll"), 0);
  f.setProgress(.22); f.finishSeek(); f.controller.start(); f.controller.start();
  assert.equal(f.win.count("scroll"), 1);
  assert.equal(f.scene.dataset.flightPhase, "intro");
  f.desktopQuery.matches = false; f.desktopQuery.emit("change"); f.flush();
  assert.equal(f.flightAsset.getAttribute("src"), null);
  assert.equal(f.video.getAttribute("src"), null);
  assert.equal(f.scene.dataset.flightProgress, undefined);
  assert.deepEqual([...f.scene.values], [["color","inherit"]]);
  f.controller.dispose();
  assert.equal(f.pending(), 0);
  assert.equal(f.win.count("scroll"), 0);
  for (const event of ["loadedmetadata","loadeddata","canplay","seeked","error"]) assert.equal(f.video.count(event), 0);
});

test("모바일 AI 두 소개는 같은 고해상도 자산과 이름을 정적 제공하고 스크롤 RAF를 남기지 않는다", () => {
  for (const options of [{ type: "traveler" }, { type: "consulting", withModel: true, withGlobe: false, withFlight: false, withVideo: false }]) {
    const f = fixture({ desktop: false, compact: true, viewportHeight: 844, ...options });
    assert.equal(f.wrapper.classes.has("ai-pages-mobile"), true);
    assert.equal(f.scene.classes.has("ai-page-static"), true);
    assert.ok(f.assets.every(asset => asset.getAttribute("src") === asset.dataset.desktopSrc));
    assert.equal(f.aiSection.getAttribute("aria-labelledby"), null);
    assert.equal(f.aiSection.getAttribute("aria-label"), "핑덤 AI 서비스");
    f.win.emit("scroll"); f.flush();
    assert.equal(f.scene.dataset.aiProgress, undefined);
    assert.equal(f.pending(), 0);
    f.controller.dispose();
    assert.equal(f.wrapper.classes.has("ai-pages-mobile"), false);
    assert.equal(f.aiSection.getAttribute("aria-labelledby"), "ai-title");
    assert.ok(f.assets.every(asset => !asset.getAttribute("src")));
  }
});

test("모바일 글로벌은 빠른 입력을 직접 seek하고 decode 지연에는 최종 poster, 역방향에는 영상으로 복구한다", () => {
  const f = globalFixture({ desktop: false, compact: true, viewportHeight: 844, initialProgress: globalProgress(1.2) });
  assert.ok(f.video.getAttribute("src"));
  const target = globalProgress(3.6);
  f.setProgress(target); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.dataset.flightDisplayProgress, target.toFixed(4));
  assert.equal(f.scene.dataset.flightVideoTime, "3.6000");
  assert.equal(f.pending(), 0);
  f.setProgress(.97); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.classes.has("flight-final-frame"), true);
  assert.equal(f.scene.dataset.flightMedia, "image");
  assert.equal(f.scene.values.get("--globe-global-title"), "1");
  assert.ok(f.video.currentTime < 7.184);
  assert.equal(f.pending(), 0);
  f.finishSeek(); f.finishSeek();
  assert.equal(f.video.currentTime, 7.184);
  f.setProgress(globalProgress(2.5)); f.win.emit("scroll"); f.flushOne();
  assert.equal(f.scene.classes.has("flight-final-frame"), false);
  assert.equal(f.scene.dataset.flightMedia, "video");
  assert.equal(f.video.paused, true);
  assert.equal(f.pending(), 0);
  f.controller.dispose();
});

test("모바일 동작 줄이기와 낮은 가로·PC 화면은 글로벌 영상을 로드하지 않고 세계 poster를 제공한다", () => {
  for (const options of [{ reduced: true, viewportHeight: 844 }, { viewportHeight: 500 }, { viewportWidth: 1280, viewportHeight: 680 }]) {
    const f = globalFixture({ desktop: false, compact: true, ...options });
    assert.equal(f.scene.classes.has("ai-page-static"), true);
    assert.equal(f.wrapper.classes.has("ai-pages-motion"), false);
    assert.ok(f.flightAsset.getAttribute("src"));
    assert.equal(f.video.getAttribute("src"), null);
    assert.equal(f.scene.dataset.flightVideoTime, undefined);
    f.controller.dispose();
  }
});

test("모바일 글로벌 영상은 구간에 가까워질 때 준비하고 화면 회전 시 정적 poster로 해제한다", () => {
  const f = globalFixture({ desktop: false, compact: true, viewportHeight: 844, initialProgress: -1 });
  assert.equal(f.video.getAttribute("src"), null);
  f.setProgress(.22); f.win.emit("scroll"); f.flush();
  assert.ok(f.video.getAttribute("src"));
  f.setProgress(.90); f.win.emit("scroll"); f.flush();
  f.win.innerHeight = 390; f.win.innerWidth = 844; f.win.emit("resize"); f.flush();
  assert.equal(f.scene.classes.has("ai-page-static"), true);
  assert.equal(f.scene.classes.has("flight-final-frame"), false);
  assert.equal(f.video.getAttribute("src"), null);
  assert.ok(f.flightAsset.getAttribute("src"));
  assert.equal(f.scene.dataset.flightDisplayProgress, undefined);
  assert.equal(f.pending(), 0);
  f.controller.dispose();
});
