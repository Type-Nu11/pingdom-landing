export function createMobileExperience({ root = document, win = window, reducedMotion } = {}) {
  const mobile = win.matchMedia('(max-width: 999px)');
  const reduced = reducedMotion ?? win.matchMedia('(prefers-reduced-motion: reduce)');
  const viewport = root.querySelector('.strengths-viewport');
  const track = root.querySelector('.strengths-track');
  const previous = root.querySelector('[data-strength-direction="-1"]');
  const next = root.querySelector('[data-strength-direction="1"]');
  const dialog = root.querySelector('#mobile-screen-dialog');
  const preview = dialog?.querySelector('[data-mobile-screen-image]');
  const title = dialog?.querySelector('#mobile-screen-title');
  const zoom = dialog?.querySelector('[data-mobile-zoom]');
  const hint = dialog?.querySelector('[data-mobile-screen-hint]');
  const originalTabIndex = viewport?.getAttribute('tabindex');
  let running = false, invoker = null, observer;
  const cleanups = [];

  function updateCards() {
    if (!viewport || !mobile.matches) return;
    const end = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    if (previous) previous.disabled = viewport.scrollLeft <= 2;
    if (next) next.disabled = viewport.scrollLeft >= end - 2;
  }
  function closePreview() {
    root.documentElement.classList.remove('mobile-dialog-open');
    dialog?.classList.remove('is-web', 'is-zoomed');
    preview?.removeAttribute('src');
    zoom?.setAttribute('aria-pressed', 'false');
    if (zoom) zoom.textContent = '확대';
    invoker?.focus({ preventScroll: true });
    invoker = null;
  }
  function refresh() {
    if (!running) return;
    if (mobile.matches) viewport?.setAttribute('tabindex', '0');
    else {
      if (originalTabIndex === null) viewport?.removeAttribute('tabindex');
      else if (originalTabIndex !== undefined) viewport?.setAttribute('tabindex', originalTabIndex);
      if (dialog?.open) dialog.close();
    }
    updateCards();
  }
  function click(event) {
    if (!mobile.matches) return;
    const direction = event.target.closest?.('[data-strength-direction]');
    if (direction && viewport && track) {
      const first = track.querySelector('.strength-card');
      const second = first?.nextElementSibling;
      const distance = second ? second.offsetLeft - first.offsetLeft : viewport.clientWidth * .85;
      viewport.scrollBy({ left: Number(direction.dataset.strengthDirection) * distance,
        behavior: reduced.matches ? 'auto' : 'smooth' });
      return;
    }
    const button = event.target.closest?.('[data-mobile-screen]');
    if (button && dialog && preview) {
      const image = button.parentElement.querySelector('img:not(.merchant-panel)');
      if (!image?.currentSrc || !image.complete || !image.naturalWidth) return;
      invoker = button;
      preview.src = image.currentSrc;
      preview.alt = image.alt;
      preview.width = image.naturalWidth;
      preview.height = image.naturalHeight;
      title.textContent = button.getAttribute('aria-label').replace(' 크게 보기', '');
      const web = image.naturalWidth > image.naturalHeight;
      dialog.classList.toggle('is-web', web);
      dialog.classList.toggle('is-zoomed', web);
      zoom.setAttribute('aria-pressed', String(web));
      zoom.textContent = web ? '전체 보기' : '확대';
      hint.textContent = web ? '좌우로 움직여 화면을 살펴보세요.' : '스크롤하며 화면을 자세히 살펴보세요.';
      root.documentElement.classList.add('mobile-dialog-open');
      dialog.showModal();
      return;
    }
    if (event.target.closest?.('[data-mobile-close]')) dialog?.close();
    if (event.target.closest?.('[data-mobile-zoom]') && dialog?.open) {
      const enlarged = dialog.classList.toggle('is-zoomed');
      zoom.setAttribute('aria-pressed', String(enlarged));
      zoom.textContent = enlarged ? '전체 보기' : '확대';
    }
  }
  function bind(target, event, handler, options) {
    if (!target) return;
    target.addEventListener(event, handler, options);
    cleanups.push(() => target.removeEventListener(event, handler, options));
  }
  function start() {
    if (running) return;
    running = true;
    bind(root, 'click', click);
    bind(viewport, 'scroll', updateCards, { passive: true });
    bind(win, 'resize', refresh, { passive: true });
    bind(mobile, 'change', refresh);
    bind(dialog, 'close', closePreview);
    if (win.ResizeObserver && viewport) {
      observer = new win.ResizeObserver(updateCards);
      observer.observe(viewport);
    }
    refresh();
  }
  function stop() {
    if (!running) return;
    if (dialog?.open) dialog.close();
    closePreview();
    running = false;
    cleanups.splice(0).forEach(cleanup => cleanup());
    observer?.disconnect();
    observer = undefined;
  }
  function dispose() {
    stop();
    closePreview();
    if (originalTabIndex === null) viewport?.removeAttribute('tabindex');
    else if (originalTabIndex !== undefined) viewport?.setAttribute('tabindex', originalTabIndex);
  }
  start();
  return { start, stop, refresh, dispose };
}
