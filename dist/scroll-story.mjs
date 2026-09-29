const clamp = value => Math.max(0, Math.min(1, value));

// 본문만 담당합니다. 스크롤 위치는 바꾸지 않고, 움직임이 있을 때만 한 프레임을 요청합니다.
export function createScrollStory({ root = document, view = window, reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)') } = {}) {
  const html = root.documentElement;
  const reveals = [...root.querySelectorAll('[data-reveal]')];
  const scenes = [...root.querySelectorAll('[data-scroll-story]')];
  const media = [...root.querySelectorAll('[data-scroll-media]')];
  const targets = [...scenes, ...media];
  const sceneSteps = new Map(scenes.map(scene => [scene, [...scene.querySelectorAll('[data-story-step]')]]));
  const active = new Set();
  const dirty = new Set();
  const pending = new Set(reveals);
  const supported = typeof view.IntersectionObserver === 'function';
  let frame = 0;
  let measureAll = true;
  let destroyed = false;
  let revealObserver;
  let progressObserver;

  function reveal(element, immediate = false) {
    if (immediate) element.style.setProperty('--reveal-delay', '0ms');
    element.classList.add('is-revealed');
    pending.delete(element);
    revealObserver?.unobserve(element);
  }

  function render() {
    frame = 0;
    if (destroyed || root.hidden || reducedMotion.matches) return;
    const height = view.innerHeight;
    const pinned = view.innerWidth > 1000 && height > 650;
    const measured = [...(measureAll ? targets : new Set([...active, ...dirty]))]
      .map(element => ({ element, rect: element.getBoundingClientRect() }));
    // 복원·해시 이동·빠른 스크롤로 지나친 요소도 비어 있는 채로 남지 않게 합니다.
    const past = measureAll ? [...pending].filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.height > 0 && rect.top < height * .88;
    }) : [];
    measureAll = false;
    dirty.clear();
    for (const { element, rect } of measured) {
      if (!rect.height) continue;
      if (sceneSteps.has(element)) {
        const progress = pinned ? clamp(-rect.top / Math.max(1, rect.height - height)) : 1;
        element.style.setProperty('--story-progress', progress.toFixed(4));
        sceneSteps.get(element).forEach((step, index) => {
          const phase = pinned ? clamp((progress - (.03 + index * .29)) / .25) : 1;
          step.style.setProperty('--step-progress', phase.toFixed(4));
        });
      } else {
        element.style.setProperty('--media-progress', clamp((height * .94 - rect.top) / (height * .74)).toFixed(4));
      }
    }
    past.forEach(element => reveal(element, element.getBoundingClientRect().bottom <= 0));
  }

  function schedule() {
    if (destroyed || root.hidden || reducedMotion.matches || !supported || frame) return;
    if (!measureAll && !active.size && !dirty.size) return;
    frame = view.requestAnimationFrame(render);
  }

  function refresh() {
    measureAll = true;
    schedule();
  }

  function cancelFrame() {
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
  }

  function syncMotion() {
    if (destroyed) return;
    const enabled = supported && !reducedMotion.matches;
    html.classList.toggle('scroll-motion-ready', enabled);
    if (!enabled) {
      cancelFrame();
      reveals.forEach(element => reveal(element, true));
    } else refresh();
  }

  function onVisibility() {
    if (root.hidden) cancelFrame();
    else refresh();
  }

  function onFocus(event) {
    // 탭 이동으로 도달한 버튼은 등장 지연을 기다리지 않고 즉시 보입니다.
    for (let element = event.target; element && element !== root; element = element.parentElement) {
      if (element.matches?.('[data-reveal]')) reveal(element, true);
    }
  }

  if (supported) {
    revealObserver = new view.IntersectionObserver(entries => {
      if (destroyed) return;
      entries.forEach(entry => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    progressObserver = new view.IntersectionObserver(entries => {
      if (destroyed) return;
      entries.forEach(entry => {
        if (entry.isIntersecting) active.add(entry.target);
        else active.delete(entry.target);
        dirty.add(entry.target);
      });
      schedule();
    }, { rootMargin: '10% 0px', threshold: 0 });
    reveals.forEach(element => revealObserver.observe(element));
    targets.forEach(element => progressObserver.observe(element));
  }

  view.addEventListener('scroll', schedule, { passive: true });
  view.addEventListener('resize', refresh, { passive: true });
  view.addEventListener('pageshow', refresh);
  view.addEventListener('hashchange', refresh);
  view.addEventListener('pagehide', cancelFrame);
  root.addEventListener('visibilitychange', onVisibility);
  root.addEventListener('focusin', onFocus);
  reducedMotion.addEventListener('change', syncMotion);
  syncMotion();

  return {
    refresh,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelFrame();
      revealObserver?.disconnect();
      progressObserver?.disconnect();
      view.removeEventListener('scroll', schedule);
      view.removeEventListener('resize', refresh);
      view.removeEventListener('pageshow', refresh);
      view.removeEventListener('hashchange', refresh);
      view.removeEventListener('pagehide', cancelFrame);
      root.removeEventListener('visibilitychange', onVisibility);
      root.removeEventListener('focusin', onFocus);
      reducedMotion.removeEventListener('change', syncMotion);
      html.classList.remove('scroll-motion-ready');
      active.clear();
      dirty.clear();
    }
  };
}
