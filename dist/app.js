import { createImagePanel, warmImages } from './panel-images.mjs';
import { startHeroIntro } from './hero-intro.mjs?v=perf-2';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const features = [
  { title: '취향이 이끄는<br> 새로운 발견.', description: '지금 내 주변, 나에게 맞는 장소.', tags: ['지도 탐색', '맞춤 추천', '다국어'], primary: 'app-discover', secondary: 'app-map', primaryAlt: '핑덤 취향별 장소 추천 화면', secondaryAlt: '핑덤 주변 지도 화면' },
  { title: '가기 전에,<br> 확신을 한 겹 더.', description: '영업 정보부터 방문자의 태그까지.', tags: ['장소 정보', '방문자 태그', '신뢰 검증'], primary: 'app-place', secondary: 'app-reviews', primaryAlt: '핑덤 장소 상세 정보 화면', secondaryAlt: '핑덤 방문자 후기와 태그 화면' },
  { title: '마음에 들었다면,<br> 이번에는 직접.', description: '쿠폰을 챙기고, 예약하고, 출발.', tags: ['쿠폰', '예약', '길찾기'], primary: 'app-booking', secondary: 'app-coupons', primaryAlt: '핑덤 날짜와 인원 예약 화면', secondaryAlt: '핑덤 쿠폰 관리 화면' },
  { title: '나의 경험이,<br> 다음 사람의 확신.', description: '사진과 태그로 남기는 현장의 이야기.', tags: ['사진 기록', '현장 확인', '방문 기록'], primary: 'app-verify', secondary: 'app-profile', primaryAlt: '핑덤 현장 확인 화면', secondaryAlt: '핑덤 사용자 방문 기록 화면' }
];
const tabs = $$('[data-feature]');
const featureImages = createImagePanel($('#feature-panel'));
function featurePaths(index) {
  return [features[index].primary, features[index].secondary].map(name => 'assets/' + name + '-preview.webp');
}
function warmOnIntent(buttons, paths) {
  buttons.forEach((button, index) => {
    const warm = () => warmImages(paths(index));
    button.addEventListener('pointerenter', warm, { passive: true });
    button.addEventListener('focus', warm);
  });
}
warmOnIntent(tabs, featurePaths);
function selectFeature(index, focus = false) {
  const feature = features[index];
  tabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
  });
  const [primary, secondary] = featurePaths(index);
  featureImages.show([
    { target: $('#feature-screen'), src: primary, alt: feature.primaryAlt },
    { target: $('#feature-secondary'), src: secondary, alt: feature.secondaryAlt }
  ], () => {
    $('#feature-panel').setAttribute('aria-labelledby', tabs[index].id);
    $('#feature-title').innerHTML = feature.title;
    $('#feature-description').textContent = feature.description;
    $('.feature-number').textContent = '0' + (index + 1);
    $('#feature-tags').replaceChildren(...feature.tags.map(text => {
      const span = document.createElement('span');
      span.textContent = text;
      return span;
    }));
    for (const image of [$('#feature-screen'), $('#feature-secondary')]) {
      image.parentElement.dataset.zoom = image.getAttribute('src').replace('-preview.webp', '-source.png');
      image.parentElement.dataset.zoomTitle = image.alt;
      image.parentElement.setAttribute('aria-label', image.alt + ' 확대');
    }
    if (!reducedMotion.matches) {
      for (const element of [$('.phone-duo'), $('.feature-copy')]) {
        element.getAnimations().forEach(animation => animation.cancel());
        element.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }
  });
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
let heroVisible = true;
function syncHeroMotion() {
  const paused = reducedMotion.matches || !heroVisible || document.hidden || document.documentElement.classList.contains('intro-pending');
  hero.classList.toggle('motion-paused', paused);
  if (paused) {
    hero.style.removeProperty('--pointer-x');
    hero.style.removeProperty('--pointer-y');
    heroArt.style.removeProperty('--scroll-y');
  }
}
// 화면 밖에서는 장식 애니메이션을 멈춰 불필요한 렌더링을 줄입니다.
new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; syncHeroMotion(); }).observe(hero);
document.addEventListener('visibilitychange', syncHeroMotion);
reducedMotion.addEventListener('change', syncHeroMotion);
syncHeroMotion();
hero.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType !== 'mouse' || document.documentElement.classList.contains('intro-pending')) return;
  const rect = hero.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - .5;
  const y = (event.clientY - rect.top) / rect.height - .5;
  hero.style.setProperty('--pointer-x', x * 10 + 'px');
  hero.style.setProperty('--pointer-y', y * 8 + 'px');
});
hero.addEventListener('pointerleave', () => {
  ['--pointer-x', '--pointer-y'].forEach(property => hero.style.removeProperty(property));
});
let scrollQueued = false;
function updateParallax() {
  if (!reducedMotion.matches && !document.documentElement.classList.contains('intro-pending') && innerWidth > 700 && scrollY < hero.offsetHeight) {
    heroArt.style.setProperty('--scroll-y', scrollY * .08 + 'px');
  }
  scrollQueued = false;
}
window.addEventListener('scroll', () => {
  if (!scrollQueued) { requestAnimationFrame(updateParallax); scrollQueued = true; }
}, { passive: true });
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    hero.removeAttribute('style');
    heroArt.removeAttribute('style');
    $$('.reveal').forEach(element => element.classList.add('is-visible'));
    document.getAnimations().forEach(animation => animation.cancel());
  }
});

