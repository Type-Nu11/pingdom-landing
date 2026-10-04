import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { teamCardState, createTeamV2 } from "../dist/team-v2.mjs";

class Target {
  listeners = new Map();
  addEventListener(type, fn) { const items = this.listeners.get(type) ?? new Set(); items.add(fn); this.listeners.set(type, items); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type) { for (const fn of [...(this.listeners.get(type) ?? [])]) fn({ type }); }
  count(type) { return this.listeners.get(type)?.size ?? 0; }
}
function element() {
  const e = Object.assign(new Target(), { dataset: {}, attrs: new Map(), classes: new Set(), values: new Map([["color", "inherit"]]) });
  e.getAttribute = (key) => e.attrs.get(key) ?? null;
  e.setAttribute = (key, value) => e.attrs.set(key, String(value));
  e.removeAttribute = (key) => e.attrs.delete(key);
  e.classList = { add: (...items) => items.forEach((item) => e.classes.add(item)), remove: (...items) => items.forEach((item) => e.classes.delete(item)) };
  e.style = { setProperty: (key, value) => e.values.set(key, String(value)), removeProperty: (key) => e.values.delete(key) };
  return e;
}
function fixture({ desktop = true, reduced = false } = {}) {
  const win = Object.assign(new Target(), { innerHeight: 900, scrollY: 2200 });
  const desktopQuery = Object.assign(new Target(), { matches: desktop });
  const reducedQuery = Object.assign(new Target(), { matches: reduced });
  win.matchMedia = (query) => query.includes("reduced-motion") ? reducedQuery : desktopQuery;
  const frames = new Map(); let id = 0, reads = 0;
  win.requestAnimationFrame = (fn) => { frames.set(++id, fn); return id; };
  win.cancelAnimationFrame = (key) => frames.delete(key);
  const flush = () => {
    let count = 0;
    while (frames.size) {
      assert.ok(++count < 10);
      const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((fn) => fn());
    }
  };
  const cards = Array.from({ length: 7 }, (_, index) => {
    const e = element();
    e.getBoundingClientRect = () => { reads++; return { top: 2600 + (index > 3 ? 360 : 0) - win.scrollY, height: 320 }; };
    return e;
  });
  const assets = cards.map((_, index) => { const e = element(); e.dataset.desktopSrc = `assets/avatar-${index}.png`; return e; });
  const section = element(); section.setAttribute("aria-labelledby", "team-title");
  const wrapper = element();
  wrapper.querySelectorAll = (selector) => selector === "[data-team-card]" ? cards : selector === "img[data-desktop-src]" ? assets : [];
  const documentElement = element(); const observed = []; let observeCallback;
  win.ResizeObserver = class {
    constructor(callback) { observeCallback = callback; }
    observe(target) { observed.push(target); }
    disconnect() {}
  };
  const root = Object.assign(new Target(), { hidden: false, documentElement });
  root.querySelector = (selector) => selector === ".team-v2" ? wrapper : selector === "#team" ? section : null;
  const controller = createTeamV2({ root, win });
  return { win, root, desktopQuery, reducedQuery, cards, assets, section, wrapper, controller, flush, reads: () => reads, observed, resize: () => observeCallback() };
}

test("팀 카드 진행도는 제한되고 같은 행에서 순서대로 진입한다", () => {
  for (let i = 0; i < 7; i++) {
    assert.deepEqual(teamCardState(-1, i), teamCardState(0, i));
    assert.deepEqual(teamCardState(2, i), { opacity: 1, y: 0 });
  }
  assert.ok(teamCardState(.35, 0).opacity > teamCardState(.35, 2).opacity);
});

test("팀 fragment는 원본 아바타와 역할을 7명에게 동일한 구조로 제공한다", async () => {
  const html = await readFile(new URL("../dist/team-v2.html", import.meta.url), "utf8");
  assert.equal((html.match(/data-team-card=/g) ?? []).length, 7);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const name of ["김우성", "김일강", "우성민", "김태우", "조성혁", "이용인", "장준혁"]) assert.ok(html.includes(name));
  assert.ok(html.includes("PM · 서버 총괄<br />상점주 웹"));
  assert.ok(html.includes("클라이언트 총괄 · 앱"));
  assert.ok(html.includes("서버 · AWS 인프라"));
  assert.equal((html.match(/aria-describedby=/g) ?? []).length, 7);
  assert.equal((html.match(/\ssrc=/g) ?? []).length, 0, "PC 비활성 화면에서 새 아바타 요청이 없어야 한다");
});

