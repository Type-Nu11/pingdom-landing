import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// 정적 배포의 실제 진입 파일에서 참조되는 자산만 검사합니다.
const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const html = readFileSync(resolve(dist, "index.html"), "utf8");
const tags = [...html.matchAll(/<([a-z][\w-]*)\b([^>]*?)>/gi)].map(
  ([, name, body]) => ({
    name: name.toLowerCase(),
    attrs: Object.fromEntries(
      [...body.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(
        ([, key, , value]) => [key.toLowerCase(), value],
      ),
    ),
  }),
);
const ids = new Set();
const files = new Set();
const modules = new Set();
const styles = new Set();
const activeAssets = new Set();
const desktopAssets = new Set();

function localFile(reference, from = resolve(dist, "index.html")) {
  if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference))
    return null;
  const path = decodeURIComponent(reference.split(/[?#]/)[0]);
  const file = path.startsWith("/")
    ? resolve(dist, `.${path}`)
    : resolve(dirname(from), path);
  assert.ok(file.startsWith(dist + sep), `배포 경로 밖의 참조: ${reference}`);
  const metadata = statSync(file);
  assert.ok(
    metadata.isFile() && metadata.size > 0,
    `비어 있거나 유효하지 않은 배포 파일: ${reference}`,
  );
  files.add(file);
  return file;
}

for (const { attrs } of tags) {
  if (attrs.id) {
    assert.ok(!ids.has(attrs.id), `중복 id: ${attrs.id}`);
    ids.add(attrs.id);
  }
}
for (const { name, attrs } of tags) {
  assert.ok(
    !["form", "input", "select", "textarea"].includes(name),
    `소개 페이지에 입력 시뮬레이션 요소가 있습니다: ${name}`,
  );
  for (const attribute of [
    "src",
    "poster",
    "data-desktop-src",
    "data-desktop-hq",
    "data-mobile-src",
    "data-ai-dialog-src",
    "data-ai-fallback",
  ]) {
    const file = localFile(attrs[attribute]);
    if (file) activeAssets.add(file);
    if (file && attribute === "data-desktop-src") desktopAssets.add(file);
  }
  if (attrs.srcset) {
    for (const entry of attrs.srcset.split(","))
      activeAssets.add(localFile(entry.trim().split(/\s+/)[0]));
  }
  if (name === "link") {
    const file = localFile(attrs.href);
    if (file && attrs.rel === "stylesheet") styles.add(file);
  }
  if (name === "script" && attrs.type === "module") {
    const file = localFile(attrs.src);
    if (file) modules.add(file);
  }
  if (name === "img") {
    assert.ok(Object.hasOwn(attrs, "alt"), `alt가 없는 이미지: ${attrs.src}`);
    assert.ok(
      Number(attrs.width) > 0 && Number(attrs.height) > 0,
      `고유 크기가 없는 이미지: ${attrs.src}`,
    );
  }
  if (name === "a" && attrs.href?.startsWith("#")) {
    assert.ok(
      ids.has(attrs.href.slice(1)),
      `연결 대상이 없는 anchor: ${attrs.href}`,
    );
  }
  for (const id of (attrs["aria-labelledby"] ?? "")
    .split(/\s+/)
    .filter(Boolean)) {
    assert.ok(ids.has(id), `aria-labelledby 대상이 없습니다: ${id}`);
  }
}

for (const file of styles) {
  const css = readFileSync(file, "utf8");
  for (const [, reference] of css.matchAll(
    /url\(\s*["']?([^\s)"']+)["']?\s*\)/g,
  ))
    localFile(reference, file);
}
const checkedModules = new Set();
function checkModule(file) {
  if (checkedModules.has(file)) return;
  checkedModules.add(file);
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  const source = readFileSync(file, "utf8");
  for (const [, , reference] of source.matchAll(
    /\b(?:import|export)\s+(?:[^;]*?\s+from\s+)?(["'])([^"']+)\1/g,
  )) {
    const child = localFile(reference, file);
    if (child && [".js", ".mjs"].includes(extname(child))) checkModule(child);
  }
}
for (const file of modules) checkModule(file);

for (const relative of [
  "assets/rebuild/local-walk.webp",
  "assets/rebuild/local-walk-mobile.webp",
  "assets/seoul-traffic-desktop-highway-exposure.mp4",
  "assets/seoul-traffic-mobile-highway-exposure.mp4",
]) {
  assert.ok(
    activeAssets.has(resolve(dist, relative)),
    `활성 페이지에 연결되지 않은 장면 자산: ${relative}`,
  );
}
// 기존 히어로의 회귀 검사가 현재 실제로 사용하는 모듈을 대상으로 하는지 확인합니다.
for (const relative of ["hero-intro.mjs", "hero-background.mjs"]) {
  assert.ok(
    checkedModules.has(resolve(dist, relative)),
    `보존된 히어로 모듈이 활성 진입점에 연결되지 않았습니다: ${relative}`,
  );
}

const manifest = JSON.parse(
  readFileSync(resolve(dist, "assets/redesign/manifest.json"), "utf8"),
);
for (const asset of manifest) {
  const file = localFile(`assets/redesign/${asset.file}`);
  assert.equal(
    statSync(file).size,
    asset.bytes,
    `자산 manifest와 실제 파일 크기가 다릅니다: ${asset.file}`,
  );
}

// 원본 UI의 좌표와 입력 전 상태를 보존한 데스크톱 강조 레이어입니다.
const desktopManifest = JSON.parse(
  readFileSync(resolve(dist, "assets/desktop-motion/manifest.json"), "utf8"),
);
const desktopPanels = new Map([
  [
    "merchant-register-panel.webp",
    {
      source: "dist/assets/merchant-register.png",
      crop: [506, 196, 1101, 500],
    },
  ],
  [
    "merchant-event-panel.webp",
    {
      source: "dist/assets/merchant-event.png",
      crop: [1025, 195, 581, 635],
    },
  ],
]);
assert.equal(
  desktopManifest.length,
  desktopPanels.size,
  "데스크톱 UI 레이어 manifest는 2개여야 합니다.",
);
assert.equal(
  new Set(desktopManifest.map((asset) => asset.file)).size,
  desktopPanels.size,
  "데스크톱 UI 레이어 manifest에 중복 파일이 있습니다.",
);

function losslessWebpSize(buffer, filename) {
  assert.equal(
    buffer.toString("ascii", 0, 4),
    "RIFF",
    `유효한 WebP가 아닙니다: ${filename}`,
  );
  assert.equal(
    buffer.toString("ascii", 8, 12),
    "WEBP",
    `유효한 WebP가 아닙니다: ${filename}`,
  );
  assert.equal(
    buffer.readUInt32LE(4) + 8,
    buffer.length,
    `WebP 파일 길이가 올바르지 않습니다: ${filename}`,
  );
  for (let offset = 12; offset + 8 <= buffer.length; ) {
    const chunk = buffer.toString("ascii", offset, offset + 4);
    const length = buffer.readUInt32LE(offset + 4);
    assert.ok(
      offset + 8 + length <= buffer.length,
      `잘린 WebP chunk: ${filename}`,
    );
    assert.notEqual(
      chunk,
      "VP8 ",
      `UI 레이어가 손실 압축되었습니다: ${filename}`,
    );
    if (chunk === "VP8L") {
      assert.ok(length >= 5, `잘린 lossless WebP header: ${filename}`);
      assert.equal(
        buffer[offset + 8],
        0x2f,
        `lossless WebP 서명이 다릅니다: ${filename}`,
      );
      const dimensions = buffer.readUInt32LE(offset + 9);
      return [(dimensions & 0x3fff) + 1, ((dimensions >>> 14) & 0x3fff) + 1];
    }
    offset += 8 + length + (length % 2);
  }
  assert.fail(`lossless WebP 픽셀 chunk가 없습니다: ${filename}`);
}

for (const asset of desktopManifest) {
  const expected = desktopPanels.get(asset.file);
  assert.ok(expected, `알 수 없는 데스크톱 UI 레이어: ${asset.file}`);
  assert.equal(
    asset.source,
    expected.source,
    `UI 레이어 원본 출처가 다릅니다: ${asset.file}`,
  );
  assert.deepEqual(
    asset.crop,
    expected.crop,
    `확인된 원본 crop 좌표가 다릅니다: ${asset.file}`,
  );
  assert.equal(
    asset.crop_format,
    "[x,y,width,height]; source pixels, no resize",
  );
  assert.equal(asset.encoding, "lossless WebP");
  assert.equal(asset.pixel_exact, true);
  assert.equal(asset.state, "empty-form-before-input");

  const source = readFileSync(localFile(asset.source.slice("dist/".length)));
  assert.equal(
    source.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    `원본이 PNG가 아닙니다: ${asset.source}`,
  );
  assert.equal(
    source.toString("ascii", 12, 16),
    "IHDR",
    `원본 PNG 크기 header가 없습니다: ${asset.source}`,
  );
  const sourceSize = [source.readUInt32BE(16), source.readUInt32BE(20)];
  assert.deepEqual(
    asset.source_size,
    sourceSize,
    `원본 UI 크기가 달라졌습니다: ${asset.file}`,
  );
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    asset.source_sha256,
    `원본 UI 해시가 달라졌습니다: ${asset.file}`,
  );
  const [x, y, width, height] = asset.crop;
  assert.ok(
    asset.crop.every(Number.isInteger) &&
      x >= 0 &&
      y >= 0 &&
      width > 0 &&
      height > 0 &&
      x + width <= sourceSize[0] &&
      y + height <= sourceSize[1],
    `원본 범위를 벗어난 crop: ${asset.file}`,
  );
  assert.deepEqual(
    asset.size,
    [width, height],
    `원본 crop 크기와 결과 크기가 다릅니다: ${asset.file}`,
  );

  const file = localFile(`assets/desktop-motion/${asset.file}`);
  const result = readFileSync(file);
  assert.equal(
    result.length,
    asset.bytes,
    `UI 레이어 manifest와 실제 파일 크기가 다릅니다: ${asset.file}`,
  );
  assert.deepEqual(
    losslessWebpSize(result, asset.file),
    asset.size,
    `UI 레이어 실제 픽셀 크기가 다릅니다: ${asset.file}`,
  );
  assert.ok(
    desktopAssets.has(file),
    `활성 HTML data-desktop-src에 연결되지 않은 UI 레이어: ${asset.file}`,
  );
}
assert.equal(
  tags.filter((tag) => tag.name === "h1").length,
  1,
  "페이지의 대표 h1은 하나여야 합니다.",
);
console.log(
  `정적 배포 검사 통과: 참조 파일 ${files.size}개, module ${checkedModules.size}개, anchor/접근성 id ${ids.size}개, 자산 manifest ${manifest.length}개, 데스크톱 UI 레이어 ${desktopManifest.length}개.`,
);
