import { mountPreservedHero } from "./hero-preserved.mjs?v=revision-33";
import { createScrollStory } from "./story-scroll.mjs?v=revision-33";
import { createDesktopMotion } from "./desktop-motion.mjs?v=revision-17";

import { createDesktopPolish } from "./desktop-polish.mjs?v=revision-31";
import { createAiPages } from "./ai-pages.mjs?v=revision-33";
import { createStrengths } from "./strengths.mjs?v=revision-29";
import { createScrollStops } from "./scroll-stops.mjs?v=revision-30";

import { createMobileExperience } from "./mobile-experience.mjs?v=revision-33";

const navigationType = performance.getEntriesByType('navigation')[0]?.type;
const aiAnchorIds = new Set(['ai', 'ai-traveler', 'ai-consulting', 'global-vision']);
const aiPositionKey = 'pingdom:ai-anchor-position';
const restoresAiReload = navigationType === 'reload' && aiAnchorIds.has(location.hash.slice(1)) &&
  window.matchMedia('(min-width: 1000px) and (min-height: 701px)').matches;
let reloadAnchorOffset = 0;
if (restoresAiReload) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(aiPositionKey));
    if (saved?.url === location.href && saved.width === innerWidth && saved.height === innerHeight &&
      Number.isFinite(saved.offset)) reloadAnchorOffset = saved.offset;
  } catch { /* 저장소를 사용할 수 없으면 URL의 AI 앵커로 복구합니다. */ }
}

// 모듈 정리 전에 AI 앵커와 읽던 위치의 차이를 저장합니다. 초기 높이로 위치가 잘려도 복원할 수 있습니다.
window.addEventListener('pagehide', () => {
  if (!aiAnchorIds.has(location.hash.slice(1)) ||
    !window.matchMedia('(min-width: 1000px) and (min-height: 701px)').matches) return;
  const destination = document.getElementById(location.hash.slice(1));
  if (!destination) return;
  const header = document.querySelector('.site-header')?.offsetHeight ?? 0;
  try {
    sessionStorage.setItem(aiPositionKey, JSON.stringify({
      url: location.href, width: innerWidth, height: innerHeight,
      offset: header - destination.getBoundingClientRect().top,
    }));
  } catch { /* 브라우저의 저장소 제한은 페이지 이동을 막지 않습니다. */ }
}, { capture: true });

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
mountPreservedHero({ reducedMotion });
const story = createScrollStory();
const desktopStory = createDesktopMotion();
const polish = createDesktopPolish();
const aiPages = createAiPages({ reducedMotion });
const strengths = createStrengths();
const scrollStops = createScrollStops();
const mobileExperience = createMobileExperience({ reducedMotion });

// 직접 링크와 AI 새로고침은 늦은 GPU·이미지 준비로 높이가 바뀌어도 목적지·읽던 위치를 유지합니다.
// 사용자 입력은 보정을 끝내며, 그 밖의 새로고침·히스토리 복원은 브라우저의 위치를 우선합니다.
if (location.hash && (navigationType === 'navigate' || restoresAiReload)) {
  const initialHash = location.hash;
  const intentEvents = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
  let restoreFrame = 0, restoreObserver, restoreTimer, restoreActive = true;
  const finishRestore = () => {
    restoreActive = false;
    if (restoreFrame) cancelAnimationFrame(restoreFrame);
    restoreObserver?.disconnect();
    clearTimeout(restoreTimer);
    intentEvents.forEach(type => window.removeEventListener(type, finishRestore));
    window.removeEventListener('hashchange', finishRestore);
    window.removeEventListener('pagehide', finishRestore);
    window.removeEventListener('load', scheduleRestore);
  };
  const restoreDestination = () => {
    restoreFrame = 0;
    if (!restoreActive || location.hash !== initialHash) return;
    const destination = document.getElementById(initialHash.slice(1));
    if (!destination || (!document.documentElement.classList.contains('desktop-polish') &&
      !window.matchMedia('(max-width: 999px)').matches)) return;
    const header = destination.closest('.site-body') ? document.querySelector('.site-header')?.offsetHeight ?? 0 : 0;
    const target = Math.min(document.documentElement.scrollHeight - innerHeight,
      Math.max(0, scrollY + destination.getBoundingClientRect().top - header + reloadAnchorOffset));
    if (Math.abs(scrollY - target) < 1) return;
    window.dispatchEvent(new Event('pingdom:navigate'));
    window.scrollTo({ top: target, behavior: 'instant' });
  };
  function scheduleRestore() {
    if (restoreActive && !restoreFrame) restoreFrame = requestAnimationFrame(restoreDestination);
  }
  intentEvents.forEach(type => window.addEventListener(type, finishRestore, { once: true, passive: true }));
  window.addEventListener('hashchange', finishRestore, { once: true });
  window.addEventListener('pagehide', finishRestore, { once: true });
  window.addEventListener('load', scheduleRestore);
  if (window.ResizeObserver) {
    restoreObserver = new ResizeObserver(scheduleRestore);
    restoreObserver.observe(document.documentElement);
  }
  document.fonts.ready.then(scheduleRestore);
  restoreTimer = setTimeout(finishRestore, 5000);
  scheduleRestore();
}

window.addEventListener("pagehide", (event) => {
  if (event.persisted) {
    story.stop();
    desktopStory.stop();
    polish.stop();
    aiPages.stop();
    strengths.stop();
    scrollStops.stop();
    mobileExperience.stop();

  } else {
    story.dispose();
    desktopStory.dispose();
    polish.dispose();
    aiPages.dispose();
    strengths.dispose();
    scrollStops.dispose();
    mobileExperience.dispose();

  }
});
window.addEventListener("pageshow", () => {
  story.start();
  story.refresh();
  desktopStory.start();
  desktopStory.refresh();
  polish.start();
  polish.refresh();
  aiPages.start();
  aiPages.refresh();
  strengths.start();
  strengths.refresh();
  scrollStops.start();
  scrollStops.refresh();
  mobileExperience.start();
  mobileExperience.refresh();


});
