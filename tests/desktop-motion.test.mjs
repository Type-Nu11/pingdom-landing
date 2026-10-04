import test from "node:test";
import assert from "node:assert/strict";
import {
  createDesktopMotion,
  panelState,
  sequenceState,
  visitPose,
} from "../dist/desktop-motion.mjs";

class Target {
  listeners = new Map();
  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) ?? new Set();
    callbacks.add(callback);
    this.listeners.set(type, callbacks);
  }
  removeEventListener(type, callback) {
    this.listeners.get(type)?.delete(callback);
  }
  dispatch(type) {
    for (const callback of [...(this.listeners.get(type) ?? [])])
      callback({ type, target: this });
  }
  count(type) {
    return type
      ? (this.listeners.get(type)?.size ?? 0)
      : [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0);
  }
}

function element(attributes = {}) {
  const target = Object.assign(new Target(), {
    dataset: {},
    attributes: new Map(Object.entries(attributes)),
    mutations: 0,
    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      this.mutations++;
      this.attributes.set(name, String(value));
    },
    removeAttribute(name) {
      this.mutations++;
      this.attributes.delete(name);
    },
  });
  target.classes = new Set();
  target.classList = {
    add(name) {
      target.classes.add(name);
    },
    remove(name) {
      target.classes.delete(name);
    },
    toggle(name, enabled) {
      if (enabled) target.classes.add(name);
      else target.classes.delete(name);
    },
    contains(name) {
      return target.classes.has(name);
    },
  };
  target.style = {
    values: new Map([["color", "inherit"]]),
    mutations: 0,
    setProperty(name, value) {
      this.mutations++;
      this.values.set(name, String(value));
    },
    removeProperty(name) {
      this.mutations++;
      const previous = this.values.get(name);
      this.values.delete(name);
      return previous;
    },
  };
  return target;
}

function productRange(product) {
  const clip = product.style.values.get("--desktop-product-clip");
  const match = clip?.match(/^inset\(([\d.e+-]+)%? 0 ([\d.e+-]+)%? 0\)$/);
  assert.ok(match, `유효한 inset clip이어야 합니다: ${clip}`);
  const start = Number(match[1]);
  const end = 100 - Number(match[2]);
  return { start, end, height: end - start };
}

