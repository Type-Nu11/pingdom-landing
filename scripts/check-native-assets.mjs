// Native UI와 사진 파생 자산의 출처·출력·픽셀 보존을 독립 검증합니다.
// --outputs-only는 외부 생성 원본이 없는 배포 산출물에도 사용할 수 있습니다.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = resolve(root, 'dist/assets/desktop-polish');
const manifestFile = join(directory, 'manifest.json');
const args = process.argv.slice(2);
let outputsOnly = false;
let python = process.env.PINGDOM_ASSET_PYTHON;
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--outputs-only') outputsOnly = true;
  else if (args[index] === '--python' && args[index + 1]) python = args[++index];
  else throw new Error(`알 수 없는 옵션: ${args[index]}`);
}
const bundledPython = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3');
python ??= existsSync(bundledPython) ? bundledPython : 'python3';
const entries = JSON.parse(readFileSync(manifestFile, 'utf8'));
assert.equal(entries.length, 23, '현재 native 자산 manifest는 23개여야 합니다.');
assert.equal(new Set(entries.map(({ file }) => file)).size, entries.length, '자산 파일명이 중복됩니다.');

function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function losslessWebpSize(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, 'WebP RIFF 길이가 실제 파일과 다릅니다.');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    assert.ok(start + length <= bytes.length, 'WebP chunk가 파일 범위를 벗어납니다.');
    if (type === 'VP8L') {
      assert.ok(length >= 5);
      assert.equal(bytes[start], 0x2f, 'WebP lossless signature가 다릅니다.');
      const packed = bytes.readUInt32LE(start + 1);
      return [(packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1];
    }
    offset = start + length + (length % 2);
  }
  throw new Error('lossless VP8L chunk가 없습니다.');
}

for (const entry of entries) {
  assert.equal(basename(entry.file), entry.file, '출력 경로는 native 자산 폴더 내부여야 합니다.');
  assert.equal(entry.pixel_exact, true, `${entry.file}: 원본 픽셀 보존 선언이 없습니다.`);
  const output = readFileSync(join(directory, entry.file));
  assert.equal(output.length, entry.bytes, `${entry.file}: bytes 불일치`);
  assert.equal(hash(output), entry.sha256, `${entry.file}: 출력 SHA256 불일치`);
  assert.deepEqual(losslessWebpSize(output), entry.size, `${entry.file}: 출력 크기 불일치`);
  if (outputsOnly) continue;
  const external = isAbsolute(entry.source);
  assert.equal(external, entry.source_kind === 'external-generated-original', `${entry.file}: 외부 원본 종류 불일치`);
  const source = readFileSync(external ? entry.source : resolve(root, entry.source));
  assert.equal(hash(source), entry.source_sha256, `${entry.file}: 원본 SHA256 불일치`);
}

if (!outputsOnly) {
  // Pillow를 한 번 호출하여 모든 출력의 RGBA 픽셀을 원본/원본 crop과 비교합니다.
  // 원본이나 출력 파일에는 쓰지 않으며, shell을 통하지 않습니다.
  const result = execFileSync(python, ['-c', String.raw`
from pathlib import Path
from PIL import Image
import json, sys
root = Path(sys.argv[1])
manifest = Path(sys.argv[2])
for entry in json.loads(manifest.read_text()):
    source = Path(entry['source'])
    if not source.is_absolute():
        source = root / source
    with Image.open(source) as original, Image.open(manifest.parent / entry['file']) as output:
        assert list(original.size) == entry['source_size'], entry['file'] + ': source size'
        expected = original
        if 'crop' in entry:
            assert entry['crop_format'] == '[left,top,right,bottom]; right/bottom excluded'
            left, top, right, bottom = entry['crop']
            assert 0 <= left < right <= original.width and 0 <= top < bottom <= original.height
            expected = original.crop((left, top, right, bottom))
        assert list(expected.size) == entry['size'], entry['file'] + ': crop size'
        assert expected.convert('RGBA').tobytes() == output.convert('RGBA').tobytes(), entry['file'] + ': RGBA pixels'
        if original.info.get('icc_profile'):
            assert output.info.get('icc_profile') == original.info['icc_profile'], entry['file'] + ': ICC profile'
print('원본 및 crop RGBA 픽셀 일치 확인')
`, root, manifestFile], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  console.log(result);
}
console.log(`Native 자산 ${entries.length}개 검증 통과: 출력 SHA256·bytes·lossless 크기${outputsOnly ? ' (원본 픽셀 검증 제외)' : ' 및 원본 SHA256·RGBA 픽셀'}.`);
