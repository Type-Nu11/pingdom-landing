import test from 'node:test';
import assert from 'node:assert/strict';
import { createRingFormation } from '../dist/ring-particles.mjs';

// 실제 생성·렌더 경로에 WebGL/2D Canvas 대역을 주입합니다.
// 셰이더 컴파일, GPU 출력, 시각적 동일성 또는 실제 성능을 검증하는 테스트는 아닙니다.
function createWebGLMock() {
  const gl = Object.fromEntries([
    'ARRAY_BUFFER', 'STATIC_DRAW', 'VERTEX_SHADER', 'FRAGMENT_SHADER',
    'COMPILE_STATUS', 'LINK_STATUS', 'BLEND', 'COLOR_BUFFER_BIT',
    'TEXTURE0', 'TEXTURE1', 'TEXTURE_2D', 'TEXTURE_MIN_FILTER',
    'TEXTURE_MAG_FILTER', 'LINEAR', 'NEAREST', 'TEXTURE_WRAP_S', 'TEXTURE_WRAP_T',
    'CLAMP_TO_EDGE', 'RGBA', 'UNSIGNED_BYTE', 'FRAMEBUFFER',
    'COLOR_ATTACHMENT0', 'FRAMEBUFFER_COMPLETE', 'FLOAT', 'POINTS',
    'TRIANGLES', 'SRC_ALPHA', 'ONE', 'ONE_MINUS_SRC_ALPHA'
  ].map((name, index) => [name, index + 1]));
  let nextId = 0;
  const state = { framebuffer: null, viewport: null, draws: [], clears: [] };
  let activeTexture = gl.TEXTURE0;
  const textureUnits = new Map();
  for (const kind of ['Buffer', 'Shader', 'Program', 'Texture', 'Framebuffer']) {
    gl['create' + kind] = () => ({ kind, id: ++nextId });
    gl['delete' + kind] = () => {};
  }
  for (const method of [
    'shaderSource', 'compileShader', 'attachShader', 'linkProgram',
    'bindBuffer', 'bufferData', 'useProgram', 'uniform1f', 'uniform1i',
    'uniform2f', 'activeTexture', 'bindTexture', 'texParameteri',
    'texImage2D', 'framebufferTexture2D', 'enable', 'disable',
    'clearColor', 'blendFuncSeparate', 'enableVertexAttribArray',
    'vertexAttribPointer', 'disableVertexAttribArray'
  ]) gl[method] = () => {};
  gl.getShaderParameter = () => true;
  gl.getProgramParameter = () => true;
  gl.getShaderInfoLog = gl.getProgramInfoLog = () => '';
  gl.getUniformLocation = (program, name) => ({ program, name });
  gl.getAttribLocation = () => 0;
  gl.checkFramebufferStatus = () => gl.FRAMEBUFFER_COMPLETE;
  gl.getExtension = () => null;
  gl.bindFramebuffer = (_target, framebuffer) => { state.framebuffer = framebuffer; };
  gl.viewport = (...values) => { state.viewport = values; };
  gl.clear = mask => { state.clears.push({ mask, framebuffer: state.framebuffer }); };
  gl.activeTexture = unit => { activeTexture = unit; };
  gl.bindTexture = (_target, texture) => { textureUnits.set(activeTexture, texture); };
  gl.texImage2D = (...args) => {
    if (args.length === 9 && ArrayBuffer.isView(args[8])) textureUnits.get(activeTexture).role = 'glyph-mask';
  };
  gl.drawArrays = (type, first, count) => {
    state.draws.push({ type, first, count, framebuffer: state.framebuffer, mask: textureUnits.get(gl.TEXTURE1) });
  };
  return { gl, state };
}

function createCanvas2DMock() {
  const context = {
    measureText: text => ({
      width: text.length * 100,
      actualBoundingBoxAscent: 240,
      actualBoundingBoxDescent: 60
    }),
    fillText() {},
    drawImage() {},
    putImageData() {},
    getImageData(_x, _y, width, height) {
      const data = new Uint8ClampedArray(width * height * 4);
      // 입자 생성 경로를 통과할 최소 불투명 픽셀을 제공합니다.
      data.set([246, 240, 252, 255]);
      if (width === 342 && height === 396) {
        data.set([30, 30, 30, 255]);
        data.set([255, 255, 255, 255], (width + 1) * 4);
      }
      return { data };
    }
  };
  return {
    width: 0,
    height: 0,
    getContext(type) { assert.equal(type, '2d'); return context; }
  };
}

function installGlobal(name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  return () => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else delete globalThis[name];
  };
}

test('인트로 가시 구간에 필요한 GPU 패스만 실행하고 기본 framebuffer로 복귀한다', async t => {
  const { gl, state } = createWebGLMock();
  const restoreWindow = installGlobal('window', {
    devicePixelRatio: 2,
    matchMedia: () => ({ matches: false })
  });
  const restoreDocument = installGlobal('document', {
    createElement(tag) { assert.equal(tag, 'canvas'); return createCanvas2DMock(); }
  });
  let formation;
  t.after(() => {
    try { formation?.dispose(); }
    finally { restoreDocument(); restoreWindow(); }
  });
  const canvas = {
    getContext(type) { assert.equal(type, 'webgl'); return gl; }
  };
  const image = { naturalWidth: 1345, naturalHeight: 1170 };
  const hero = {
    clientWidth: 1280,
    clientHeight: 800,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 800 })
  };
  const model = {
    getBoundingClientRect: () => ({ left: 280, top: 180, width: 720, height: 626 })
  };
  formation = createRingFormation(canvas, image, model, hero, { naturalWidth: 342, naturalHeight: 396 });

  for (const [time, expectedDraws] of [[1, 1], [2.5, 7], [4, 6], [5, 7], [6.15, 1], [7.2, 1], [7.8, 1]]) {
    await t.test(`${time}초에는 drawArrays ${expectedDraws}회를 실행한다`, () => {
      state.draws.length = 0;
      state.clears.length = 0;
      formation.render(time);

      assert.equal(state.framebuffer, null, '프레임 종료 후 기본 framebuffer가 활성화되어야 합니다.');
      assert.deepEqual(state.viewport, [0, 0, canvas.width, canvas.height]);
      assert.ok(state.clears.some(clear => clear.framebuffer === null), '입자 패스를 생략해도 기본 framebuffer는 지워야 합니다.');
      assert.equal(state.draws.length, expectedDraws);
      assert.equal(state.draws.at(-1).framebuffer, null, '마지막 패스는 화면에 그려야 합니다.');
      if (time >= 6.15) {
        assert.equal(state.draws[0].count, 42, '일곱 글자를 하나의 draw로 그려야 합니다.');
        assert.equal(state.draws[0].mask?.role, 'glyph-mask', '잔광이 사용한 texture unit에 글자 마스크를 다시 연결해야 합니다.');
      }
    });
  }

  await t.test('dispose 이후에는 GPU 패스를 실행하지 않는다', () => {
    formation.dispose();
    state.draws.length = 0;
    state.clears.length = 0;
    formation.render(7.8);
    assert.equal(state.draws.length, 0);
    assert.equal(state.clears.length, 0);
    assert.equal(state.framebuffer, null);
  });
});
