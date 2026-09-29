const SOURCE_WIDTH = 2172;
const SOURCE_HEIGHT = 724;
const GLYPH_COUNT = 7;
// 경계 검색을 글자 사이로 제한해 글자 내부의 구멍으로 경로가 빠지는 것을 막습니다.
const SEAM_BANDS = [
  [445, 515, 486],
  [600, 645, 621],
  [870, 925, 900],
  [1140, 1200, 1175],
  [1485, 1555, 1527],
  [1735, 1795, 1765]
];
const STATIC_EDGES = [0, ...SEAM_BANDS.map(([, , center]) => center / SOURCE_WIDTH), 1];

function isDot(x, y, width, height) {
  const sourceX = (x + .5) * SOURCE_WIDTH / width;
  const sourceY = (y + .5) * SOURCE_HEIGHT / height;
  return sourceX >= 475 && sourceX < 624 && sourceY >= 103 && sourceY < 248;
}

function findSeam(data, width, height, [sourceLeft, sourceRight, sourceCenter]) {
  const left = Math.max(0, Math.floor(sourceLeft * width / SOURCE_WIDTH));
  const right = Math.min(width - 1, Math.ceil(sourceRight * width / SOURCE_WIDTH));
  const count = right - left + 1;
  const previousColumn = new Int32Array(count * height);
  let previous = new Float64Array(count);
  let current = new Float64Array(count);

  for (let y = 0; y < height; y++) {
    for (let column = 0; column < count; column++) {
      const x = left + column;
      // 점은 본체와 별도로 i에 배정하므로 경계 탐색에서도 장애물로 취급하지 않습니다.
      const alpha = isDot(x, y, width, height) ? 0 : data[(y * width + x) * 4 + 3] / 255;
      const distance = (x + .5) * SOURCE_WIDTH / width - sourceCenter;
      const cost = alpha * alpha * 100 + distance * distance * .0025;
      let best = Infinity;
      let bestColumn = column;
      for (let candidate = Math.max(0, column - 1); candidate <= Math.min(count - 1, column + 1); candidate++) {
        const candidateCost = previous[candidate] + Math.abs(candidate - column) * .75;
        if (candidateCost < best) {
          best = candidateCost;
          bestColumn = candidate;
        }
      }
      current[column] = cost + best;
      previousColumn[y * count + column] = bestColumn;
    }
    [previous, current] = [current, previous];
  }

  let column = 0;
  for (let candidate = 1; candidate < count; candidate++) {
    if (previous[candidate] < previous[column]) column = candidate;
  }
  const seam = new Int32Array(height);
  for (let y = height - 1; y >= 0; y--) {
    seam[y] = left + column;
    column = previousColumn[y * count + column];
  }
  return seam;
}

/**
 * 원본 합성 이미지의 픽셀 소유권만 나눕니다. 접촉면에 가려진 글자 윤곽은 복원하지 않습니다.
 * bounds와 pivots는 Canvas 원점과 같은 왼쪽 위 기준 UV이며 right/bottom은 바깥 경계입니다.
 */
export function createWordmarkGlyphMap({ data, width, height }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || !data || data.length < width * height * 4) {
    throw new RangeError('Wordmark glyph map requires positive dimensions and RGBA data.');
  }
  const seams = SEAM_BANDS.map(band => findSeam(data, width, height, band));
  const ids = new Uint8Array(width * height);
  const extents = Array.from({ length: GLYPH_COUNT }, () => ({ left: width, right: -1, top: height, bottom: -1 }));

  for (let y = 0; y < height; y++) {
    // 작은 테스트 입력에서 검색 띠가 같은 픽셀로 반올림되어도 경계 순서는 보존합니다.
    for (let index = 1; index < seams.length; index++) seams[index][y] = Math.max(seams[index - 1][y], seams[index][y]);
    let bodyId = 0;
    for (let x = 0; x < width; x++) {
      while (bodyId < seams.length && x >= seams[bodyId][y]) bodyId++;
      const id = isDot(x, y, width, height) ? 1 : bodyId;
      const pixel = y * width + x;
      ids[pixel] = id;
      if (data[pixel * 4 + 3] < 5) continue;
      const extent = extents[id];
      extent.left = Math.min(extent.left, x);
      extent.right = Math.max(extent.right, x);
      extent.top = Math.min(extent.top, y);
      extent.bottom = Math.max(extent.bottom, y);
    }
  }

  const padding = 2;
  const bounds = extents.map((extent, id) => extent.right < 0 ? {
    left: STATIC_EDGES[id], right: STATIC_EDGES[id + 1], top: 0, bottom: 1
  } : {
    left: Math.max(0, extent.left - padding) / width,
    right: Math.min(width, extent.right + 1 + padding) / width,
    top: Math.max(0, extent.top - padding) / height,
    bottom: Math.min(height, extent.bottom + 1 + padding) / height
  });
  const pivots = bounds.map(({ left, right, bottom }) => [(left + right) / 2, bottom]);
  return { ids, bounds, pivots };
}
