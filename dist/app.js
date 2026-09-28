'use strict';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const features = [
  { title: '취향이 이끄는<br>새로운 발견.', description: '지금 내 주변, 나에게 맞는 장소.', tags: ['지도 탐색', '맞춤 추천', '다국어'], word: 'FIND.', primary: 'app-discover', secondary: 'app-map', primaryAlt: '핑덤 취향별 장소 추천 화면', secondaryAlt: '핑덤 주변 지도 화면' },
  { title: '가기 전에,<br>확신을 한 겹 더.', description: '영업 정보부터 방문자의 태그까지.', tags: ['장소 정보', '방문자 태그', '신뢰 검증'], word: 'KNOW.', primary: 'app-place', secondary: 'app-reviews', primaryAlt: '핑덤 장소 상세 정보 화면', secondaryAlt: '핑덤 방문자 후기와 태그 화면' },
  { title: '마음에 들었다면,<br>이번에는 직접.', description: '쿠폰을 챙기고, 예약하고, 출발.', tags: ['쿠폰', '예약', '길찾기'], word: 'GO.', primary: 'app-booking', secondary: 'app-coupons', primaryAlt: '핑덤 날짜와 인원 예약 화면', secondaryAlt: '핑덤 쿠폰 관리 화면' },
  { title: '나의 경험이,<br>다음 사람의 확신.', description: '사진과 태그로 남기는 현장의 이야기.', tags: ['사진 기록', '현장 확인', '방문 기록'], word: 'LINK.', primary: 'app-verify', secondary: 'app-profile', primaryAlt: '핑덤 현장 확인 화면', secondaryAlt: '핑덤 사용자 방문 기록 화면' }
];
const tabs = $$('[data-feature]');
function selectFeature(index, focus = false) {
  const feature = features[index];
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
  });
  $('#feature-panel').setAttribute('aria-labelledby', tabs[index].id);
  $('#feature-title').innerHTML = feature.title;
  $('#feature-description').textContent = feature.description;
  $('.feature-number').textContent = '0' + (index + 1);
  $('.feature-word').textContent = feature.word;
  $('#feature-tags').replaceChildren(...feature.tags.map(text => {
    const span = document.createElement('span');
    span.textContent = text;
    return span;
  }));
  $('#feature-screen').src = 'assets/' + feature.primary + '.webp';
  $('#feature-screen').alt = feature.primaryAlt;
  $('#feature-secondary').src = 'assets/' + feature.secondary + '.webp';
  $('#feature-secondary').alt = feature.secondaryAlt;
  if (!reducedMotion.matches) {
    for (const element of [$('.phone-duo'), $('.feature-copy')]) {
      element.getAnimations().forEach(animation => animation.cancel());
      element.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  }
  if (focus) tabs[index].focus();
}
tabs.forEach((tab, index) => tab.addEventListener('click', () => selectFeature(index)));
$('.feature-tabs').addEventListener('keydown', event => {
  const current = tabs.indexOf(document.activeElement);
  if (current < 0) return;
  const next = { ArrowRight: (current + 1) % tabs.length, ArrowLeft: (current + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
  if (next !== undefined) { event.preventDefault(); selectFeature(next, true); }
});
document.documentElement.classList.add('js');
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
  });
}, { threshold: .12 });
$$('.reveal').forEach(element => revealObserver.observe(element));
const hero = $('.hero');
const heroArt = $('.hero-art');
hero.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType !== 'mouse') return;
  const rect = hero.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - .5;
  const y = (event.clientY - rect.top) / rect.height - .5;
  heroArt.style.setProperty('--pointer-x', x * 26 + 'px');
  heroArt.style.setProperty('--pointer-y', y * 20 + 'px');
  heroArt.style.setProperty('--pointer-r', x * 5 + 'deg');
});
hero.addEventListener('pointerleave', () => {
  ['--pointer-x', '--pointer-y', '--pointer-r'].forEach(property => heroArt.style.removeProperty(property));
});
let scrollQueued = false;
function updateParallax() {
  if (!reducedMotion.matches && innerWidth > 700 && scrollY < hero.offsetHeight) {
    heroArt.style.setProperty('--scroll-y', scrollY * .14 + 'px');
  }
  scrollQueued = false;
}
window.addEventListener('scroll', () => {
  if (!scrollQueued) { requestAnimationFrame(updateParallax); scrollQueued = true; }
}, { passive: true });
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    heroArt.removeAttribute('style');
    $$('.reveal').forEach(element => element.classList.add('is-visible'));
    document.getAnimations().forEach(animation => animation.cancel());
  }
});
// Preload only the local images used by the interactive feature preview.
new Set(features.flatMap(feature => [feature.primary, feature.secondary])).forEach(name => {
  const image = new Image();
  image.src = 'assets/' + name + '.webp';
});
