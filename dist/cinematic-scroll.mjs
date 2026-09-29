const defaults = Object.freeze({ x: 0, y: 0, s: 1, r: 0, rx: 0, ry: 0, sx: 1, sy: 1, o: 1 });
const properties = Object.keys(defaults);
const ownedStyles = ['transform', 'opacity', 'visibility'];
const clamp = value => Math.max(0, Math.min(1, value));

function prepareKeyframes(keyframes) {
  if (!Array.isArray(keyframes) || !keyframes.length) return null;
  let previous = { ...defaults }, previousAt = -1;
  const result = [];
  for (const frame of keyframes) {
    if (!frame || typeof frame !== 'object' || Array.isArray(frame) ||
        !Number.isFinite(frame.at) || frame.at < 0 || frame.at > 1 || frame.at <= previousAt) return null;
    const next = { ...previous, at: frame.at };
    for (const property of properties) {
      if (!Object.hasOwn(frame, property)) continue;
      if (!Number.isFinite(frame[property])) return null;
      next[property] = frame[property];
    }
    result.push(next);
    previous = next;
    previousAt = frame.at;
  }
  return result;
}

function interpolate(frames, progress) {
  const position = Number.isFinite(progress) ? clamp(progress) : 0;
  let before = frames[0], after = before;
  for (let index = 1; index < frames.length && position > before.at; index++) {
    after = frames[index];
    if (position <= after.at) break;
    before = after;
  }
  const span = after.at - before.at;
  const t = span > 0 ? clamp((position - before.at) / span) : 0;
  const eased = t * t * (3 - 2 * t);
  return Object.fromEntries(properties.map(property => [property,
    t === 0 ? before[property] : t === 1 ? after[property] : before[property] + (after[property] - before[property]) * eased
  ]));
}

export function sampleMotion(keyframes, progress) {
  const prepared = prepareKeyframes(keyframes);
  return prepared ? interpolate(prepared, progress) : null;
}

export function sceneProgress(rect, viewportHeight) {
  if (!rect || !Number.isFinite(rect.top) || !Number.isFinite(rect.height) ||
      !Number.isFinite(viewportHeight) || viewportHeight <= 0) return 0;
  return clamp(-rect.top / Math.max(1, rect.height - viewportHeight));
}

function readKeyframes(element, mobile) {
  const source = mobile && element.hasAttribute('data-motion-mobile')
    ? element.getAttribute('data-motion-mobile') : element.getAttribute('data-motion');
  try { return prepareKeyframes(JSON.parse(source)); }
  catch { return null; }
}

function remember(element) {
  return {
    element,
    inert: Boolean(element.inert),
    styles: Object.fromEntries(ownedStyles.map(property => [property, {
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority?.(property) ?? ''
    }]))
  };
}

function restore(record) {
  for (const property of ownedStyles) {
    const { value, priority } = record.styles[property];
    if (value) record.element.style.setProperty(property, value, priority);
    else record.element.style.removeProperty(property);
  }
  record.element.inert = record.inert;
}

function seekPosition(button) {
  const raw = button.getAttribute('data-seek');
  const position = raw?.trim() ? Number(raw) : NaN;
  return Number.isFinite(position) && position >= 0 && position <= 1 ? position : null;
}