// CSS의 실제 sticky 배치 대신 문서 좌표와 화면 좌표를 분리해 계산·정리를 검증합니다.
function fixture({
  y = 510,
  width = 1440,
  height = 900,
  reduced = false,
  optionalApis = true,
  loaded = true,
  visitCount = 3,
  dataVisit = false,
} = {}) {
  const win = Object.assign(new Target(), {
    scrollY: y,
    innerWidth: width,
    innerHeight: height,
  });
  const queries = [];
  const desktop = new Target();
  Object.defineProperty(desktop, "matches", {
    get: () => win.innerWidth >= 1000 && win.innerHeight >= 701,
  });
  const preference = Object.assign(new Target(), { matches: reduced });
  win.matchMedia = (query) => {
    queries.push(query);
    return query.includes("reduced-motion") ? preference : desktop;
  };
  const frames = new Map();
  let nextFrame = 0;
  win.requestAnimationFrame = (callback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  };
  win.cancelAnimationFrame = (id) => frames.delete(id);
  function flush() {
    let ticks = 0;
    while (frames.size) {
      assert.ok(++ticks < 20, "프레임 예약이 유한해야 합니다.");
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback());
    }
  }
  const observers = [];
  if (optionalApis)
    win.ResizeObserver = class {
      targets = new Set();
      connected = true;
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }
      observe(target) {
        this.targets.add(target);
      }
      disconnect() {
        this.targets.clear();
        this.connected = false;
      }
    };
  const classes = new Set(["original-page"]);
  let classMutations = 0;
  const root = Object.assign(new Target(), { hidden: false });
  root.documentElement = {
    classList: {
      add(name) {
        classMutations++;
        classes.add(name);
      },
      remove(name) {
        classMutations++;
        classes.delete(name);
      },
    },
  };
  let resolveFonts;
  if (optionalApis)
    root.fonts = {
      ready: new Promise((resolve) => {
        resolveFonts = resolve;
      }),
    };
  let reads = 0;
  const header = {
    height: 80,
    getBoundingClientRect() {
      reads++;
      return { height: this.height };
    },
  };
  const scenes = ["visit", "merchant"].map((type, index) => {
    const count = type === "visit" ? visitCount : 2;
    const copies = Array.from({ length: count }, (_, i) => {
      const copy = element();
      copy.center = (index ? 4200 : 1000) + i * 800;
      copy.height = 200;
      copy.getBoundingClientRect = () => {
        reads++;
        return {
          top: copy.center - copy.height / 2 - win.scrollY,
          height: copy.height,
        };
      };
      return copy;
    });
    const products = Array.from({ length: count }, (_, i) =>
      element(i === 0 ? {} : { "aria-hidden": i === 1 ? "false" : "true" }),
    );
    if (!index && dataVisit) {
      const keys = ["place", "community", "verification", "booking", "profile"];
      products.forEach((product, i) => { product.dataset.visitProduct = keys[i]; });
      copies.forEach((copy, i) => { copy.dataset.visitCopy = keys[i]; });
    }
    const panels = index ? [element(), element()] : [];
    const productImages = products.map((product, i) => {
      const image = element(
        index && i === 1 ? {} : { src: `assets/original-${index}-${i}.png` },
      );
      image.complete = !(index && i === 1);
      image.naturalWidth = image.complete ? 960 : 0;
      image.parentElement = product;
      product.querySelector = (selector) =>
        selector === "img"
          ? image
          : selector === ".merchant-panel"
            ? panels[i]
            : null;
      product.querySelectorAll = (selector) =>
        selector === "img" ? [image, ...(index ? [panels[i]] : [])] : [];
      if (index) panels[i].parentElement = product;
      return image;
    });
    const section = element();
    section.dataset.desktopSequence = type;
    section.getBoundingClientRect = () => { reads++; return { top: copies[0].center - 410 - win.scrollY, height: copies.at(-1).center - copies[0].center + 820 }; };
    section.querySelectorAll = (selector) =>
      selector === "[data-visit-product]"
        ? !index && dataVisit ? products : []
        : selector === "[data-visit-copy]"
        ? !index && dataVisit ? copies : []
        : selector === ".merchant-panel"
        ? panels
        : selector === ".merchant-beat" || selector === ".card-copy"
          ? copies
          : selector === ".merchant-screen" ||
              selector === ".place-product, .booking-product, .memory-product"
            ? !index && visitCount === 5 ? [products[0], products[3], products[4]] : products
            : [];
    return { section, copies, products, panels, productImages };
  });
  const assets = [
    scenes[1].panels[0],
    scenes[1].productImages[1],
    scenes[1].panels[1],
  ];
  assets.forEach((asset, i) => {
    asset.dataset.desktopSrc = `assets/panel-${i}.webp`;
    asset.complete = false;
    asset.naturalWidth = 0;
  });
  const originalImage = scenes[1].productImages[0];
  const originalSrc = originalImage.getAttribute("src");
  const images = [...scenes[0].productImages, originalImage, ...assets];
  root.querySelector = (selector) =>
    selector === ".site-header" ? header : null;
  root.querySelectorAll = (selector) =>
    selector === "[data-desktop-sequence]"
      ? scenes.map((scene) => scene.section)
      : selector === "[data-desktop-sequence] img[data-desktop-src]"
        ? assets
        : selector === "[data-desktop-sequence] img"
          ? images
          : [];
  const snapshot = () =>
    scenes.map(({ section, copies, products, panels }) => ({
      progress: section.dataset.desktopProgress,
      copies: copies.map((copy) => Object.fromEntries(copy.style.values)),
      products: products.map((product) => ({
        style: Object.fromEntries(product.style.values),
        aria: product.getAttribute("aria-hidden"),
      })),
      panels: panels.map((panel) => Object.fromEntries(panel.style.values)),
    }));
  const jump = (nextY) => {
    win.scrollY = nextY;
    win.dispatch("scroll");
    flush();
  };
  const motion = createDesktopMotion({ root, win });
  const load = (asset) => {
    asset.complete = true;
    asset.naturalWidth = 1864;
    asset.dispatch("load");
  };
  const loadAssets = () => {
    assets.forEach(load);
    flush();
  };
  if (loaded && classes.has("desktop-motion-enabled")) loadAssets();
  return {
    win,
    root,
    queries,
    desktop,
    preference,
    frames,
    observers,
    classes,
    header,
    scenes,
    assets,
    originalImage,
    originalSrc,
    images,
    motion,
    flush,
    jump,
    snapshot,
    resolveFonts,
    load,
    loadAssets,
    reads: () => reads,
    classMutations: () => classMutations,
  };
}

