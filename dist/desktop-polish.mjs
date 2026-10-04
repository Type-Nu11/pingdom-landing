import { clamp, ease, mix, phase } from './story-scroll.mjs?v=rebuild-1';
import { sequenceState } from './desktop-motion.mjs?v=revision-17';

export function entryState(progress) {
  const amount = ease(clamp(progress));
  const body = ease(phase(progress, .15, 1));
  return { opacity: amount, y: mix(74, 0, amount), cut: mix(100, 0, amount), bodyY: mix(26, 0, body), bodyOpacity: body };
}
export function journeyPolishState(progress) {
  const photo = ease(phase(progress, .1, .48));
  const phone = ease(phase(progress, .24, .58));
  const copy = ease(phase(progress, .37, .61));
  const width = mix(1, .37, photo), height = mix(1, .74, photo);
  // 사진의 프레임과 내부 영상은 반대 비율로 보간해 인물이 눌리지 않게 합니다.
  return { photoX: mix(0, .04, photo), photoY: mix(0, .12, photo), width, height,
    innerX: Math.max(width, height) / width, innerY: Math.max(width, height) / height, radius: mix(0, 20, photo),
    phoneX: mix(100, 0, phone), phoneY: mix(170, 0, phone), phoneRY: mix(-30, 0, phone), phoneRZ: mix(7, 0, phone), phoneScale: mix(.82, 1, phone), phoneOpacity: ease(phase(progress, .23, .4)),
    copyOpacity: copy, copyX: mix(50, 0, copy), copyY: mix(42, 0, copy) };
}
export function webEntranceState(progress) {
  const amount = ease(clamp(progress));
  return { x: 0, y: mix(16, 0, amount), rx: mix(2.5, 0, amount), ry: 0, rz: 0, scale: mix(.985, 1, amount), opacity: 1 };
}
export function merchantDesktopState(progress) {
  const p = clamp(progress);
  const settle = ease(phase(p, 0, .18));
  const introCopy = 1 - ease(phase(p, .20, .30));
  const registerEnter = ease(phase(p, .26, .36));
  const registerExit = ease(phase(p, .54, .66));
  const registerCopy = registerEnter * (1 - registerExit);
  const eventCopy = ease(phase(p, .60, .72));
  // 뒤로 기울어진 화면이 가까워지며 정면에 정착한 뒤, 설명과 내부 화면만 교체합니다.
  return { x: 0, y: mix(.16, 0, settle), z: mix(-.16, 0, settle), rx: mix(18, 0, settle), ry: mix(-12, 0, settle), rz: mix(-2, 0, settle), scale: mix(.94, 1, settle),
    cameraScale: 1, cameraX: 0, cameraY: 0, eventOpacity: eventCopy,
    introCopyOpacity: introCopy, registerCopyOpacity: registerCopy, eventCopyOpacity: eventCopy,
    introCopyY: mix(0, -.34, ease(phase(p, .18, .30))),
    registerCopyY: mix(.34, 0, ease(phase(p, .26, .42))) - .34 * registerExit,
    eventCopyY: mix(.34, 0, ease(phase(p, .60, .76))),
    activeCopy: p < .26 ? 0 : p < .64 ? 1 : 2 };
}
export function platformCardsState(progress) {
  const p = clamp(progress);
  const unfold = ease(phase(p, 0, .44));
  const settle = ease(phase(p, .1, .5));
  // 하나의 파노라마 안에서 경계가 넓어집니다. 사진을 카드처럼 띄우거나 숨기지 않습니다.
  return { prologueOpacity: 0, prologueY: 0, prologueScale: 1, headingOpacity: 1, headingY: 0,
    cards: [0, 1, 2].map(index => {
      const width = mix([.72, .18, .1][index], 1 / 3, unfold);
      return { width, opacity: 1, y: 0, ry: 0, cut: 0, photoScale: mix(1.08, 1, settle), photoX: mix([0, -2, 2][index], 0, settle), photoY: 0,
        copyOpacity: ease(phase(p, .39 + index * .025, .54 + index * .025)) };
    }) };
}
export function createDesktopPolish({ root = document, win = window } = {}) {
  const desktop = win.matchMedia('(min-width: 1000px) and (min-height: 701px)');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const journey = root.querySelector('.journey-scene');
  const visit = root.querySelector('.visit-grid');
  const visitProducts = [...(visit?.querySelectorAll?.('[data-visit-product]') ?? [])];
  const visitCopies = [...(visit?.querySelectorAll?.('[data-visit-copy]') ?? [])];
  const visitCount = visitProducts.length || 3;
  const merchant = root.querySelector('.merchant-section');
  const merchantDesktop = root.querySelector('.merchant-desktop');
  const merchantScreens = [...root.querySelectorAll('[data-merchant-screen]')];
  const merchantCopies = [...root.querySelectorAll('[data-merchant-copy]')];
  const oldMerchant = [...root.querySelectorAll('.merchant-section > .merchant-copy, .merchant-section > .merchant-product')].map(element => ({ element, inert: element.inert }));
  const platform = root.querySelector('.platform-scene');
  const board = root.querySelector('.platform-triptych');
  const oldBoard = root.querySelector('.platform-board');
  const oldCurtain = root.querySelector('.platform-curtain');
  const copies = visitCopies.length ? [...visitCopies, ...root.querySelectorAll('.merchant-beat')]
    : [...root.querySelectorAll('.visit-grid .card-copy, .merchant-beat')];
  const cards = [...root.querySelectorAll('[data-platform-card]')];
  const assets = [...root.querySelectorAll('[data-desktop-hq]')].map(element => {
    const source = element.tagName === 'SOURCE';
    const attribute = source ? 'srcset' : 'src';
    const image = source ? element.closest('picture')?.querySelector('img') : element;
    const eagerImage = element.closest(source ? '.visit-grid, .merchant-section' : '.visit-grid') ? image : null;
    return { element, attribute, image, original: element.getAttribute(attribute), eagerImage, failed: false };
  });
  const pictureLoading = new Map(assets.filter(asset => asset.eagerImage).map(asset => [asset.eagerImage, asset.eagerImage.getAttribute('loading')]));
  const originalLabel = platform?.getAttribute('aria-labelledby');
  const originalMerchantLabel = merchant?.getAttribute('aria-labelledby');
  const initialStyle = new Map();
  const listeners = [];
  let running = false, enabled = false, motion = false, frame = 0, resizeFrame = 0, observer;
  let nav = 72, viewport = 828, geometry = {}, copyGeometry = [];

  function set(element, values) {
    if (!element) return;
    if (!initialStyle.has(element)) initialStyle.set(element, new Map());
    const originals = initialStyle.get(element);
    for (const [property, value] of Object.entries(values)) {
      if (!originals.has(property)) originals.set(property, element.style.getPropertyValue(property));
      element.style.setProperty(property, String(value));
    }
  }
  function restoreStyles() {
    for (const [element, properties] of initialStyle) for (const [property, value] of properties) {
      if (value) element.style.setProperty(property, value); else element.style.removeProperty(property);
    }
    initialStyle.clear();
  }
  function bounds(element) {
    if (!element) return { top: 0, height: 1, width: win.innerWidth };
    const b = element.getBoundingClientRect();
    return { top: b.top + win.scrollY, height: b.height, width: b.width };
  }
  function paint() {
    frame = 0;
    if (!running || !motion || root.hidden) return;
    const y = win.scrollY;
    if (journey) {
      const p = clamp((y - geometry.journey.top + nav) / Math.max(1, geometry.journey.height - viewport));
      const state = journeyPolishState(p);
      journey.dataset.polishProgress = p.toFixed(4);
      set(journey, { '--polish-photo-x': state.photoX * win.innerWidth + 'px', '--polish-photo-y': state.photoY * viewport + 'px', '--polish-photo-w': state.width, '--polish-photo-h': state.height, '--polish-photo-inner-x': state.innerX, '--polish-photo-inner-y': state.innerY, '--polish-photo-radius': state.radius + 'px', '--polish-phone-x': state.phoneX + 'px', '--polish-phone-y': state.phoneY + 'px', '--polish-phone-ry': state.phoneRY + 'deg', '--polish-phone-rz': state.phoneRZ + 'deg', '--polish-phone-scale': state.phoneScale, '--polish-phone-opacity': state.phoneOpacity, '--polish-journey-copy': state.copyOpacity, '--polish-journey-copy-x': state.copyX + 'px', '--polish-journey-copy-y': state.copyY + 'px' });
    }
    for (const { element, top, height } of copyGeometry) {
      const p = phase(y, top - win.innerHeight * .94, top + height * .2 - win.innerHeight * .48);
      const pose = entryState(p);
      set(element, { '--polish-copy-opacity': pose.opacity, '--polish-copy-y': pose.y + 'px', '--polish-copy-cut': pose.cut + '%', '--polish-body-y': pose.bodyY + 'px', '--polish-body-opacity': pose.bodyOpacity });
    }
    if (visit) {
      const p = phase(y, geometry.visit.top - viewport * .82, geometry.visit.top - nav);
      const enter = ease(p);
      const weights = sequenceState(Number(visit.dataset.desktopProgress ?? 0), visitCount);
      const turn = 1 - Math.max(...weights);
      set(visit, { '--polish-visit-x': mix(90, 0, enter) + 'px', '--polish-visit-y': mix(100, 0, enter) + 'px', '--polish-visit-ry': mix(-28, 0, enter) + turn * 9 + 'deg', '--polish-visit-rz': mix(6, 0, enter) + 'deg', '--polish-visit-scale': mix(.85, 1, enter), '--polish-visit-opacity': ease(phase(p, 0, .6)) });
    }
    if (merchant) {
      if (merchantDesktop) {
        const p = clamp((y - geometry.merchant.top + nav) / Math.max(1, geometry.merchant.height - viewport));
        const eventImage = merchantScreens[1]?.querySelector('img');
        const ready = Boolean(eventImage?.complete && eventImage.naturalWidth > 0);
        // 늦은 이벤트 자산 때문에 빈 장면으로 가지 않고 등록 패널의 읽기 상태를 유지합니다.
        const state = merchantDesktopState(ready ? p : Math.min(p, .50));
        const eventOpacity = state.eventOpacity;
        merchant.dataset.polishProgress = p.toFixed(4);
        merchant.dataset.merchantSettled = String(p >= .18);
        set(merchantDesktop, { '--merchant-web-x': state.x * win.innerWidth + 'px', '--merchant-web-y': state.y * viewport + 'px', '--merchant-web-z': state.z * win.innerWidth + 'px', '--merchant-web-rx': state.rx + 'deg', '--merchant-web-ry': state.ry + 'deg', '--merchant-web-rz': state.rz + 'deg', '--merchant-web-scale': state.scale,
          '--merchant-camera-scale': state.cameraScale, '--merchant-camera-x': state.cameraX + '%', '--merchant-camera-y': state.cameraY + '%',
          '--merchant-screen-blend': eventOpacity, '--merchant-intro-copy': state.introCopyOpacity, '--merchant-register-copy': state.registerCopyOpacity, '--merchant-event-copy': state.eventCopyOpacity,
          '--merchant-intro-copy-y': state.introCopyY * viewport + 'px', '--merchant-register-copy-y': state.registerCopyY * viewport + 'px', '--merchant-event-copy-y': state.eventCopyY * viewport + 'px' });
        merchantScreens.forEach((screen, index) => screen.setAttribute('aria-hidden', String(index === 0 ? eventOpacity >= .5 : eventOpacity < .5)));
        merchantCopies.forEach((copy, index) => copy.setAttribute('aria-hidden', String(index !== state.activeCopy)));
      } else {
        const pose = webEntranceState(phase(y, geometry.web.top - viewport * .95, geometry.web.top - nav + viewport * .12));
        set(merchant, { '--polish-web-x': pose.x + 'px', '--polish-web-y': pose.y + 'px', '--polish-web-rx': pose.rx + 'deg', '--polish-web-ry': pose.ry + 'deg', '--polish-web-rz': pose.rz + 'deg', '--polish-web-scale': pose.scale, '--polish-web-opacity': pose.opacity });
      }
    }
    if (platform && board) {
      const p = clamp((y - geometry.platform.top + nav) / Math.max(1, geometry.platform.height - viewport));
      const state = platformCardsState(p);
      platform.dataset.polishProgress = p.toFixed(4);
      set(board, { '--platform-heading-opacity': state.headingOpacity, '--platform-heading-y': state.headingY + 'px',
        '--platform-col-0': state.cards[0].width + 'fr', '--platform-col-1': state.cards[1].width + 'fr', '--platform-col-2': state.cards[2].width + 'fr' });
      cards.forEach((card, index) => {
        const pose = state.cards[index];
        set(card, { '--platform-card-opacity': pose.opacity, '--platform-card-y': pose.y + 'px', '--platform-card-ry': pose.ry + 'deg', '--platform-card-cut': pose.cut + '%', '--platform-photo-scale': pose.photoScale, '--platform-photo-x': pose.photoX + '%', '--platform-photo-y': pose.photoY + '%', '--platform-copy-opacity': pose.copyOpacity });
      });
    }
  }
  function schedule() { if (running && motion && !frame && !root.hidden) frame = win.requestAnimationFrame(paint); }
  function clear() {
    restoreStyles();
    root.documentElement.classList.remove('desktop-polish', 'desktop-polish-motion');
    for (const [image, original] of pictureLoading) { if (original === null) image.removeAttribute('loading'); else image.setAttribute('loading', original); }
    for (const { element, attribute, original } of assets) { if (original === null) element.removeAttribute(attribute); else element.setAttribute(attribute, original); if (element.dataset.polishLayer) element.parentElement.classList.remove('polish-layer-ready'); }
    if (oldBoard) oldBoard.inert = false;
    if (oldCurtain) oldCurtain.inert = false;
    if (platform) { platform.setAttribute('aria-labelledby', originalLabel); delete platform.dataset.polishProgress; }
    if (journey) delete journey.dataset.polishProgress;
    if (merchant) {
      delete merchant.dataset.polishProgress;
      delete merchant.dataset.merchantSettled;
      if (originalMerchantLabel === null) merchant.removeAttribute('aria-labelledby');
      else if (originalMerchantLabel !== undefined) merchant.setAttribute('aria-labelledby', originalMerchantLabel);
    }
    merchantDesktop?.setAttribute('aria-hidden', 'true');
    oldMerchant.forEach(({ element, inert }) => { element.inert = inert; });
    merchantScreens.forEach((screen, index) => screen.setAttribute('aria-hidden', String(index > 0)));
    merchantCopies.forEach((copy, index) => copy.setAttribute('aria-hidden', String(index !== 1)));
  }
  function refresh() {
    resizeFrame = 0;
    if (!running) return;
    const next = desktop.matches;
    if (!next) { if (enabled) clear(); enabled = motion = false; return; }
    enabled = true; motion = !reduced.matches;
    root.documentElement.classList.add('desktop-polish');
    root.documentElement.classList.toggle('desktop-polish-motion', motion);
    // 빠른 입력에서도 다음 제품 본체가 비어 있지 않도록 PC 제품 이미지를 먼저 로드합니다.
    for (const image of pictureLoading.keys()) image.setAttribute('loading', 'eager');
    for (const { element, attribute, failed } of assets) {
      if (!failed && element.getAttribute(attribute) !== element.dataset.desktopHq) element.setAttribute(attribute, element.dataset.desktopHq);
      if (element.dataset.polishLayer) element.parentElement.classList.toggle('polish-layer-ready', !failed && element.complete && element.naturalWidth > 0);
    }
    if (oldBoard) oldBoard.inert = true;
    if (oldCurtain) oldCurtain.inert = true;
    platform?.setAttribute('aria-labelledby', 'platform-desktop-title');
    if (merchantDesktop) {
      merchant?.setAttribute('aria-labelledby', 'merchant-v2-title');
      merchantDesktop.setAttribute('aria-hidden', 'false');
      oldMerchant.forEach(({ element }) => { element.inert = true; });
    }
    nav = root.querySelector('.site-header')?.getBoundingClientRect().height ?? 72;
    viewport = win.innerHeight - nav;
    // 재측정에는 앞 프레임의 시각적 이동량이 문서 위치에 섞이지 않아야 합니다.
    restoreStyles();
    geometry = { journey: bounds(journey), visit: bounds(visit), merchant: bounds(merchant), web: bounds(root.querySelector('.merchant-register-copy')), platform: bounds(platform) };
    copyGeometry = copies.map(element => ({ element, ...bounds(element) }));
    if (!motion) {
      restoreStyles();
      merchantScreens.forEach((screen, index) => screen.setAttribute('aria-hidden', String(index > 0)));
      merchantCopies.forEach((copy, index) => copy.setAttribute('aria-hidden', String(index !== 1)));
    }
    paint();
  }
  function scheduleRefresh() { if (running && !resizeFrame) resizeFrame = win.requestAnimationFrame(refresh); }
  function bind(target, type, listener, options) { target.addEventListener(type, listener, options); listeners.push(() => target.removeEventListener(type, listener, options)); }
  function start() {
    if (running) return; running = true;
    bind(win, 'scroll', schedule, { passive: true });
    bind(win, 'hashchange', scheduleRefresh); bind(win, 'popstate', scheduleRefresh);
    bind(win, 'pingdom:navigate', scheduleRefresh);
    bind(win, 'resize', scheduleRefresh, { passive: true }); bind(win, 'load', scheduleRefresh);
    bind(root, 'visibilitychange', () => { if (root.hidden && frame) { win.cancelAnimationFrame(frame); frame = 0; } else scheduleRefresh(); });
    for (const query of [desktop, reduced]) bind(query, 'change', scheduleRefresh);
    for (const asset of assets) {
      const { element, attribute, original, image } = asset;
      bind(image ?? element, 'load', scheduleRefresh);
      const fallback = () => { asset.failed = true; if (original) element.setAttribute(attribute, original); else element.removeAttribute(attribute); if (element.dataset.polishLayer) element.parentElement.classList.remove('polish-layer-ready'); };
      bind(image ?? element, 'error', fallback);
    }
    root.fonts?.ready.then(() => { if (running) scheduleRefresh(); });
    if (win.ResizeObserver) { observer = new win.ResizeObserver(scheduleRefresh); observer.observe(root.documentElement); }
    refresh();
  }
  function stop() {
    running = false;
    if (frame) win.cancelAnimationFrame(frame); if (resizeFrame) win.cancelAnimationFrame(resizeFrame);
    frame = resizeFrame = 0;
    observer?.disconnect(); listeners.splice(0).forEach(cleanup => cleanup());
  }
  function dispose() { stop(); clear(); enabled = motion = false; }
  start();
  return { start, stop, refresh: scheduleRefresh, dispose };
}