// 문서의 native scroll만 관찰하며 히어로 재생이나 휠·터치 입력은 소유하지 않습니다.
export function createCinematicScroll({ root = document, view = window, reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)'), minWidth = 0 } = {}) {
  const html = root.documentElement;
  const motions = new Map(), controls = new Map(), progressStyles = new Map(), observed = new Set();
  const supported = typeof view.requestAnimationFrame === 'function' && typeof view.cancelAnimationFrame === 'function';
  let scenes = [];
  let frame = 0, destroyed = false, pageHidden = false;
  let needsRefresh = true, forceRender = true;
  let enabled = false;
  const scrollY = () => Number.isFinite(view.scrollY) ? view.scrollY : (view.pageYOffset || 0);
  let lastScrollY = scrollY();
  const resizeObserver = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(() => {
    forceRender = true;
    schedule();
  }) : null;
  // 숨겨진 다음 장면도 진입 전에 디코딩하여 빠른 스크롤에서 빈 기기가 나타나지 않게 합니다.
  const warmedScenes = new WeakSet();
  const imageObserver = typeof view.IntersectionObserver === 'function' ? new view.IntersectionObserver(entries => {
    if (destroyed) return;
    for (const entry of entries) {
      if (!entry.isIntersecting || warmedScenes.has(entry.target)) continue;
      warmedScenes.add(entry.target);
      for (const image of entry.target.querySelectorAll('img')) {
        image.loading = 'eager';
        image.decode?.().catch(() => {});
      }
      imageObserver.unobserve(entry.target);
    }
  }, { rootMargin: '800px 0px' }) : null;

  function restoreControl(button, original) {
    if (original === null) button.removeAttribute('aria-current');
    else button.setAttribute('aria-current', original);
  }

  function restoreProgress(element, original) {
    if (original.value) element.style.setProperty('--scene-progress', original.value, original.priority);
    else element.style.removeProperty('--scene-progress');
  }

  function readTargets() {
    const present = new Set(), presentControls = new Set(), presentScenes = new Set();
    const restoreLater = [];
    const mobile = view.innerWidth <= 700;
    scenes = [...root.querySelectorAll('[data-scene]')].map(element => {
      presentScenes.add(element);
      if (!warmedScenes.has(element)) imageObserver?.observe(element);
      if (!progressStyles.has(element)) progressStyles.set(element, {
        value: element.style.getPropertyValue('--scene-progress'),
        priority: element.style.getPropertyPriority?.('--scene-progress') ?? ''
      });
      const targets = [...element.querySelectorAll('[data-motion]')].filter(target => target.closest('[data-scene]') === element).flatMap(target => {
        present.add(target);
        if (!motions.has(target)) motions.set(target, remember(target));
        const record = motions.get(target);
        const keyframes = readKeyframes(target, mobile);
        if (!keyframes) { restoreLater.push(() => restore(record)); return []; }
        return [{ record, keyframes }];
      });
      const seeks = [...element.querySelectorAll('[data-seek]')].filter(button => button.closest('[data-scene]') === element).flatMap(button => {
        presentControls.add(button);
        if (!controls.has(button)) controls.set(button, button.getAttribute('aria-current'));
        const position = seekPosition(button);
        return position === null ? [] : [{ button, position }];
      });
      return { element, targets, seeks, progress: null };
    });
    for (const [element, record] of motions) {
      if (!present.has(element)) { restoreLater.push(() => restore(record)); motions.delete(element); }
    }
    for (const [button, original] of controls) {
      if (!presentControls.has(button)) { restoreLater.push(() => restoreControl(button, original)); controls.delete(button); }
    }
    for (const [element, original] of progressStyles) {
      if (!presentScenes.has(element)) { restoreLater.push(() => restoreProgress(element, original)); progressStyles.delete(element); }
    }
    if (resizeObserver) {
      for (const element of observed) {
        if (!presentScenes.has(element)) { resizeObserver.unobserve(element); observed.delete(element); }
      }
      for (const element of presentScenes) {
        if (!observed.has(element)) { resizeObserver.observe(element); observed.add(element); }
      }
    }
    needsRefresh = false;
    return restoreLater;
  }

  function cancelFrame() {
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
  }

  function schedule() {
    if (destroyed || !enabled || root.hidden || pageHidden || frame) return;
    frame = view.requestAnimationFrame(render);
  }

  function render() {
    frame = 0;
    if (destroyed || !enabled || root.hidden || pageHidden) return;
    const restored = needsRefresh ? readTargets() : [];
    const width = view.innerWidth, height = view.innerHeight;
    // 모든 장면의 위치를 먼저 읽어 큰 스크롤 점프도 양 끝 상태에 도달시킵니다.
    const measured = scenes.map(scene => ({ scene, progress: sceneProgress(scene.element.getBoundingClientRect(), height) }));
    restored.forEach(restoreOriginal => restoreOriginal());
    for (const { scene, progress } of measured) {
      // 화면 밖의 장면은 진행값이 0 또는 1로 유지되므로 추가 style 쓰기를 하지 않습니다.
      if (!forceRender && scene.progress === progress) continue;
      scene.progress = progress;
      scene.element.style.setProperty('--scene-progress', String(progress));
      for (const { record, keyframes } of scene.targets) {
        const pose = interpolate(keyframes, progress);
        const opacity = clamp(pose.o);
        const hidden = opacity < .01;
        const style = record.element.style;
        style.setProperty('transform', `translate3d(${pose.x * width}px, ${pose.y * height}px, 0) rotate(${pose.r}deg) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) scale(${pose.s * pose.sx}, ${pose.s * pose.sy})`);
        style.setProperty('opacity', String(opacity));
        style.setProperty('visibility', hidden ? 'hidden' : 'visible');
        record.element.inert = hidden || record.inert;
      }
      const nearest = scene.seeks.filter(({ button }) => !button.hasAttribute('data-scene-shortcut')).reduce((best, item) => !best || Math.abs(item.position - progress) < Math.abs(best.position - progress) ? item : best, null);
      for (const { button } of scene.seeks) {
        if (button === nearest?.button) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      }
    }
    forceRender = false;
    lastScrollY = scrollY();
  }

  function refresh() {
    if (destroyed) return;
    needsRefresh = true;
    forceRender = true;
    schedule();
  }

  function syncMotion() {
    if (destroyed) return;
    enabled = supported && !reducedMotion.matches && view.innerWidth >= minWidth;
    html.classList.toggle('cinema-ready', enabled);
    if (!enabled) {
      cancelFrame();
      motions.forEach(restore);
      controls.forEach((original, button) => restoreControl(button, original));
      progressStyles.forEach((original, element) => restoreProgress(element, original));
    } else refresh();
  }

  function onScroll() {
    const position = scrollY();
    if (position === lastScrollY) return;
    lastScrollY = position;
    schedule();
  }
  function onVisibility() {
    if (root.hidden) cancelFrame();
    else refresh();
  }
  function onPageHide() { pageHidden = true; cancelFrame(); }
  function onPageShow() { pageHidden = false; refresh(); }
  function onSeek(event) {
    if (destroyed || event.defaultPrevented) return;
    const button = event.target.closest?.('[data-seek]');
    if (!button || button.disabled) return;
    const scene = button.closest('[data-scene]');
    if (!scenes.some(item => item.element === scene)) return;
    const position = seekPosition(button);
    if (position === null) return;
    const rect = scene.getBoundingClientRect();
    event.preventDefault();
    view.scrollTo({ top: scrollY() + rect.top + position * Math.max(0, rect.height - view.innerHeight), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }

  readTargets().forEach(restoreOriginal => restoreOriginal());
  view.addEventListener('scroll', onScroll, { passive: true });
  view.addEventListener('resize', syncMotion, { passive: true });
  view.addEventListener('pagehide', onPageHide);
  view.addEventListener('pageshow', onPageShow);
  root.addEventListener('visibilitychange', onVisibility);
  root.addEventListener('click', onSeek);
  reducedMotion.addEventListener?.('change', syncMotion);
  root.fonts?.addEventListener?.('loadingdone', refresh);
  if (root.fonts?.ready) Promise.resolve(root.fonts.ready).then(refresh, () => {});
  syncMotion();

  return {
    refresh,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelFrame();
      resizeObserver?.disconnect();
      imageObserver?.disconnect();
      view.removeEventListener('scroll', onScroll);
      view.removeEventListener('resize', syncMotion);
      view.removeEventListener('pagehide', onPageHide);
      view.removeEventListener('pageshow', onPageShow);
      root.removeEventListener('visibilitychange', onVisibility);
      root.removeEventListener('click', onSeek);
      reducedMotion.removeEventListener?.('change', syncMotion);
      root.fonts?.removeEventListener?.('loadingdone', refresh);
      motions.forEach(restore);
      controls.forEach((original, button) => restoreControl(button, original));
      progressStyles.forEach((original, element) => restoreProgress(element, original));
      html.classList.remove('cinema-ready');
      observed.clear();
    }
  };
}