test("2·3·5개 제품 전환의 가중치 합은 항상 1이며 인접 제품 사이에서만 이어집니다", () => {
  for (const count of [2, 3, 5]) {
    for (let i = -20; i <= 120; i++) {
      const weights = sequenceState(i / 100, count);
      assert.equal(weights.length, count);
      assert.ok(
        Math.abs(weights.reduce((sum, value) => sum + value, 0) - 1) < 1e-12,
      );
      weights.forEach((weight) => assert.ok(weight >= 0 && weight <= 1));
      const active = weights.flatMap((weight, index) =>
        weight > 0 ? [index] : [],
      );
      assert.ok(active.length <= 2);
      if (active.length === 2) assert.equal(active[1] - active[0], 1);
    }
    assert.deepEqual(sequenceState(-1, count), sequenceState(0, count));
    assert.deepEqual(sequenceState(2, count), sequenceState(1, count));
  }
  assert.deepEqual(sequenceState(0.5, 1), [1]);
});

test("각 설명 앞뒤의 읽기 구간은 완성된 제품을 유지합니다", () => {
  for (const p of [0, 0.1, 0.36]) assert.deepEqual(sequenceState(p, 2), [1, 0]);
  for (const p of [0.7, 0.9, 1]) assert.deepEqual(sequenceState(p, 2), [0, 1]);
  for (const p of [0, 0.1, 0.18])
    assert.deepEqual(sequenceState(p, 3), [1, 0, 0]);
  for (const p of [0.35, 0.5, 0.67])
    assert.deepEqual(sequenceState(p, 3), [0, 1, 0]);
  for (const p of [0.85, 0.95, 1])
    assert.deepEqual(sequenceState(p, 3), [0, 0, 1]);
});

test("제품과 분리 패널의 상태는 역방향·직접 이동에서도 결정적입니다", () => {
  const progress = [0, 0.15, 0.265, 0.5, 0.765, 0.9, 1];
  for (const count of [2, 3, 5]) {
    const forward = progress.map((p) => sequenceState(p, count));
    const backward = [...progress]
      .reverse()
      .map((p) => sequenceState(p, count))
      .reverse();
    assert.deepEqual(backward, forward);
  }
  for (const index of [0, 1]) {
    assert.deepEqual(panelState(0, index), { x: 0, y: 0, scale: 1, shadow: 0 });
    const end = { x: index === 0 ? -8 : 6, y: -16, scale: 1.025, shadow: 0.12 };
    assert.deepEqual(panelState(1, index), end);
    assert.deepEqual(
      panelState(index ? 0.64 : 0.04, index),
      panelState(0, index),
    );
    assert.deepEqual(panelState(index ? 0.84 : 0.22, index), end);
    const forward = progress.map((p) => panelState(p, index));
    const backward = [...progress]
      .reverse()
      .map((p) => panelState(p, index))
      .reverse();
    assert.deepEqual(backward, forward);
    for (const pose of forward) {
      Object.values(pose).forEach((value) => assert.ok(Number.isFinite(value)));
      assert.ok(pose.y >= -16 && pose.y <= 0);
      assert.ok(pose.scale >= 1 && pose.scale <= 1.025);
      assert.ok(pose.shadow >= 0 && pose.shadow <= 0.12);
    }
  }
});

