// 모바일: 첫 화면을 지나면 "맨 위로" 버튼을 보여주고, 푸터 근처에서는 숨깁니다.
const button = document.querySelector('[data-to-top]');
const compact = window.matchMedia('(max-width: 999px)');

if (button) {
  button.hidden = false;
  let ticking = false;
  const update = () => {
    ticking = false;
    const doc = document.documentElement;
    const nearTop = window.scrollY < window.innerHeight * 1.5;
    const nearFooter = doc.scrollHeight - window.scrollY - window.innerHeight < 480;
    button.classList.toggle('is-visible', compact.matches && !nearTop && !nearFooter);
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  button.addEventListener('click', () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
  });
  update();
}
