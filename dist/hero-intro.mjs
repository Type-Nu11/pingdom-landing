export function startHeroIntro({ hero, reducedMotion, onComplete }) {
  const root = document.documentElement;
  if (!root.classList.contains('intro-pending')) return;
  let ended = false;
  let readyTimeout;
  const animations = [];
  const finish = () => window.dispatchEvent(new Event('pingdom:intro-finish'));
  const endForMotion = () => { if (reducedMotion.matches) finish(); };
  function cleanup() {
    if (ended) return;
    ended = true;
    clearTimeout(readyTimeout);
    animations.forEach(animation => animation.cancel());
    reducedMotion.removeEventListener('change', endForMotion);
    window.removeEventListener('pingdom:intro-end', cleanup);
    onComplete();
  }
  window.addEventListener('pingdom:intro-end', cleanup);
  reducedMotion.addEventListener('change', endForMotion);
  if (reducedMotion.matches || window.scrollY > 40) { finish(); return; }

  const image = hero.querySelector('.hero-model img');
  // 느린 이미지/폰트가 페이지 진입을 계속 막지 않도록 준비 시간을 제한합니다.
  const readiness = Promise.all([Promise.resolve().then(() => image.decode()), document.fonts.ready]);
  Promise.race([
    readiness,
    new Promise(resolve => { readyTimeout = setTimeout(resolve, 800); })
  ]).then(() => {
    if (ended || !root.classList.contains('intro-pending')) return;
    if (!image.complete || !image.naturalWidth) { finish(); return; }
    try { play(); } catch { finish(); }
  }, finish).finally(() => clearTimeout(readyTimeout));

  function play() {
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    const restingY = mobile ? 7 : 9;
    const restingAngle = mobile ? -6 : -7;
    const startTime = document.timeline.currentTime;
    function animate(selector, keyframes, duration, delay = 0, easing = 'cubic-bezier(.22,1,.36,1)') {
      const animation = document.querySelector(selector).animate(keyframes, { duration, delay, easing, fill: 'both' });
      animation.startTime = startTime;
      animations.push(animation);
    }
    animate('.intro-wordmark', [
      { opacity: 0, transform: 'scale(.86)', offset: 0 },
      { opacity: 1, transform: 'scale(1)', offset: .3 },
      { opacity: 1, transform: 'scale(1.02)', offset: .65 },
      { opacity: 0, transform: 'scale(1.18)', offset: 1 }
    ], 1150);
    animate('.intro-beam', [
      { opacity: 0, transform: 'scaleY(0)', offset: 0 },
      { opacity: .65, transform: 'scaleY(1)', offset: .45 },
      { opacity: 0, transform: 'scaleY(1)', offset: 1 }
    ], 1100, 250);
    for (const side of ['left', 'right']) {
      animate('.intro-shutter-' + side, [
        { transform: 'translateX(0)' },
        { transform: 'translateX(' + (side === 'left' ? '-102%' : '102%') + ')' }
      ], 1200, 650, 'cubic-bezier(.76,0,.24,1)');
    }
    animate('.portal-float', [
      { opacity: .3, transform: `translate3d(-8vw,8vh,0) rotate(-64deg) scale(${mobile ? 2.8 : 3.6})`, offset: 0 },
      { opacity: 1, transform: 'translate3d(4vw,-3vh,0) rotate(-28deg) scale(1.9)', offset: .4 },
      { opacity: 1, transform: `translate3d(0,${restingY}px,0) rotate(-5deg) scale(.98)`, offset: .8 },
      { opacity: 1, transform: `translate3d(0,${restingY}px,0) rotate(${restingAngle}deg) scale(1)`, offset: 1 }
    ], 2500, 450, 'cubic-bezier(.3,.05,.2,1)');
    animate('.hero-line-top', [
      { opacity: 0, transform: 'translate3d(-55px,30px,0) rotate(-2deg)' },
      { opacity: 1, transform: 'translate3d(0,0,0) rotate(0)' }
    ], 850, 1800);
    animate('.hero-line-bottom', [
      { opacity: 0, transform: 'translate3d(75px,60px,0) rotate(3deg)' },
      { opacity: 1, transform: 'translate3d(0,0,0) rotate(0)' }
    ], 850, 2100);
    animate('.header', [
      { opacity: 0, transform: 'translateY(-18px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], 650, 2350);
    animate('.hero-bottom', [
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], 550, 2650);
    root.classList.add('intro-playing');
    // 모든 효과를 함께 해제해 텍스트에 변환 레이어나 임시 스타일을 남기지 않습니다.
    Promise.all(animations.map(animation => animation.finished)).then(finish, finish);
  }
}
