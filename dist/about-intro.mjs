// 소개 섹션의 각 블록을 화면에 들어올 때 한 번씩 보여줍니다.
export function createAboutIntro({ root = document, win = window, reducedMotion } = {}) {
  const items = [...root.querySelectorAll('[data-about-reveal]')];
  if (!items.length || !('IntersectionObserver' in win) || reducedMotion?.matches) return { dispose() {} };
  const html = root.documentElement;
  const observer = new win.IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  html.classList.add('about-reveal');
  items.forEach(item => observer.observe(item));
  return {
    dispose() {
      observer.disconnect();
      html.classList.remove('about-reveal');
    }
  };
}