test("1000px 미만·701px 미만·reduce 진입에서는 원본 문서와 추가 자산을 변경하지 않습니다", () => {
  for (const options of [{ width: 999 }, { height: 700 }, { reduced: true }]) {
    const f = fixture(options);
    const original = f.snapshot();
    f.win.dispatch("scroll");
    f.win.dispatch("resize");
    f.flush();
    assert.deepEqual(f.snapshot(), original);
    assert.deepEqual([...f.classes], ["original-page"]);
    assert.equal(f.classMutations(), 0);
    assert.equal(f.reads(), 0);
    assert.equal(f.originalImage.getAttribute("src"), f.originalSrc);
    for (const asset of f.assets) {
      assert.equal(asset.getAttribute("src"), null);
      assert.equal(asset.mutations, 0);
    }
    for (const scene of f.scenes)
      for (const node of [...scene.copies, ...scene.products, ...scene.panels])
        assert.equal(node.style.mutations, 0);
    assert.deepEqual(f.queries, [
      "(min-width: 1000px) and (min-height: 701px)",
      "(prefers-reduced-motion: reduce)",
    ]);
    f.motion.stop();
  }
});

test("PC 활성 조건의 경계에서도 추가 자산은 한 번만 로드하고 기존 이미지는 보존합니다", () => {
  const f = fixture({ width: 1000, height: 701 });
  assert.ok(f.classes.has("desktop-motion-enabled"));
  for (const asset of f.assets) {
    assert.equal(asset.getAttribute("src"), asset.dataset.desktopSrc);
    assert.equal(asset.mutations, 1);
  }
  assert.equal(f.originalImage.mutations, 0);
  f.motion.refresh();
  f.motion.refresh();
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.ok(f.assets.every((asset) => asset.mutations === 1));
  f.motion.dispose();
});

test("이벤트 원본이 로드되기 전에는 등록 화면을 유지하고 패널은 준비된 경우에만 표시합니다", () => {
  const f = fixture({ y: 4510, loaded: false });
  const merchant = f.scenes[1];
  const visibleHeights = () =>
    merchant.products.map((product) => productRange(product).height);
  assert.ok(
    f.assets.every(
      (asset) =>
        asset.getAttribute("src") &&
        !asset.complete &&
        asset.naturalWidth === 0,
    ),
  );
  assert.deepEqual(visibleHeights(), [100, 0]);
  assert.ok(
    merchant.products.every(
      (product) => !product.classList.contains("desktop-panel-ready"),
    ),
  );
  f.load(f.assets[0]);
  f.flush();
  assert.deepEqual(visibleHeights(), [100, 0]);
  assert.ok(merchant.products[0].classList.contains("desktop-panel-ready"));
  assert.ok(!merchant.products[1].classList.contains("desktop-panel-ready"));
  f.load(f.assets[1]);
  f.flush();
  assert.deepEqual(visibleHeights(), [0, 100]);
  assert.ok(!merchant.products[1].classList.contains("desktop-panel-ready"));
  f.load(f.assets[2]);
  f.flush();
  assert.ok(merchant.products[1].classList.contains("desktop-panel-ready"));
  f.motion.dispose();
  assert.ok(
    merchant.products.every(
      (product) => !product.classList.contains("desktop-panel-ready"),
    ),
  );
});

test("추가 이미지 오류는 정적 원본으로 복귀하며 이후 이벤트가 깨진 확장을 재활성화하지 않습니다", () => {
  const f = fixture({ loaded: false });
  f.assets[1].complete = true;
  f.assets[1].naturalWidth = 0;
  f.assets[1].dispatch("error");
  f.flush();
  assert.ok(!f.classes.has("desktop-motion-enabled"));
  assert.ok(f.assets.every((asset) => asset.getAttribute("src") === null));
  assert.equal(f.originalImage.getAttribute("src"), f.originalSrc);
  for (const scene of f.scenes) {
    assert.equal(scene.section.dataset.desktopProgress, undefined);
    for (const node of [...scene.copies, ...scene.products, ...scene.panels])
      assert.deepEqual(Object.fromEntries(node.style.values), {
        color: "inherit",
      });
  }
  f.win.dispatch("resize");
  f.jump(5000);
  assert.ok(!f.classes.has("desktop-motion-enabled"));
  assert.ok(f.assets.every((asset) => asset.getAttribute("src") === null));
  f.motion.dispose();
});

