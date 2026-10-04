// 스크롤을 새 장면으로 옮기지 않고, 이미 완성된 구도를 한 번 읽을 시간만 제공합니다.
export const SCENE_STOPS = [
  { selector: '.journey-scene', points: [['journey', .64]] },
  { selector: '.visit-grid', points: [['place', .06], ['community', .28], ['verification', .50], ['reservation', .72], ['record', .94]],
    legacyPoints: [['place', .08], ['reservation', .50], ['record', .90]], visit: true },
  { selector: '.platform-scene', points: [['platform', .62]] },
  { selector: '.merchant-section', points: [['merchant-overview', .20], ['merchant-place', .50], ['merchant-event', .86]] },
  { selector: '[data-ai-page="traveler"]', points: [['ai-traveler', .32]], ai: true },
  // 22초 영상의 도시 완성(7.6s)과 네트워크 완성(21.9s)을 웹의 .58~.95 구간에 맞춥니다.
  { selector: '[data-ai-page="consulting"]', points: [['ai-consulting', .32], ['consulting-flight', .58 + .37 * (7.6 / 22)], ['consulting-global', .58 + .37 * (21.9 / 22)]],
    // 직접 지구 영상의 연결선 완성(7.18s)과 최종 구도(11.9s)는 .40~.92 구간에 대응합니다.
    globePoints: [['ai-consulting', .32], ['consulting-network', .40 + .52 * (7.18 / 12)], ['consulting-global', .40 + .52 * (11.9 / 12)]],
    modelGlobePoints: [['ai-consulting', .32], ['consulting-korea', .58 + .37 * (1.2 / 12)],
      ['consulting-network', .58 + .37 * (7.18 / 12)], ['consulting-global', .58 + .37 * (11.9 / 12)]], ai: true },
  { selector: '[data-ai-page="global"]', points: [['global-vision', .22], ['global-korea', .42 + .48 * (1.2 / 7.184)],
    ['global-world', .90]], ai: true },
];

export function firstCrossedStop(from, to, stops, visited = new Set()) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
  return stops.find(stop => !visited.has(stop.id) && stop.y >= from - 1 && stop.y <= to) ?? null;
}

