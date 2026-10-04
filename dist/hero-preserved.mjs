import { startHeroIntro } from "./hero-intro.mjs?v=traffic-gold-1";
import { createRingFlow } from "./ring-flow.mjs?v=revision-7";
import { createHeroBackground } from "./hero-background.mjs?v=traffic-1";

export function mountPreservedHero({
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)"),
} = {}) {
  const hero = document.querySelector(".hero");
  if (!hero) return { dispose() {} };

  const root = document.documentElement;
  const mobile = window.matchMedia("(max-width: 999px)");
  const ringFlow = createRingFlow({ hero, reducedMotion });
  const background = createHeroBackground({ hero, reducedMotion });
  let active = true;
  let disposed = false;
  let visible = false;

  function sync() {
    if (disposed) return;
    const introPending = root.classList.contains("intro-pending");
    const paused = !active || !visible || document.hidden || introPending;
    hero.classList.toggle("motion-paused", paused || reducedMotion.matches);
    // 동작 줄이기 설정에서도 하프톤의 정지 상태는 한 번 그립니다.
    // 모바일은 선명한 원본 로고를 표시하고 보이지 않는 GPU 장면을 실행하지 않습니다.
    ringFlow.setPaused(paused || mobile.matches);
    background.sync({
      visible: active && visible,
      introPending: active && introPending,
    });
  }

  function finishIntro() {
    if (root.classList.contains("intro-pending")) {
      window.dispatchEvent(new Event("pingdom:intro-finish"));
    }
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });

  function onMotionChange() {
    if (reducedMotion.matches) finishIntro();
    sync();
  }

  function onPageShow() {
    if (disposed) return;
    active = true;
    // BFCache 복귀 시 다음 Observer 알림을 기다리지 않고 현재 위치에서 재개합니다.
    const bounds = hero.getBoundingClientRect();
    visible =
      bounds.bottom > 0 &&
      bounds.top < window.innerHeight &&
      bounds.right > 0 &&
      bounds.left < window.innerWidth;
    sync();
  }

  function onPageHide(event) {
    if (!event.persisted) {
      dispose();
      return;
    }
    // BFCache에서는 GPU와 영상을 멈추고 복귀 가능한 컨트롤러를 유지합니다.
    active = false;
    finishIntro();
    sync();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    active = false;
    observer.disconnect();
    document.removeEventListener("visibilitychange", sync);
    reducedMotion.removeEventListener("change", onMotionChange);
    mobile.removeEventListener("change", sync);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("pagehide", onPageHide);
    finishIntro();
    ringFlow.dispose();
    background.dispose();
    hero.classList.remove("motion-paused");
  }

  observer.observe(hero);
  document.addEventListener("visibilitychange", sync);
  reducedMotion.addEventListener("change", onMotionChange);
  mobile.addEventListener("change", sync);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("pagehide", onPageHide);
  sync();
  startHeroIntro({ hero, reducedMotion, onComplete: sync });

  // 영구 제거는 호출 측의 dispose()로 수행하며 BFCache에서는 재개 상태를 유지합니다.
  return { dispose };
}