test("읽기 구간과 전환 중간 모두 ARIA에는 제품 하나만 노출합니다", () => {
  const f = fixture();
  for (const scene of f.scenes) {
    const start = scene.copies[0].center - 490;
    const distance = scene.copies.at(-1).center - scene.copies[0].center;
    for (const p of [
      0, 0.15, 0.25, 0.265, 0.4, 0.5, 0.53, 0.7, 0.765, 0.85, 1,
    ]) {
      f.jump(start + distance * p);
      const exposed = scene.products.filter(
        (product) => product.getAttribute("aria-hidden") === "false",
      );
      assert.equal(exposed.length, 1, `progress ${p}`);
      for (const product of scene.products)
        if (productRange(product).height === 0)
          assert.equal(
            product.style.values.get("--desktop-product-visibility"),
            "hidden",
          );
    }
  }
  f.motion.dispose();
});

test("상점주 원본의 수직 wipe는 읽기 구간에서 완성 화면을 유지합니다", () => {
  const f = fixture();
  for (const scene of f.scenes.filter(scene => scene.section.dataset.desktopSequence === "merchant")) {
    const start = scene.copies[0].center - 490;
    const distance = scene.copies.at(-1).center - scene.copies[0].center;
    for (let i = 0; i <= 100; i++) {
      f.jump(start + (distance * i) / 100);
      const ranges = scene.products.map(productRange);
      const visible = ranges.filter((range) => range.height > 1e-8);
      assert.ok(visible.length >= 1 && visible.length <= 2);
      assert.ok(
        Math.abs(ranges.reduce((sum, range) => sum + range.height, 0) - 100) <
          1e-8,
      );
      assert.equal(visible[0].start, 0);
      assert.equal(visible.at(-1).end, 100);
      if (visible.length === 2)
        assert.ok(Math.abs(visible[0].end - visible[1].start) < 1e-8);
    }
    const count = scene.products.length;
    const holds =
      count === 3
        ? [
            [0.1, 0],
            [0.5, 1],
            [0.95, 2],
          ]
        : [
            [0.1, 0],
            [0.95, 1],
          ];
    for (const [progress, index] of holds) {
      f.jump(start + distance * progress);
      assert.deepEqual(productRange(scene.products[index]), {
        start: 0,
        end: 100,
        height: 100,
      });
      assert.equal(scene.products[index].getAttribute("aria-hidden"), "false");
      assert.equal(
        scene.products[index].style.values.get("--desktop-product-visibility"),
        "visible",
      );
    }
    f.jump(start + distance * (count === 3 ? 0.265 : 0.53));
    const outgoing = productRange(scene.products[0]);
    const incoming = productRange(scene.products[1]);
    assert.ok(Math.abs(outgoing.end - 50) < 1e-8);
    assert.ok(Math.abs(incoming.start - 50) < 1e-8);
  }
  f.motion.dispose();
});

test("활성 후 비활성 전환은 원본 ARIA·스타일을 복구하고 추가 src만 제거합니다", () => {
  const f = fixture({ y: 1900 });
  f.preference.matches = true;
  f.preference.dispatch("change");
  f.flush();
  assert.deepEqual([...f.classes], ["original-page"]);
  for (const scene of f.scenes) {
    assert.equal(scene.section.dataset.desktopProgress, undefined);
    scene.products.forEach((product, i) =>
      assert.equal(
        product.getAttribute("aria-hidden"),
        i === 0 ? null : i === 1 ? "false" : "true",
      ),
    );
    for (const node of [...scene.copies, ...scene.products, ...scene.panels])
      assert.deepEqual(Object.fromEntries(node.style.values), {
        color: "inherit",
      });
  }
  assert.ok(f.assets.every((asset) => asset.getAttribute("src") === null));
  assert.equal(f.originalImage.getAttribute("src"), f.originalSrc);
  const cleared = f.snapshot();
  f.win.dispatch("resize");
  f.flush();
  assert.deepEqual(f.snapshot(), cleared);
  f.preference.matches = false;
  f.preference.dispatch("change");
  f.flush();
  assert.ok(f.classes.has("desktop-motion-enabled"));
  assert.ok(
    f.assets.every(
      (asset) => asset.getAttribute("src") === asset.dataset.desktopSrc,
    ),
  );
  f.motion.dispose();
});

