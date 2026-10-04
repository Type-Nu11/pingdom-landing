import { createHalftoneRenderer } from './halftone-renderer.mjs?v=revision-7';

export function createRingFlowRenderer(canvas, image) {
  return createHalftoneRenderer(canvas, image);
}

export function createRingFlow({ hero, reducedMotion = { matches: false } }) {
  const canvas = hero.querySelector('.ring-flow-canvas');
  const image = hero.querySelector('.hero-model img');
  const pointer = { x: .5, y: .5, strength: 0, velocityX: 0, velocityY: 0 };
  const target = { x: .5, y: .5, strength: 0, velocityX: 0, velocityY: 0 };
  let renderer, frame = 0, lastTime = null, elapsed = 0;
  let paused = true, loading = false, failed = false, disposed = false;
  let needsResize = true, needsDraw = true, rect = null, pointerTime = null;
  const transitionDuration = .9;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0; lastTime = null;
  }
  function resetPointer(immediate = false) {
    target.strength = 0; target.velocityX = 0; target.velocityY = 0;
    pointerTime = null;
    if (immediate) { pointer.strength = 0; pointer.velocityX = 0; pointer.velocityY = 0; }
  }
  function fallback() {
    if (failed || disposed) return;
    failed = true; stop();
    hero.classList.remove('ring-flow-ready');
    renderer?.dispose(); renderer = null;
  }
  function schedule() {
    if (!paused && !disposed && !failed && renderer && !frame) frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (paused || disposed || failed) return;
    const wallDelta = lastTime === null ? 0 : Math.max((now - lastTime) / 1000, 0);
    const dt = Math.min(wallDelta, .05);
    lastTime = now;
    elapsed += dt;
    // 복귀 감쇠는 실제 경과 시간을 사용해 느린 장치에서도 잔상이 오래 남지 않습니다.
    const follow = 1 - Math.exp(-wallDelta * 14);
    const dissolve = 1 - Math.exp(-wallDelta * (target.strength ? 8 : 10));
    pointer.x += (target.x - pointer.x) * follow;
    pointer.y += (target.y - pointer.y) * follow;
    pointer.strength += (target.strength - pointer.strength) * dissolve;
    pointer.velocityX += (target.velocityX - pointer.velocityX) * follow;
    pointer.velocityY += (target.velocityY - pointer.velocityY) * follow;
    target.velocityX *= Math.exp(-dt * 9);
    target.velocityY *= Math.exp(-dt * 9);
    if (!target.strength && pointer.strength < .002) resetPointer(true);
    try {
      if (needsResize) { renderer.resize(); needsResize = false; rect = null; }
      if (reducedMotion.matches) {
        elapsed = Math.max(elapsed, transitionDuration);
        resetPointer(true);
      }
      renderer.render(elapsed, pointer);
      needsDraw = false;
    } catch { fallback(); return; }
    // 정렬된 하프톤은 마지막 프레임을 유지하고 입력이 있을 때만 다시 그립니다.
    if (!reducedMotion.matches && (elapsed < transitionDuration || target.strength || pointer.strength)) schedule();
    else lastTime = null;
  }
  async function resume() {
    if (paused || disposed || failed || loading) return;
    if (!renderer) {
      loading = true;
      try {
        await image.decode();
        if (paused || disposed || failed) return;
        renderer = createRingFlowRenderer(canvas, image);
        renderer.resize(); needsResize = false; rect = null;
        elapsed = reducedMotion.matches ? transitionDuration : 0;
        renderer.render(elapsed, pointer);
        hero.classList.add('ring-flow-ready');
        needsDraw = false;
      } catch { fallback(); return; }
      finally { loading = false; }
    }
    if (reducedMotion.matches) {
      stop(); resetPointer(true);
      try {
        if (needsResize) { renderer.resize(); needsResize = false; rect = null; }
        elapsed = Math.max(elapsed, transitionDuration);
        renderer.render(elapsed, pointer); needsDraw = false;
      } catch { fallback(); }
    } else if (needsDraw || needsResize || elapsed < transitionDuration || target.strength || pointer.strength) schedule();
  }
  function move(event) {
    if (paused || disposed || failed || reducedMotion.matches || event.pointerType === 'touch') return;
    if (!rect) rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) { leave(); return; }
    const dt = pointerTime === null ? 0 : Math.max(.008, (event.timeStamp - pointerTime) / 1000);
    if (!target.strength) {
      pointer.x = x; pointer.y = y;
      target.velocityX = 0; target.velocityY = 0;
    } else if (dt) {
      target.velocityX = Math.max(-2, Math.min(2, (x - target.x) / dt));
      target.velocityY = Math.max(-2, Math.min(2, (y - target.y) / dt));
    }
    target.x = x; target.y = y; target.strength = 1;
    pointerTime = event.timeStamp;
    schedule();
  }
  function leave() {
    const wasActive = target.strength || pointer.strength;
    resetPointer();
    if (wasActive) schedule();
  }
  function scrolled() { rect = null; leave(); }
  const resizeObserver = new ResizeObserver(() => {
    needsResize = true; rect = null;
    // 정적 상태에서도 화면 크기가 바뀌면 점 간격과 해상도를 한 번 갱신합니다.
    if (renderer) schedule();
  });
  resizeObserver.observe(canvas);
  hero.addEventListener('pointermove', move, { passive: true });
  hero.addEventListener('pointerleave', leave, { passive: true });
  hero.addEventListener('pointercancel', leave, { passive: true });
  window.addEventListener('blur', leave);
  window.addEventListener('scroll', scrolled, { passive: true });
  canvas.addEventListener('webglcontextlost', fallback);
  return {
    setPaused(value) {
      paused = value;
      if (paused) { stop(); resetPointer(true); needsDraw = true; rect = null; }
      else void resume();
    },
    dispose() {
      if (disposed) return;
      disposed = true; stop();
      resizeObserver.disconnect();
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', leave);
      hero.removeEventListener('pointercancel', leave);
      window.removeEventListener('blur', leave);
      window.removeEventListener('scroll', scrolled);
      canvas.removeEventListener('webglcontextlost', fallback);
      hero.classList.remove('ring-flow-ready');
      renderer?.dispose(); renderer = null;
    }
  };
}
