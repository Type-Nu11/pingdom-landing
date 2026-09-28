'use strict';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const features = [
  { title: '취향이 이끄는<br> 새로운 발견.', description: '지금 내 주변, 나에게 맞는 장소.', tags: ['지도 탐색', '맞춤 추천', '다국어'], word: 'FIND.', primary: 'app-discover', secondary: 'app-map', primaryAlt: '핑덤 취향별 장소 추천 화면', secondaryAlt: '핑덤 주변 지도 화면' },
  { title: '가기 전에,<br> 확신을 한 겹 더.', description: '영업 정보부터 방문자의 태그까지.', tags: ['장소 정보', '방문자 태그', '신뢰 검증'], word: 'KNOW.', primary: 'app-place', secondary: 'app-reviews', primaryAlt: '핑덤 장소 상세 정보 화면', secondaryAlt: '핑덤 방문자 후기와 태그 화면' },
  { title: '마음에 들었다면,<br> 이번에는 직접.', description: '쿠폰을 챙기고, 예약하고, 출발.', tags: ['쿠폰', '예약', '길찾기'], word: 'GO.', primary: 'app-booking', secondary: 'app-coupons', primaryAlt: '핑덤 날짜와 인원 예약 화면', secondaryAlt: '핑덤 쿠폰 관리 화면' },
  { title: '나의 경험이,<br> 다음 사람의 확신.', description: '사진과 태그로 남기는 현장의 이야기.', tags: ['사진 기록', '현장 확인', '방문 기록'], word: 'LINK.', primary: 'app-verify', secondary: 'app-profile', primaryAlt: '핑덤 현장 확인 화면', secondaryAlt: '핑덤 사용자 방문 기록 화면' }
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

function animatePanel(element) {
  if (reducedMotion.matches) return;
  element.getAnimations().forEach(animation => animation.cancel());
  element.animate([{opacity:0,transform:'translateY(15px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
}
function bindTabs(selector, panelSelector, render) {
  const buttons = $$(selector);
  function activate(index, focus = false) {
    buttons.forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; });
    $(panelSelector).setAttribute('aria-labelledby', buttons[index].id);
    render(index);
    if (focus) buttons[index].focus();
  }
  buttons.forEach((button, i) => button.addEventListener('click', () => activate(i)));
  buttons[0].parentElement.addEventListener('keydown', event => {
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    const next = {ArrowRight:(current+1)%buttons.length,ArrowDown:(current+1)%buttons.length,ArrowLeft:(current+buttons.length-1)%buttons.length,ArrowUp:(current+buttons.length-1)%buttons.length,Home:0,End:buttons.length-1}[event.key];
    if (next !== undefined) { event.preventDefault(); activate(next, true); }
  });
}
const verificationStages = [
  {en:'CLAIMED',name:'상점주 제공',description:'매장을 가장 잘 아는 상점주가<br> 영업시간, 메뉴, 혜택을 제공합니다.'},
  {en:'VISITOR VERIFIED',name:'방문자 확인',description:'직접 방문한 사용자가 사진과 태그로<br> 현장의 정보를 확인합니다.'},
  {en:'PINGDOM VERIFIED',name:'핑덤 검증',description:'방문자 확인과 이용 기록을 종합해<br> 신뢰도 높은 정보를 구분합니다.'}
];
bindTabs('[data-verify]', '#verification-panel', index => {
  const stage = verificationStages[index];
  $('#verification-en').textContent = stage.en;
  $('#verification-name').textContent = stage.name;
  $('#verification-description').innerHTML = stage.description;
  $('#verification-count').textContent = '0'+(index+1)+' / 03';
  animatePanel($('#verification-panel'));
});
const workspaces = [
  {image:'web-merchant',name:'내 가게를 관리하는 한 곳.',detail:'매장 정보 · 쿠폰 · 예약',alt:'상점주 매장 관리 화면'},
  {image:'web-admin',name:'믿을 수 있는 서비스를 뒷받침합니다.',detail:'장소 · 사업자 · 신고 관리',alt:'핑덤 관리자 대시보드'}
];
bindTabs('[data-workspace]', '#workspace-panel', index => {
  const workspace = workspaces[index];
  $('#workspace-name').textContent = workspace.name;
  $('#workspace-detail').textContent = workspace.detail;
  $('#workspace-screen').src = 'assets/'+workspace.image+'.webp';
  $('#workspace-screen').alt = workspace.alt;
  const button = $('#workspace-screen').parentElement;
  button.dataset.zoom = $('#workspace-screen').getAttribute('src');
  button.dataset.zoomTitle = workspace.alt;
  button.setAttribute('aria-label',workspace.alt+' 확대');
  animatePanel($('#workspace-panel'));
});
const travelerDemo = $('#ai-demo').innerHTML;
const consultingDemo = '<span class="example-label">실제 컨설팅 화면</span><div class="ai-consulting"><button class="workspace-screen" data-zoom="assets/web-report.webp" data-zoom-title="AI 컨설팅 상담 정보 확인 화면" aria-label="AI 컨설팅 화면 확대"><img src="assets/web-report.webp" alt="업종, 위치, 고객층과 운영 조건을 확인하는 컨설팅 화면" width="1200" height="645"><span class="zoom-label">화면 확대 <span aria-hidden="true">↗</span></span></button><h4>내 가게의 조건에서 시작합니다.</h4><p>업종, 입지, 고객층을 바탕으로<br> 상권 분석과 보고서를 연결합니다.</p></div>';
bindTabs('[data-ai]', '#ai-panel', index => {
  $('#ai-headline').innerHTML = index === 0 ? '찾고 싶은 곳을,<br> 말하는 대로.' : '상권의 가능성을,<br> 데이터로.';
  $('#ai-description').innerHTML = index === 0 ? '위치, 평점, 영업 여부.<br> 여러 조건을 한 번의 질문으로.' : '가게의 조건을 입력하고,<br> 운영의 다음 결정을 준비하세요.';
  $('#ai-demo').innerHTML = index === 0 ? travelerDemo : consultingDemo;
  animatePanel($('#ai-panel'));
});
const people = [
  {key:'woosung',name:'김우성',role:'PM · Server Lead · Web',description:'핑덤을 직접 기획하고,<br> 서비스의 방향과 개발을 이끕니다.',work:[['기획','서비스 기획 · 프로젝트 진행'],['서버','서버 개발 총괄'],['웹','상점주 웹 개발']]},
  {key:'ilgang',name:'김일강',role:'Client Lead · App',description:'클라이언트 개발을 총괄하며,<br> 앱의 경험을 구현합니다.',work:[['총괄','클라이언트 개발 총괄'],['앱','모바일 앱 개발'],['협업','팀원과 기능 문제 해결']]},
  {key:'sungmin',name:'우성민',role:'Design Lead · App',description:'핑덤의 UX/UI를 설계하고,<br> 앱 개발을 함께 담당합니다.',work:[['디자인','서비스 UX/UI 디자인 총괄'],['앱','모바일 앱 개발']]},
  {key:'taewoo',name:'김태우',role:'Client · Web (Admin)',description:'관리자 웹을 개발해,<br> 서비스 운영을 위한 화면을 만듭니다.',work:[['웹','관리자 웹 개발'],['운영','관리 기능의 웹 화면 구현']]},
  {key:'sunghyuk',name:'조성혁',role:'Server',description:'기획한 기능을 서버에서 구현하고,<br> 개발 과정의 문제를 해결합니다.',work:[['서버','서비스 서버 기능 개발'],['구현','기능 구현과 문제 해결']]},
  {key:'yongin',name:'이용인',role:'Server · Infrastructure',description:'서버 개발과 AWS 인프라를 맡아,<br> 서비스의 기반을 다집니다.',work:[['서버','서비스 서버 개발'],['인프라','AWS 인프라 구축 · 운영']]},
  {key:'junhyuk',name:'장준혁',role:'MCP · Network',description:'MCP와 네트워크를 연결하고,<br> 서비스 트래픽의 흐름을 다룹니다.',work:[['MCP','MCP 서버 개발'],['네트워크','로드 밸런서 도입'],['운영','트래픽 제어']]}
];
bindTabs('[data-person]', '#person-panel', index => {
  const person = people[index];
  $('#person-photo').src = 'assets/presentation-'+person.key+'.png';
  $('#person-photo').alt = '발표자료의 '+person.name+' 프로필';
  $('#person-role').textContent = person.role;
  $('#person-name').textContent = person.name;
  $('#person-description').innerHTML = person.description;
  $('#person-work').replaceChildren(...person.work.map(([area,description]) => {
    const item=document.createElement('li');
    const label=document.createElement('span');label.textContent=area;
    item.append(label,document.createTextNode(description));return item;
  }));
  animatePanel($('#person-panel'));
});
const screenDialog = $('#screen-dialog');
let zoomTrigger;
document.addEventListener('click', event => {
  const button=event.target.closest('[data-zoom]');
  if (!button) return;
  zoomTrigger=button;
  $('#dialog-screen').src=button.dataset.zoom;
  $('#dialog-screen').alt=button.dataset.zoomTitle;
  $('#dialog-title').textContent=button.dataset.zoomTitle;
  $('.dialog-image').classList.remove('is-zoomed');
  $('#zoom-toggle').setAttribute('aria-pressed','false');
  $('#zoom-toggle').textContent='원본 크기';
  document.body.classList.add('dialog-open');
  screenDialog.showModal();
});
$('#dialog-close').addEventListener('click', () => screenDialog.close());
screenDialog.addEventListener('click', event => {if(event.target===screenDialog)screenDialog.close();});
screenDialog.addEventListener('close', () => {document.body.classList.remove('dialog-open');zoomTrigger?.focus();});
$('#zoom-toggle').addEventListener('click', () => {
  const zoomed=$('.dialog-image').classList.toggle('is-zoomed');
  $('#zoom-toggle').setAttribute('aria-pressed',String(zoomed));
  $('#zoom-toggle').textContent=zoomed?'화면 맞춤':'원본 크기';
});

// Keep the selected person's details in view after a touch selection.
$$('[data-person]').forEach(button => button.addEventListener('click', () => {
  if (window.matchMedia('(max-width: 700px)').matches) {
    $('#person-panel').scrollIntoView({behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start'});
  }
}));