export function createScrollStops({ root = document, win = window, holdMs = 250 } = {}) {
  const desktop = win.matchMedia('(min-width: 1000px) and (min-height: 701px)');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = SCENE_STOPS.map(spec => ({ ...spec, element: root.querySelector(spec.selector) })).filter(scene => scene.element);
  const visited = new Set();
  const cleanups = [];
  const aiReadiness = scene => ['ai-page-prepared', 'ai-page-static', 'flight-ready', 'flight-video-ready']
    .map(name => Number(scene.element.classList.contains(name))).join('');
  let running = false, disposed = false, enabled = false, stops = [], lastY = win.scrollY, stopCount = 0;
  let hold = null, holdTimer = 0, refreshFrame = 0, assetFrame = 0, observer, intentUntil = -Infinity;
  const now = () => win.performance.now();

  function release() {
    if (holdTimer) win.clearTimeout(holdTimer);
    holdTimer = 0;
    hold = null;
    delete root.documentElement.dataset.scrollStop;
  }
  function navigate() {
    release();
    intentUntil = -Infinity;
    lastY = win.scrollY;
  }
  function setPosition(y) {
    lastY = y;
    win.scrollTo({ top: y, behavior: 'instant' });
  }
  function pauseAt(stop) {
    visited.add(stop.id);
    hold = stop;
    root.documentElement.dataset.scrollStop = stop.id;
    root.documentElement.dataset.scrollStopLast = stop.id;
    root.documentElement.dataset.scrollStopCount = String(++stopCount);
    setPosition(stop.y);
    // 관성 입력으로 시간을 연장하거나 입력을 쌓지 않아, 정지 해제 후에도 화면이 튀지 않습니다.
    holdTimer = win.setTimeout(release, holdMs);
  }
  function rearm(y) {
    // 조금 되돌렸을 때는 반복 정지하지 않고, 한 화면 이상 돌아와 다시 보는 경우에만 재정지합니다.
    for (const stop of stops) if (y < stop.y - win.innerHeight) visited.delete(stop.id);
  }
  function excluded(target) {
    return !!root.querySelector('dialog[open]') || !!target?.closest?.('dialog, input, textarea, select, [contenteditable="true"]');
  }
  function refreshReadiness() {
    // 뒤늦게 바뀐 미디어 준비 상태도 다음 입력 전에 정지 목록에 반영합니다.
    if (scenes.some(scene => scene.ai && scene.readiness !== aiReadiness(scene))) refresh();
  }
  function input(delta, event) {
    if (!enabled || !running || root.hidden || excluded(event.target) || !Number.isFinite(delta) || !delta) {
      if (excluded(event.target)) navigate();
      return;
    }
    intentUntil = now() + 400;
    refreshReadiness();
    rearm(win.scrollY);
    if (delta < 0) {
      release();
      lastY = win.scrollY;
      return;
    }
    if (hold) {
      event.preventDefault();
      setPosition(hold.y);
      return;
    }
    const stop = firstCrossedStop(win.scrollY, win.scrollY + delta, stops, visited);
    if (stop && event.cancelable) {
      event.preventDefault();
      pauseAt(stop);
    }
  }
  function wheel(event) {
    if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? win.innerHeight : 1;
    input(event.deltaY * unit, event);
  }
  function keydown(event) {
    if (event.key === 'Escape') { navigate(); return; }
    if (event.ctrlKey || event.metaKey || event.altKey || excluded(event.target) ||
      event.target?.closest?.('button, a, summary, [role="button"]')) return;
    const page = win.innerHeight * .9;
    const deltas = { ArrowDown: 40, ArrowUp: -40, PageDown: page, PageUp: -page,
      ' ': event.shiftKey ? -page : page, End: root.documentElement.scrollHeight - win.scrollY,
      Home: -win.scrollY };
    input(deltas[event.key], event);
  }
  function scroll() {
    if (!enabled || !running || root.hidden || excluded() || now() > intentUntil && !hold) {
      lastY = win.scrollY;
      return;
    }
    refreshReadiness();
    const y = win.scrollY;
    if (hold) {
      if (y < hold.y - 1) release();
      else if (Math.abs(y - hold.y) > 1) { setPosition(hold.y); return; }
    } else {
      rearm(y);
      const stop = firstCrossedStop(lastY, y, stops, visited);
      if (stop) { pauseAt(stop); return; }
    }
    lastY = y;
  }
  function pointerdown(event) {
    navigate();
    // 스크롤바를 끌 때도 같은 정지를 적용하며, 일반 링크 조작은 정상적으로 진행합니다.
    if (event.clientX >= root.documentElement.clientWidth - 18) intentUntil = now() + 400;
  }
  function pointermove(event) {
    if (event.buttons && event.clientX >= root.documentElement.clientWidth - 18) intentUntil = now() + 400;
  }
  function click(event) {
    if (event.target?.closest?.('a[href], [data-ai-dialog-open]')) navigate();
  }
  function refresh() {
    refreshFrame = 0;
    if (!running) return;
    const activeHold = hold;
    if (!hold && now() > intentUntil) lastY = win.scrollY;
    enabled = desktop.matches && !reduced.matches;
    stops = [];
    if (!enabled) { navigate(); return; }
    const header = root.querySelector('.site-header')?.getBoundingClientRect().height ?? 72;
    const viewport = Math.max(1, win.innerHeight - header);
    const maximum = Math.max(0, root.documentElement.scrollHeight - win.innerHeight);
    for (const scene of scenes) {
      if (scene.ai) scene.readiness = aiReadiness(scene);
      if (scene.ai ? !scene.element.classList.contains('ai-page-prepared') || scene.element.classList.contains('ai-page-static') :
        !root.documentElement.classList.contains(scene.visit ? 'desktop-motion-enabled' : 'desktop-polish-motion')) continue;
      const rect = scene.element.getBoundingClientRect();
      const entry = scene.ai ? viewport * .2 : 0;
      const top = rect.top + win.scrollY - header - entry;
      const distance = Math.max(1, rect.height - viewport + entry);
      const globe = scene.globePoints && 'consultingGlobe' in (scene.element.dataset ?? {});
      const legacyVisit = scene.visit && !(scene.element.querySelectorAll?.('[data-visit-product]')?.length);
      const points = legacyVisit ? scene.legacyPoints : globe ? 'consultingModel' in scene.element.dataset ? scene.modelGlobePoints : scene.globePoints : scene.points;
      for (const [id, progress] of points) {
        // 항공 사진이 준비되지 않은 경우에는 기존 소개만 읽고 정상적으로 지나갑니다.
        if (id === 'consulting-flight' && !scene.element.classList.contains('flight-ready')) continue;
        if ((id === 'consulting-korea' || id === 'consulting-network' || id === 'global-korea') && !scene.element.classList.contains('flight-video-ready')) continue;
        if (id === 'global-world' && !scene.element.classList.contains('flight-ready')) continue;
        if (id === 'consulting-global' && !scene.element.classList.contains(globe ? 'flight-ready' : 'flight-video-ready')) continue;
        const eventImage = id === 'merchant-event' ? scene.element.querySelector('[data-merchant-screen="1"] img') : null;
        if (id === 'merchant-event' && (!eventImage?.complete || !eventImage.naturalWidth)) continue;
        stops.push({ id, y: Math.min(maximum, Math.max(0, top + distance * progress)) });
      }
    }
    stops.sort((a, b) => a.y - b.y);
    if (activeHold) {
      const refreshed = stops.find(stop => stop.id === activeHold.id);
      if (refreshed) { hold = refreshed; setPosition(refreshed.y); }
      else release();
    }
  }
  function scheduleRefresh() {
    if (running && !refreshFrame) refreshFrame = win.requestAnimationFrame(refresh);
  }
  function assetLoaded() {
    // 자체 load 핸들러가 예약한 AI 준비 갱신 뒤, 다음 프레임에서 확실히 재측정합니다.
    if (!running || assetFrame) return;
    assetFrame = win.requestAnimationFrame(() => {
      assetFrame = 0;
      if (refreshFrame) win.cancelAnimationFrame(refreshFrame);
      refreshFrame = 0;
      scheduleRefresh();
    });
  }
  function bind(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    cleanups.push(() => target.removeEventListener(type, listener, options));
  }
  function start() {
    if (running || disposed) return;
    running = true;
    bind(win, 'wheel', wheel, { passive: false, capture: true });
    bind(win, 'keydown', keydown, { capture: true });
    bind(win, 'scroll', scroll, { passive: true });
    bind(win, 'pointerdown', pointerdown, { passive: true, capture: true });
    bind(win, 'pointermove', pointermove, { passive: true });
    bind(root, 'click', click, { capture: true });
    for (const type of ['pingdom:navigate', 'hashchange', 'popstate']) bind(win, type, navigate);
    for (const type of ['resize', 'load']) bind(win, type, scheduleRefresh, { passive: true });
    for (const query of [desktop, reduced]) bind(query, 'change', scheduleRefresh);
    for (const type of ['load', 'loadeddata', 'error']) bind(root, type, assetLoaded, { capture: true });
    bind(root, 'visibilitychange', navigate);
    root.fonts?.ready.then(scheduleRefresh);
    if (win.ResizeObserver) {
      observer = new win.ResizeObserver(scheduleRefresh);
      observer.observe(root.documentElement);
    }
    refresh();
  }
  function stop() {
    running = false;
    navigate();
    if (refreshFrame) win.cancelAnimationFrame(refreshFrame);
    if (assetFrame) win.cancelAnimationFrame(assetFrame);
    refreshFrame = assetFrame = 0;
    observer?.disconnect();
    cleanups.splice(0).forEach(cleanup => cleanup());
  }
  function dispose() {
    stop(); disposed = true; visited.clear(); stops = [];
    delete root.documentElement.dataset.scrollStopLast;
    delete root.documentElement.dataset.scrollStopCount;
  }
  start();
  return { start, stop, refresh: scheduleRefresh, dispose };
}