test("PC에서 좁은 화면 또는 낮은 화면으로 바뀌면 원본 상태로 정리합니다", () => {
  for (const property of ["innerWidth", "innerHeight"]) {
    const f = fixture();
    f.win[property] = property === "innerWidth" ? 999 : 700;
    f.desktop.dispatch("change");
    f.win.dispatch("resize");
    assert.equal(f.frames.size, 1);
    f.flush();
    assert.ok(!f.classes.has("desktop-motion-enabled"));
    assert.ok(f.assets.every((asset) => asset.getAttribute("src") === null));
    assert.ok(
      f.scenes.every(
        (scene) => scene.section.dataset.desktopProgress === undefined,
      ),
    );
    f.motion.dispose();
  }
});

test("중간 진입·역스크롤·refresh는 같은 좌표에서 같은 구도를 복원합니다", () => {
  const y = 510 + 1600 * 0.265;
  const f = fixture({ y });
  const expected = f.snapshot();
  assert.equal(f.scenes[0].section.dataset.desktopProgress, "0.2650");
  f.jump(6000);
  f.jump(y);
  assert.deepEqual(f.snapshot(), expected);
  f.jump(0);
  f.jump(y);
  assert.deepEqual(f.snapshot(), expected);
  f.motion.refresh();
  f.flush();
  assert.deepEqual(f.snapshot(), expected);
  const restored = fixture({ y });
  assert.deepEqual(restored.snapshot(), expected);
  f.motion.dispose();
  restored.motion.dispose();
});

test("빠른 스크롤은 한 프레임으로 합치고 paint 중 레이아웃을 다시 읽지 않습니다", () => {
  const f = fixture();
  const reads = f.reads();
  for (const y of [700, 900, 1200, 1310]) {
    f.win.scrollY = y;
    f.win.dispatch("scroll");
  }
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(f.scenes[0].section.dataset.desktopProgress, "0.5000");
  assert.equal(f.reads(), reads);
  assert.equal(f.frames.size, 0);
  f.motion.dispose();
});

test("폰트·이미지·관찰자·창 이벤트는 변경된 읽기 좌표를 재측정합니다", async () => {
  const f = fixture({ y: 1310 });
  const reads = f.reads();
  f.scenes[0].copies.forEach((copy) => {
    copy.center += 160;
  });
  f.assets[0].dispatch("load");
  f.originalImage.dispatch("load");
  f.observers[0].callback();
  f.resolveFonts();
  await Promise.resolve();
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(f.scenes[0].section.dataset.desktopProgress, "0.4000");
  assert.equal(f.reads(), reads + 7);
  f.header.height = 120;
  for (const event of ["resize", "load", "hashchange"]) f.win.dispatch(event);
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(f.scenes[0].section.dataset.desktopProgress, "0.4146");
  f.motion.dispose();
});

test("stop/start 중복 호출은 listener·observer·예약 프레임을 누적하지 않습니다", () => {
  const f = fixture();
  const targets = [f.win, f.root, f.desktop, f.preference, ...f.images];
  const counts = targets.map((target) => target.count());
  f.motion.start();
  assert.deepEqual(
    targets.map((target) => target.count()),
    counts,
  );
  assert.equal(f.win.count("scroll"), 1);
  assert.equal(f.observers.length, 1);
  assert.equal(f.observers[0].targets.size, 3);
  f.win.dispatch("resize");
  f.win.dispatch("scroll");
  assert.equal(f.frames.size, 2);
  const before = f.snapshot();
  f.motion.stop();
  f.motion.stop();
  assert.equal(f.frames.size, 0);
  assert.ok(targets.every((target) => target.count() === 0));
  assert.equal(f.observers[0].connected, false);
  assert.deepEqual(f.snapshot(), before);
  f.win.scrollY = 1310;
  f.win.dispatch("scroll");
  assert.equal(f.frames.size, 0);
  f.motion.start();
  assert.deepEqual(
    targets.map((target) => target.count()),
    counts,
  );
  assert.equal(f.observers.length, 2);
  assert.equal(f.observers[1].connected, true);
  assert.equal(f.scenes[0].section.dataset.desktopProgress, "0.5000");
  f.motion.dispose();
  assert.ok(targets.every((target) => target.count() === 0));
  assert.equal(f.observers[1].connected, false);
});

