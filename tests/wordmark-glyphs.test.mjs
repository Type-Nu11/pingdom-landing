import test from 'node:test';
import assert from 'node:assert/strict';
import { createWordmarkGlyphMap } from '../dist/wordmark-glyphs.mjs';

function image(width, height, alpha = 0) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) data[pixel * 4 + 3] = alpha;
  return { data, width, height };
}

test('투명 이미지에서도 모든 픽셀에 하나의 ID를 배정하고 빈 글자 bounds를 제공한다', () => {
  const input = image(217, 72);
  const { ids, bounds, pivots } = createWordmarkGlyphMap(input);
  assert.equal(ids.length, 217 * 72);
  assert.deepEqual([...new Set(ids)].sort(), [0, 1, 2, 3, 4, 5, 6]);
  assert.ok(ids.every(id => id >= 0 && id < 7));
  for (const [id, x] of [10, 55, 75, 104, 135, 161, 190].entries()) {
    assert.equal(ids[50 * 217 + x], id);
  }
  assert.equal(bounds.length, 7);
  assert.equal(pivots.length, 7);
  bounds.forEach((bound, id) => {
    assert.ok(bound.left < bound.right);
    assert.ok(Object.values(bound).every(value => value >= 0 && value <= 1));
    assert.deepEqual(pivots[id], [(bound.left + bound.right) / 2, bound.bottom]);
    if (id > 0) assert.equal(bound.left, bounds[id - 1].right);
  });
});

test('고정 수직 절단 대신 불투명 글자 사이의 휘어진 투명 통로를 따른다', () => {
  const input = image(217, 72, 255);
  const corridor = y => y < 24 ? 91 : y < 48 ? 92 : 91;
  for (let y = 0; y < input.height; y++) input.data[(y * input.width + corridor(y)) * 4 + 3] = 0;
  const { ids } = createWordmarkGlyphMap(input);
  for (let y = 0; y < input.height; y++) {
    const x = corridor(y);
    assert.equal(ids[y * input.width + x - 1], 2, `row ${y}: n 오른쪽 윤곽`);
    assert.equal(ids[y * input.width + x], 3, `row ${y}: 투명 경계`);
    assert.equal(ids[y * input.width + x + 1], 3, `row ${y}: g 왼쪽 윤곽`);
  }
});

test('i 점의 양끝과 본체를 같은 ID와 bounds에 포함하고 아래의 인접 글자는 보존한다', () => {
  const input = image(434, 145);
  for (const [x, y] of [[95, 35], [124, 35], [105, 70]]) input.data[(y * input.width + x) * 4 + 3] = 255;
  const { ids, bounds } = createWordmarkGlyphMap(input);
  for (const [x, y] of [[95, 35], [124, 35], [105, 70]]) assert.equal(ids[y * input.width + x], 1);
  assert.equal(ids[70 * input.width + 95], 0);
  assert.equal(ids[70 * input.width + 124], 2);
  assert.ok(bounds[1].left <= 95 / input.width);
  assert.ok(bounds[1].right >= 125 / input.width);
  assert.ok(bounds[1].top <= 35 / input.height);
  assert.ok(bounds[1].bottom >= 71 / input.height);
});
