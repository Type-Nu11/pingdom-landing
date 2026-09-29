import { createRingFormation } from './ring-particles.mjs?v=word-2';

export function startHeroIntro({ hero, reducedMotion, onComplete }) {
  const root = document.documentElement;
  if (!root.classList.contains('intro-pending')) return;
  const canvas = hero.querySelector('.intro-particles');
  let ended = false, readyTimeout, frame, formation;
  const animations = [];
  const finish = () => window.dispatchEvent(new Event('pingdom:intro-finish'));
  if (!canvas) { finish(); onComplete(); return; }
  const endForMotion = () => { if (reducedMotion.matches) finish(); };
  const endWhenHidden = () => { if (document.hidden && formation) finish(); };
  function cleanup() {
    if (ended) return;
    ended = true;
    clearTimeout(readyTimeout);
    cancelAnimationFrame(frame);
    canvas.removeEventListener('webglcontextlost', finish);
    window.removeEventListener('resize', finish);
    document.removeEventListener('visibilitychange', endWhenHidden);
    reducedMotion.removeEventListener('change', endForMotion);
    window.removeEventListener('pingdom:intro-end', cleanup);
    animations.forEach(animation => animation.cancel());
    formation?.dispose();
    onComplete();
  }
  window.addEventListener('pingdom:intro-end', cleanup);
  reducedMotion.addEventListener('change', endForMotion);
  canvas.addEventListener('webglcontextlost', finish);
  document.addEventListener('visibilitychange', endWhenHidden);
  if (reducedMotion.matches || window.scrollY > 40) { finish(); return; }

  const image = hero.querySelector('.hero-model img');
  // 이미지가 늦거나 GPU를 사용할 수 없어도 첫 화면을 계속 가리지 않습니다.
  const readiness = Promise.all([Promise.resolve().then(() => image.decode()), document.fonts.ready]);
  Promise.race([
    readiness,
    new Promise(resolve => { readyTimeout = setTimeout(resolve, 1200); })
  ]).then(() => {
    if (ended || !root.classList.contains('intro-pending')) return;
    if (!image.complete || !image.naturalWidth) { finish(); return; }
    try { play(); } catch { finish(); }
  }, finish).finally(() => clearTimeout(readyTimeout));

  function play() {
    formation = createRingFormation(canvas, image, hero.querySelector('.hero-model'), hero);
    window.addEventListener('resize', finish);
    const startTime = document.timeline.currentTime;
    function animate(selector, keyframes, duration, delay) {
      const animation = document.querySelector(selector).animate(keyframes, {
        duration, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both'
      });
      animation.startTime = startTime;
      // 중간 해제는 정상적인 종료 경로이므로 취소 Promise를 처리합니다.
      animation.finished.catch(() => {});
      animations.push(animation);
    }
    animate('.hero-art', [{ opacity: 0 }, { opacity: 1 }], 1600, 4500);
    animate('.hero-light', [{ opacity: 0 }, { opacity: .6 }], 2600, 1750);
    animate('.hero-line-top', [
      { opacity: 0, transform: 'translate3d(-12px,18px,0)' },
      { opacity: 1, transform: 'translate3d(0,0,0)' }
    ], 1200, 5050);
    animate('.hero-line-bottom', [
      { opacity: 0, transform: 'translate3d(16px,-12px,0)' },
      { opacity: 1, transform: 'translate3d(0,0,0)' }
    ], 1250, 5300);
    animate('.header', [{ opacity: 0 }, { opacity: 1 }], 950, 5700);
    animate('.hero-bottom', [{ opacity: 0 }, { opacity: 1 }], 850, 5900);
    root.classList.add('intro-playing');
    function render(now) {
      if (ended) return;
      const elapsed = (now-startTime)/1000;
      try { formation.render(elapsed); } catch { finish(); return; }
      if (elapsed >= 6.8) { finish(); return; }
      frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);
  }
}
