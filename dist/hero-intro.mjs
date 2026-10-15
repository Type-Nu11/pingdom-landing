// "pingdom." 문구가 흐려지는 사이 마침표가 분홍 원으로 번지고, 로고 자리에서 야경이 열리며 로고가 떠오릅니다.
const POP_EASE = 'cubic-bezier(.34,1.4,.64,1)';
const OUT_EASE = 'cubic-bezier(.22,1,.36,1)';
const FILL_EASE = 'cubic-bezier(.7,0,.2,1)';
const OPEN_EASE = 'cubic-bezier(.76,0,.24,1)';
const FADE_AT = 1180;
const POP_AT = 1300;
const REVEAL_AT = 1980;
const FINISH_AT = 4100;

export function startHeroIntro({ hero, reducedMotion, onComplete }) {
  const root = document.documentElement;
  if (!root.classList.contains('intro-pending')) return;
  const pop = hero.querySelector('.intro-pop');
  const word = hero.querySelector('.intro-word');
  const dot = hero.querySelector('.intro-word-dot');
  const model = hero.querySelector('.hero-model');
  const image = hero.querySelector('.hero-model img');
  let ended = false, readyTimeout, revealTimer, finishTimer, viewportWidth, layout;
  const animations = [];
  const finish = () => window.dispatchEvent(new Event('pingdom:intro-finish'));
  if (!pop || !word || !dot || !model || !image) { finish(); onComplete(); return; }
  const endForMotion = () => { if (reducedMotion.matches) finish(); };
  const endWhenHidden = () => { if (document.hidden) finish(); };
  // 주소표시줄 변화는 허용하되 실제 렌더 영역이 달라지면 이전 원 중심을 계속 사용하지 않습니다.
  const endWhenResized = () => {
    if (window.innerWidth !== viewportWidth || hero.clientWidth !== layout.heroWidth || hero.clientHeight !== layout.heroHeight ||
      model.clientWidth !== layout.modelWidth || model.clientHeight !== layout.modelHeight) finish();
  };
  function cleanup() {
    if (ended) return;
    ended = true;
    clearTimeout(readyTimeout);
    clearTimeout(revealTimer);
    clearTimeout(finishTimer);
    window.removeEventListener('resize', endWhenResized);
    document.removeEventListener('visibilitychange', endWhenHidden);
    reducedMotion.removeEventListener('change', endForMotion);
    window.removeEventListener('pingdom:intro-end', cleanup);
    animations.forEach(animation => animation.cancel());
    hero.classList.remove('intro-revealed');
    onComplete();
  }
  window.addEventListener('pingdom:intro-end', cleanup);
  reducedMotion.addEventListener('change', endForMotion);
  document.addEventListener('visibilitychange', endWhenHidden);
  if (reducedMotion.matches) { finish(); return; }

  // 로고와 글꼴이 늦게 와도 첫 화면을 계속 가리지 않습니다.
  Promise.race([
    Promise.all([Promise.resolve().then(() => image.decode()), document.fonts.ready]),
    new Promise(resolve => { readyTimeout = setTimeout(resolve, 1200); })
  ]).then(() => {
    if (ended || !root.classList.contains('intro-pending')) return;
    if (!image.complete || !image.naturalWidth) { finish(); return; }
    try { play(); } catch { finish(); }
  }, finish).finally(() => clearTimeout(readyTimeout));

  function play() {
    const bounds = hero.getBoundingClientRect(), box = dot.getBoundingClientRect(), logo = model.getBoundingClientRect();
    const art = hero.querySelector('.hero-art'), artBounds = art?.getBoundingClientRect?.() ?? bounds;
    const width = hero.clientWidth, height = hero.clientHeight;
    const x = box.left - bounds.left + box.width / 2;
    const y = box.top - bounds.top + box.height / 2;
    const radius = box.width / 2;
    const cover = Math.ceil(Math.hypot(Math.max(x, width - x), Math.max(y, height - y))) + 2;
    // 야경은 로고 중심에서 열려, 이어서 떠오르는 로고와 같은 자리에 시선이 머뭅니다. (야경 상자는 히어로보다 위로 길어 좌표를 따로 잽니다.)
    const ax = logo.left - artBounds.left + logo.width / 2;
    const ay = logo.top - artBounds.top + logo.height / 2;
    const artWidth = artBounds.width, artHeight = artBounds.height;
    const artCover = Math.ceil(Math.hypot(Math.max(ax, artWidth - ax), Math.max(ay, artHeight - ay))) + 2;
    const round = value => Math.round(value * 10) / 10;
    const circle = (size, cx = x, cy = y) => `circle(${round(size)}px at ${round(cx)}px ${round(cy)}px)`;
    viewportWidth = window.innerWidth;
    layout = { heroWidth: width, heroHeight: height, modelWidth: model.clientWidth, modelHeight: model.clientHeight };
    window.addEventListener('resize', endWhenResized);
    const startTime = document.timeline.currentTime;
    function animate(target, keyframes, duration, delay, easing = OUT_EASE, fill = 'both') {
      const element = typeof target === 'string' ? document.querySelector(target) : target;
      if (!element) return;
      const animation = element.animate(keyframes, { duration, delay, easing, fill });
      animation.startTime = startTime;
      // 중간 해제는 정상적인 종료 경로이므로 취소 Promise를 처리합니다.
      animation.finished.catch(() => {});
      animations.push(animation);
    }
    // 문구가 먼저 떠오르고, 마침표는 늦게 톡 찍힙니다.
    animate('.intro-word-text', [
      { opacity: 0, transform: 'translate3d(0,.18em,0)', filter: 'blur(8px)' },
      { opacity: 1, transform: 'translate3d(0,0,0)', filter: 'blur(0)' }
    ], 800, 150);
    animate(dot, [
      { transform: 'scale(0)', easing: POP_EASE },
      { transform: 'scale(1)' }
    ], 520, 700, 'linear');
    // 문구가 살짝 물러나며 흐려지는 동안 마침표가 멈춤 없이 번지기 시작합니다.
    animate('.intro-word-text', [
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' },
      { opacity: 0, transform: 'scale(.96)', filter: 'blur(10px)' }
    ], 420, FADE_AT, 'cubic-bezier(.4,0,.2,1)', 'forwards');
    animate(dot, [{ opacity: 1 }, { opacity: 0 }], 1, POP_AT, 'linear', 'forwards');
    animate(pop, [
      { clipPath: circle(radius) },
      { clipPath: circle(cover) }
    ], 760, POP_AT, FILL_EASE, 'forwards');
    animate('.hero-art', [
      { opacity: 1, clipPath: circle(0, ax, ay) },
      { opacity: 1, clipPath: circle(artCover, ax, ay) }
    ], 1000, REVEAL_AT, OPEN_EASE);
    // 열리는 동안 야경이 천천히 제자리로 물러나 깊이감을 줍니다.
    ['.hero-art img', '.hero-art video'].forEach(selector => animate(selector, [
      { transform: 'scale(1.14)' },
      { transform: 'scale(1)' }
    ], 2000, REVEAL_AT, OUT_EASE));
    animate('.hero-light', [{ opacity: 0 }, { opacity: .6 }], 900, REVEAL_AT + 450);
    animate('.hero-model', [
      { opacity: 0, transform: 'scale(.86)', filter: 'blur(12px)', easing: OUT_EASE },
      { opacity: 1, transform: 'scale(1.02)', filter: 'blur(0)', offset: .65, easing: 'ease-in-out' },
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }
    ], 900, REVEAL_AT + 380, 'linear');
    animate('.hero-line-top', [
      { opacity: 0, transform: 'translate3d(0,22px,0)', filter: 'blur(6px)' },
      { opacity: 1, transform: 'translate3d(0,0,0)', filter: 'blur(0)' }
    ], 900, REVEAL_AT + 900);
    animate('.hero-line-bottom', [
      { opacity: 0, transform: 'translate3d(0,-18px,0)', filter: 'blur(6px)' },
      { opacity: 1, transform: 'translate3d(0,0,0)', filter: 'blur(0)' }
    ], 900, REVEAL_AT + 1020);
    animate('.hero-bottom', [{ opacity: 0 }, { opacity: 1 }], 700, REVEAL_AT + 1400);
    root.classList.add('intro-playing');
    // 분홍 원이 화면을 채운 뒤에 어둡게 깔리는 그림자를 되돌려 분홍이 탁해지지 않게 합니다.
    revealTimer = setTimeout(() => hero.classList.add('intro-revealed'), REVEAL_AT);
    finishTimer = setTimeout(finish, FINISH_AT);
  }
}