test("좁은 화면은 새 팀 자산·모션·접근성 이름을 추가하지 않는다", () => {
  const f = fixture({ desktop: false });
  assert.ok(f.assets.every((asset) => asset.getAttribute("src") === null));
  assert.equal(f.wrapper.classes.has("team-v2-motion"), false);
  assert.equal(f.section.getAttribute("aria-labelledby"), "team-title");
  f.controller.dispose();
});

test("동작 줄이기는 모든 이름과 역할을 정지 상태로 제공한다", () => {
  const f = fixture({ reduced: true });
  assert.ok(f.assets.every((asset) => asset.getAttribute("src")));
  assert.equal(f.wrapper.classes.has("team-v2-motion"), false);
  assert.ok(f.cards.every((card) => card.values.size === 1));
  assert.equal(f.section.getAttribute("aria-labelledby"), "team-v2-title");
  f.controller.dispose();
});

test("스크롤 페인트는 치수를 재측정하지 않고 역방향 구도를 복원한다", () => {
  const f = fixture(); const reads = f.reads();
  f.win.scrollY = 2400; f.win.emit("scroll"); f.flush();
  const values = f.cards.map((card) => Object.fromEntries(card.values));
  f.win.scrollY = 3000; f.win.emit("scroll"); f.flush();
  f.win.scrollY = 2400; f.win.emit("scroll"); f.flush();
  assert.deepEqual(f.cards.map((card) => Object.fromEntries(card.values)), values);
  assert.equal(f.reads(), reads);
  f.controller.dispose();
});

test("동작 설정을 바꾸면 모션만 해제하고 다시 켜면 현재 위치를 반영한다", () => {
  const f = fixture();
  f.reducedQuery.matches = true; f.reducedQuery.emit("change"); f.flush();
  assert.ok(f.cards.every((card) => card.values.size === 1));
  assert.ok(f.assets.every((asset) => asset.getAttribute("src")));
  f.reducedQuery.matches = false; f.reducedQuery.emit("change"); f.flush();
  assert.ok(f.cards.every((card) => card.values.has("--team-card-opacity")));
  f.controller.dispose();
});

test("narrow 전환과 dispose는 소유 스타일·자산·제목 연결을 정확히 복구한다", () => {
  const f = fixture();
  f.desktopQuery.matches = false; f.desktopQuery.emit("change"); f.flush();
  assert.ok(f.assets.every((asset) => asset.getAttribute("src") === null));
  assert.ok(f.cards.every((card) => card.values.size === 1));
  assert.equal(f.section.getAttribute("aria-labelledby"), "team-title");
  f.desktopQuery.matches = true; f.desktopQuery.emit("change"); f.flush();
  assert.equal(f.section.getAttribute("aria-labelledby"), "team-v2-title");
  f.controller.dispose();
  assert.equal(f.section.getAttribute("aria-labelledby"), "team-title");
  assert.ok(f.assets.every((asset) => asset.getAttribute("src") === null));
});

test("stop/start는 BFCache 복귀에 사용할 수 있고 중복 리스너를 만들지 않는다", () => {
  const f = fixture();
  f.controller.start(); assert.equal(f.win.count("scroll"), 1);
  f.win.emit("scroll");
  f.controller.stop(); assert.equal(f.win.count("scroll"), 0);
  f.flush();
  f.win.scrollY = 4000;
  f.controller.start(); assert.equal(f.win.count("scroll"), 1);
  assert.ok(f.cards.every((card) => card.values.get("--team-card-y") === "0px"));
  f.controller.dispose(); assert.equal(f.win.count("scroll"), 0);
});

test("팀 fragment가 없으면 안전하게 종료된다", () => {
  const c = createTeamV2({ root: { querySelector: () => null }, win: {} });
  for (const method of ["start", "stop", "refresh", "dispose"]) assert.doesNotThrow(() => c[method]());
});

test("앞선 섹션의 높이 변경은 문서 루트 관찰을 통해 팀 진입 좌표에 반영된다", () => {
  const f = fixture();
  assert.ok(f.observed.includes(f.root.documentElement));
  const reads = f.reads(); f.resize(); f.flush();
  assert.ok(f.reads() > reads);
  f.controller.dispose();
});