startHeroIntro({ hero, reducedMotion, onComplete: syncHeroMotion });

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
const workspaces = [
  {name:'내 가게의 시작부터,<br>새로운 방문까지.',detail:'매장을 알리고, 혜택을 전하고.<br>로컬의 운영을 한곳에서.',label:'상점주 센터',features:[
    {name:'장소 등록',image:'merchant-register.png',alt:'상점주 신규 장소 등록 화면'},
    {name:'이벤트 관리',image:'merchant-event.png',alt:'상점주 이벤트 관리 화면'},
    {name:'운영 권한',image:'merchant-claim.png',alt:'상점주 운영 장소 신청 화면'}
  ]},
  {name:'정확한 장소 정보,<br>신뢰할 수 있는 운영.',detail:'장소부터 사업자, 데이터 품질까지.<br>서비스의 기준을 지키는 도구.',label:'관리자 콘솔',features:[
    {name:'장소 관리',image:'admin-places.png',alt:'관리자 지도와 장소 목록 화면'},
    {name:'사업자 검증',image:'admin-owners.png',alt:'관리자 사업자 검증 화면'},
    {name:'데이터 품질',image:'admin-quality.png',alt:'관리자 데이터 품질 관리 화면'}
  ]}
];
let workspaceIndex = 0;
const workspaceImages = createImagePanel($('.workspace-browser'));
const workspaceFeatures = $$('[data-workspace-feature]');
function selectWorkspaceFeature(index) {
  const workspace = workspaces[workspaceIndex];
  const feature = workspace.features[index];
  workspaceFeatures.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  workspaceImages.show([{ target: $('#workspace-screen'), src: 'assets/' + feature.image, alt: feature.alt }], () => {
    const screen = $('#workspace-screen');
    screen.parentElement.dataset.zoom = screen.getAttribute('src');
    screen.parentElement.dataset.zoomTitle = feature.alt;
    screen.parentElement.setAttribute('aria-label', feature.alt + ' 확대');
    $('#workspace-browser-label').textContent = workspace.label;
    animatePanel($('.workspace-browser'));
  });
}
workspaceFeatures.forEach((button, index) => button.addEventListener('click', () => selectWorkspaceFeature(index)));
warmOnIntent(workspaceFeatures, index => ['assets/' + workspaces[workspaceIndex].features[index].image]);
warmOnIntent($$('[data-workspace]'), index => ['assets/' + workspaces[index].features[0].image]);
bindTabs('[data-workspace]', '#workspace-panel', index => {
  workspaceIndex = index;
  const workspace = workspaces[index];
  $('#workspace-name').innerHTML = workspace.name;
  $('#workspace-detail').innerHTML = workspace.detail;
  $$('[data-workspace-feature] strong').forEach((label, i) => label.textContent = workspace.features[i].name);
  selectWorkspaceFeature(0);
  animatePanel($('.workspace-copy'));
});
const aiServices = [
  {title:'Pingdom <span>AI</span>',headline:'복잡한 검색 대신,<br>한 번의 대화.'},
  {title:'상권 <span>컨설팅</span>',headline:'감각에 데이터를 더해,<br>다음 결정을 명확하게.'}
];
bindTabs('[data-ai]', '#ai-panel', index => {
  const service=aiServices[index];
  $('#ai-title').innerHTML=service.title;
  $('#ai-headline').innerHTML=service.headline;
  $('#traveler-demo').hidden=index!==0;
  $('#consulting-demo').hidden=index!==1;
  $('#ai').classList.toggle('is-consulting',index===1);
  animatePanel($('#ai-panel'));
});
const questionExamples = [
  {question:'추천한 곳 중, 조용히 쉬어 갈 곳은 어디야?',response:'햇살이 머무는 카페에서 잠시 쉬어 가요.',insight:'원하는 분위기부터 주변 위치까지, 한 번에 좁혀보세요.'},
  {question:'이 중에서 든든한 한 끼를 즐기고 싶어.',response:'골목 속 작은 식당을 살펴보세요.',insight:'위치와 영업 여부를 함께 물어보면, 방문할 곳을 고르기 쉬워져요.'},
  {question:'조금 더 색다른 공간도 경험해보고 싶어.',response:'팝업과 전시에서 새로운 하루를 만나보세요.',insight:'취향과 일정을 말해주면, 새로운 장소를 만나는 기준이 생겨요.'}
];
function selectExamplePlace(index, scroll=false) {
  const cards=$$('[data-place]');
  cards.forEach((card,i)=>card.setAttribute('aria-pressed',String(i===index)));
  $('#place-insight').textContent=questionExamples[index].insight;
  if(scroll && innerWidth<=700) {
    const strip=$('.place-results');
    strip.scrollTo({left:cards[index].offsetLeft-cards[0].offsetLeft,behavior:reducedMotion.matches?'instant':'smooth'});
  }
}
$$('[data-place]').forEach((button,index)=>button.addEventListener('click',()=>selectExamplePlace(index)));
$$('[data-question]').forEach((button,index)=>button.addEventListener('click',()=>{
  $$('[data-question]').forEach((item,i)=>item.setAttribute('aria-pressed',String(i===index)));
  $('#ai-question-text').textContent=questionExamples[index].question;
  $('#ai-response-intro').textContent=questionExamples[index].response;
  selectExamplePlace(index,true);
  animatePanel($('.ai-question'));
  animatePanel($('.ai-response'));
}));
const people = [
  {key:'woosung',name:'김우성',role:'PM · Server Lead · Web',description:'핑덤을 직접 기획하고,<br> 서비스의 방향과 개발을 이끕니다.',work:[['기획','서비스 기획 · 프로젝트 진행'],['서버','서버 개발 총괄'],['웹','상점주 웹 개발']]},
  {key:'ilgang',photo:'presentation-yongin.png',name:'김일강',role:'Client Lead · App',description:'클라이언트 개발을 총괄하며,<br> 앱의 경험을 구현합니다.',work:[['총괄','클라이언트 개발 총괄'],['앱','모바일 앱 개발'],['협업','팀원과 기능 문제 해결']]},
  {key:'sungmin',name:'우성민',role:'Design Lead · App',description:'핑덤의 UX/UI를 설계하고,<br> 앱 개발을 함께 담당합니다.',work:[['디자인','서비스 UX/UI 디자인 총괄'],['앱','모바일 앱 개발']]},
  {key:'taewoo',name:'김태우',role:'Client · Web (Admin)',description:'관리자 웹을 개발해,<br> 서비스 운영을 위한 화면을 만듭니다.',work:[['웹','관리자 웹 개발'],['운영','관리 기능의 웹 화면 구현']]},
  {key:'sunghyuk',name:'조성혁',role:'Server',description:'기획한 기능을 서버에서 구현하고,<br> 개발 과정의 문제를 해결합니다.',work:[['서버','서비스 서버 기능 개발'],['구현','기능 구현과 문제 해결']]},
  {key:'yongin',photo:'presentation-ilgang.png',name:'이용인',role:'Server · Infrastructure',description:'서버 개발과 AWS 인프라를 맡아,<br> 서비스의 기반을 다집니다.',work:[['서버','서비스 서버 개발'],['인프라','AWS 인프라 구축 · 운영']]},
  {key:'junhyuk',name:'장준혁',role:'MCP · Network',description:'MCP와 네트워크를 연결하고,<br> 서비스 트래픽의 흐름을 다룹니다.',work:[['MCP','MCP 서버 개발'],['네트워크','로드 밸런서 도입'],['운영','트래픽 제어']]}
];
const personImages = createImagePanel($('#person-panel'));
const personPath = index => 'assets/' + (people[index].photo || 'presentation-' + people[index].key + '.png');
warmOnIntent($$('[data-person]'), index => [personPath(index)]);
// 작은 프로필 사진만 팀 영역에 가까워졌을 때 준비합니다.
const personWarmup = new IntersectionObserver(entries => {
  if (!entries.some(entry => entry.isIntersecting)) return;
  warmImages(people.map((_, index) => personPath(index)));
  personWarmup.disconnect();
}, { rootMargin: '240px' });
personWarmup.observe($('#person-panel'));
bindTabs('[data-person]', '#person-panel', index => {
  const person = people[index];
  personImages.show([{ target: $('#person-photo'), src: personPath(index), alt: '발표자료의 ' + person.name + ' 프로필' }], () => {
    $('#person-counter').textContent = '0'+(index+1)+' / 07';
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
});
const screenDialog = $('#screen-dialog');
const dialogImages = createImagePanel($('.dialog-image'));
let zoomTrigger;
document.addEventListener('click', event => {
  const button=event.target.closest('[data-zoom]');
  if (!button) return;
  zoomTrigger=button;
  $('#dialog-title').textContent=button.dataset.zoomTitle;
  $('.dialog-image').classList.remove('is-zoomed');
  $('.dialog-image').classList.toggle('is-phone', button.closest('.phone-duo') !== null);
  $('#zoom-toggle').setAttribute('aria-pressed','false');
  $('#zoom-toggle').textContent='원본 크기';
  document.body.classList.add('dialog-open');
  $('#zoom-toggle').disabled = true;
  screenDialog.showModal();
  dialogImages.show([{ target: $('#dialog-screen'), src: button.dataset.zoom, alt: button.dataset.zoomTitle }], () => {
    $('#zoom-toggle').disabled = false;
  });
});
$('#dialog-close').addEventListener('click', () => screenDialog.close());
screenDialog.addEventListener('click', event => {if(event.target===screenDialog)screenDialog.close();});
screenDialog.addEventListener('close', () => {
  dialogImages.cancel();
  document.body.classList.remove('dialog-open');
  zoomTrigger?.focus();
});
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