test("dispose는 모든 소유 스타일·ARIA·추가 자산을 정리합니다", () => {
  const f = fixture({ y: 4300 });
  f.motion.dispose();
  assert.deepEqual([...f.classes], ["original-page"]);
  for (const scene of f.scenes) {
    assert.equal(scene.section.dataset.desktopProgress, undefined);
    for (const node of [...scene.copies, ...scene.products, ...scene.panels])
      assert.deepEqual(Object.fromEntries(node.style.values), {
        color: "inherit",
      });
    scene.products.forEach((product, i) =>
      assert.equal(
        product.getAttribute("aria-hidden"),
        i === 0 ? null : i === 1 ? "false" : "true",
      ),
    );
  }
  assert.ok(f.assets.every((asset) => asset.getAttribute("src") === null));
  assert.equal(f.frames.size, 0);
});

test("숨겨진 문서는 그리기를 멈추고 복귀 시 최신 위치를 재측정합니다", () => {
  const f = fixture();
  const before = f.snapshot();
  f.win.dispatch("scroll");
  assert.equal(f.frames.size, 1);
  f.root.hidden = true;
  f.root.dispatch("visibilitychange");
  assert.equal(f.frames.size, 0);
  f.jump(1310);
  assert.deepEqual(f.snapshot(), before);
  f.root.hidden = false;
  f.root.dispatch("visibilitychange");
  f.flush();
  assert.equal(f.scenes[0].section.dataset.desktopProgress, "0.5000");
  f.motion.dispose();
});

test("fonts와 ResizeObserver가 없어도 렌더와 정리가 동작합니다", () => {
  const f = fixture({ optionalApis: false });
  f.jump(1310);
  assert.equal(f.scenes[0].section.dataset.desktopProgress, "0.5000");
  f.motion.refresh();
  f.flush();
  assert.equal(f.scenes[0].section.dataset.desktopProgress, "0.5000");
  f.motion.dispose();
  assert.equal(f.frames.size, 0);
});

test("측정 전후 설명의 위치가 같아도 유한한 제품 상태를 유지합니다", () => {
  const f = fixture();
  f.scenes[0].copies.forEach((copy) => {
    copy.center = 1000;
  });
  f.motion.refresh();
  f.flush();
  for (const y of [509, 510, 510.5, 511, 10000]) {
    f.jump(y);
    const p = Number(f.scenes[0].section.dataset.desktopProgress);
    assert.ok(Number.isFinite(p) && p >= 0 && p <= 1);
    f.scenes[0].products.forEach((product) => {
      const range = productRange(product);
      Object.values(range).forEach((value) =>
        assert.ok(Number.isFinite(value)),
      );
      assert.ok(range.start >= 0 && range.end <= 100 && range.height >= 0);
    });
  }
  f.motion.dispose();
});


test("방문 전환 중 단말기 두 대와 텍스트가 중첩되지 않고 크기를 유지합니다", () => {
  const f = fixture();
  const scene = f.scenes[0];
  for (const p of [0, .1, .265, .5, .765, .95, 1]) {
    f.jump(scene.copies[0].center - 490 + 1600 * p);
    assert.ok(scene.products.every(product => product.style.values.get('--desktop-product-clip') === 'inset(0 0 0 0)'));
    const alpha = scene.products.map(product => Number(product.style.values.get('--visit-product-opacity')));
    assert.ok(alpha.reduce((sum, value) => sum + value, 0) <= 1);
    assert.ok(alpha.filter(value => value > 0).length <= 1, '단말기는 한 대만 그립니다');
    sequenceState(p, 3).forEach((weight, index) => assert.equal(visitPose(p, index, weight).scale, 1));
    const copies = scene.copies.map(copy => Number(copy.style.values.get('--visit-copy-opacity')));
    assert.ok(copies.filter(value => value > 0).length <= 1, '설명은 한 문장만 보입니다');
    assert.ok(scene.products.every(product => parseFloat(product.style.values.get('--visit-product-y')) === 0), '전환 중 단말기 외곽은 같은 위치에 유지됩니다');
  }
  const points = [0, .265, .5, .765, 1];
  const forward = points.map(p => visitPose(p, 1, sequenceState(p, 3)[1]));
  assert.deepEqual(points.slice().reverse().map(p => visitPose(p, 1, sequenceState(p, 3)[1])).reverse(), forward);
  for (let p = 0; p <= 1; p += .001) {
    const poses = sequenceState(p, 3).map((weight, index) => visitPose(p, index, weight));
    assert.ok(poses.filter(pose => pose.opacity > 0).length <= 1);
  }
  f.motion.dispose();
});

test("다섯 data 제품은 장소·커뮤니티·방문 인증·예약·기록 순서로 완성 화면과 설명을 읽게 합니다", () => {
  const f = fixture({ visitCount: 5, dataVisit: true });
  const scene = f.scenes[0];
  const points = [.06, .28, .50, .72, .94];
  const keys = ["place", "community", "verification", "booking", "profile"];
  for (const [index, progress] of points.entries()) {
    f.jump(510 + 3200 * progress);
    assert.equal(scene.section.dataset.desktopProgress, progress.toFixed(4));
    const visibleProducts = scene.products.filter(product => Number(product.style.values.get('--visit-product-opacity')) === 1);
    const visibleCopies = scene.copies.filter(copy => Number(copy.style.values.get('--visit-copy-opacity')) === 1);
    assert.deepEqual(visibleProducts.map(product => product.dataset.visitProduct), [keys[index]]);
    assert.deepEqual(visibleCopies.map(copy => copy.dataset.visitCopy), [keys[index]]);
    assert.equal(scene.products[index].getAttribute('aria-hidden'), 'false');
    assert.equal(scene.copies[index].getAttribute('aria-hidden'), 'false');
  }
  f.jump(510 + 3200 * .4);
  assert.equal(scene.copies[1].style.values.get('--visit-copy-y'), '-18px');
  assert.ok(parseFloat(scene.copies[2].style.values.get('--visit-copy-y')) >= 0);
  const middle = f.snapshot();
  f.jump(8000); f.jump(510 + 3200 * .4);
  assert.deepEqual(f.snapshot(), middle);
  f.motion.refresh(); f.flush();
  assert.deepEqual(f.snapshot(), middle);
  f.motion.dispose();
  for (const node of [...scene.products, ...scene.copies]) {
    assert.deepEqual(Object.fromEntries(node.style.values), { color: 'inherit' });
  }
  scene.products.forEach((product, index) => assert.equal(product.getAttribute('aria-hidden'), index === 0 ? null : index === 1 ? 'false' : 'true'));
  assert.ok(scene.copies.every(copy => copy.getAttribute('aria-hidden') === null));
});

test("다섯 화면의 전환에서도 단말기와 설명은 중첩되지 않습니다", () => {
  const f = fixture({ visitCount: 5, dataVisit: true });
  const scene = f.scenes[0];
  for (let i = 0; i <= 200; i++) {
    f.jump(510 + 3200 * i / 200);
    const products = scene.products.map(product => Number(product.style.values.get('--visit-product-opacity')));
    const copies = scene.copies.map(copy => Number(copy.style.values.get('--visit-copy-opacity')));
    assert.ok(products.filter(opacity => opacity > 0).length <= 1);
    assert.ok(copies.filter(opacity => opacity > 0).length <= 1);
    assert.ok(products.every(opacity => Number.isFinite(opacity) && opacity >= 0 && opacity <= 1));
    assert.ok(scene.products.every(product => product.style.values.get('--visit-product-y') === '0px'));
    assert.ok(scene.products.every(product => product.style.values.get('--visit-product-rotation') === '0deg'));
  }
  f.motion.dispose();
});
