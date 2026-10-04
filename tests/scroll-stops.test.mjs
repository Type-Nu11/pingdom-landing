import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrollStops, firstCrossedStop, SCENE_STOPS } from '../dist/scroll-stops.mjs';

class Target {
  listeners = new Map();
  addEventListener(type, fn) { const set = this.listeners.get(type) ?? new Set(); set.add(fn); this.listeners.set(type, set); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, fields = {}) {
    const event = { type, target: this, cancelable: true, prevented: false, preventDefault() { this.prevented = true; }, ...fields };
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn(event);
    return event;
  }
  count(type) { return this.listeners.get(type)?.size ?? 0; }
}

function fixture({ desktop = true, reduced = false, ai = false, aiReady = true, eventReady = true, flight = false, withModel = false, withGlobe = withModel, flightReady = true, flightVideoReady = false, flightHeight = 3500, initialY = 0, visitCount = 3, strengths = false, strengthsReady = true, global = false, globalReady = true, globalVideoReady = false, globalPrepared = true, globalHeight = 3000 } = {}) {
  let time = 0, id = 0, dialog = false;
  const timers = new Map(), frames = new Map(), writes = [];
  const win = Object.assign(new Target(), { innerHeight: 1000, scrollY: initialY, performance: { now: () => time } });
  const desktopQuery = Object.assign(new Target(), { matches: desktop });
  const reducedQuery = Object.assign(new Target(), { matches: reduced });
  win.matchMedia = query => query.includes('reduced-motion') ? reducedQuery : desktopQuery;
  win.scrollTo = ({ top }) => { win.scrollY = top; writes.push(top); };
  win.setTimeout = (fn, delay) => { timers.set(++id, { fn, at: time + delay }); return id; };
  win.clearTimeout = key => timers.delete(key);
  win.requestAnimationFrame = fn => { frames.set(++id, fn); return id; };
  win.cancelAnimationFrame = key => frames.delete(key);
  const classes = new Set(['desktop-polish-motion', 'desktop-motion-enabled']);
  const html = { dataset: {}, scrollHeight: global ? strengths ? 34000 : 28000 : strengths ? 26000 : 20000, clientWidth: 1400,
    classList: { contains: name => classes.has(name), remove: name => classes.delete(name) } };
  const element = (top, height, names = []) => ({
    dataset: {},
    getBoundingClientRect: () => ({ top: top - win.scrollY, height }),
    classList: { contains: name => names.includes(name), add: name => names.push(name), remove: name => { const index = names.indexOf(name); if (index >= 0) names.splice(index, 1); } },
    querySelector: () => ({ complete: eventReady, naturalWidth: eventReady ? 900 : 0 }),
  });
  const visitHeight = visitCount === 5 ? 5500 : 3000;
  const shift = visitHeight - 3000;
  const strengthsShift = strengths ? 6000 : 0;
  const visit = element(4000, visitHeight);
  visit.querySelectorAll = selector => selector === '[data-visit-product]' && visitCount === 5 ? Array.from({ length: 5 }, () => ({})) : [];
  const elements = new Map([
    ['.site-header', { getBoundingClientRect: () => ({ height: 100 }) }],
    ['.journey-scene', element(1000, 2000)],
    ['.visit-grid', visit],
    ['.platform-scene', element(6500 + shift + strengthsShift, 1400)],
    ['.merchant-section', element(8000 + shift + strengthsShift, 3000)],
  ]);
  if (ai) elements.set('[data-ai-page="traveler"]', element(12000 + shift + strengthsShift, 1550, aiReady ? ['ai-page-prepared'] : ['ai-page-static']));
  if (flight || global) elements.set('[data-ai-page="consulting"]', element(14000 + shift + strengthsShift, global ? 1550 : flightHeight,
    ['ai-page-prepared', ...(!global && flightReady ? ['flight-ready'] : []), ...(!global && flightVideoReady ? ['flight-video-ready'] : [])]));
  if (withGlobe && flight && !global) elements.get('[data-ai-page="consulting"]').dataset.consultingGlobe = '';
  if (withModel && (flight || global)) elements.get('[data-ai-page="consulting"]').dataset.consultingModel = '';
  if (global) {
    const scene = element(15550 + shift + strengthsShift, globalHeight,
      [globalPrepared ? 'ai-page-prepared' : 'ai-page-static', ...(globalReady || globalVideoReady ? ['flight-ready'] : []), ...(globalVideoReady ? ['flight-video-ready'] : [])]);
    scene.dataset.globalVision = '';
    scene.dataset.consultingGlobe = '';
    elements.set('[data-ai-page="global"]', scene);
    elements.set('#global-vision', scene);
  }
  if (strengths) elements.set('.strengths-scene', element(7000 + shift, 5500, strengthsReady ? ['strengths-motion'] : []));
  const root = Object.assign(new Target(), { documentElement: html, hidden: false,
    querySelector: selector => selector === 'dialog[open]' ? dialog : elements.get(selector) });
  let disconnected = 0;
  win.ResizeObserver = class { constructor(fn) { this.fn = fn; } observe() {} disconnect() { disconnected++; } };
  const controller = createScrollStops({ root, win });
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); };
  const advance = ms => { time += ms; for (const [key, timer] of [...timers]) if (timer.at <= time) { timers.delete(key); timer.fn(); } };
  const wheel = delta => win.emit('wheel', { deltaY: delta, deltaX: 0, deltaMode: 0 });
  const setY = y => { win.scrollY = y; win.emit('scroll'); };
  return { win, root, html, controller, flush, advance, wheel, setY, writes, timers, frames, desktopQuery, reducedQuery,
    elements, dialog: value => { dialog = value; }, disconnected: () => disconnected,
    globalY: progress => 15550 + shift + strengthsShift - 280 + (globalHeight - 720) * progress };
}

test('한 번에 여러 장면을 넘기는 입력도 가장 가까운 미소비 정지점 하나를 선택한다', () => {
  const stops = [{ id: 'a', y: 100 }, { id: 'b', y: 200 }];
  assert.equal(firstCrossedStop(0, 1000, stops).id, 'a');
  assert.equal(firstCrossedStop(0, 1000, stops, new Set(['a'])).id, 'b');
  assert.equal(firstCrossedStop(300, 0, stops), null);
  assert.equal(firstCrossedStop(NaN, 1000, stops), null);
});
test('큰 wheel은 완성 지점에서 250ms 정지하고 관성 입력이 정지 시간을 연장하지 않는다', () => {
  const f = fixture();
  assert.equal(f.wheel(15000).prevented, true);
  assert.equal(f.win.scrollY, 1604);
  assert.equal(f.html.dataset.scrollStop, 'journey');
  f.advance(200);
  assert.equal(f.wheel(15000).prevented, true);
  assert.equal(f.win.scrollY, 1604);
  f.advance(50);
  assert.equal(f.html.dataset.scrollStop, undefined);
  f.wheel(15000);
  assert.equal(f.html.dataset.scrollStop, 'place');
  assert.equal(f.win.scrollY, 4068);
});
test('세 앱 화면은 각각 완성 상태에서 정지하고 초과 입력은 재생하지 않는다', () => {
  const f = fixture();
  const expected = [['journey', 1604], ['place', 4068], ['reservation', 4950], ['record', 5790]];
  for (const [name, y] of expected) {
    f.wheel(19000);
    assert.equal(f.html.dataset.scrollStop, name);
    assert.equal(f.win.scrollY, y);
    f.advance(250);
    assert.equal(f.win.scrollY, y);
  }
});
test('다섯 앱 화면은 지정된 순서·완성 진행도에서 각각 250ms 정지한다', () => {
  const spec = SCENE_STOPS.find(scene => scene.visit);
  assert.deepEqual(spec.points, [['place', .06], ['community', .28], ['verification', .50], ['reservation', .72], ['record', .94]]);
  const f = fixture({ visitCount: 5 });
  const expected = [['journey', 1604], ['place', 4176], ['community', 5188], ['verification', 6200], ['reservation', 7212], ['record', 8224]];
  for (const [id, y] of expected) {
    assert.equal(f.wheel(19000).prevented, true);
    assert.equal(f.html.dataset.scrollStop, id);
    assert.ok(Math.abs(f.win.scrollY - y) < 1e-8);
    f.advance(249); f.wheel(19000);
    assert.equal(f.html.dataset.scrollStop, id);
    assert.ok(Math.abs(f.win.scrollY - y) < 1e-8);
    f.advance(1);
    assert.equal(f.html.dataset.scrollStop, undefined);
    assert.equal(f.timers.size, 0);
  }
  f.controller.dispose();
});
test('다섯 앱 지면 이후 플랫폼·상점주·모델·한국·네트워크·지구까지 15개 정지를 한 번씩 유지한다', () => {
  const f = fixture({ visitCount: 5, ai: true, flight: true, withModel: true, flightVideoReady: true });
  const expected = ['journey', 'place', 'community', 'verification', 'reservation', 'record', 'platform', 'merchant-overview', 'merchant-place', 'merchant-event', 'ai-traveler', 'ai-consulting', 'consulting-korea', 'consulting-network', 'consulting-global'];
  for (const [index, id] of expected.entries()) {
    f.wheel(20000);
    assert.equal(f.html.dataset.scrollStop, id);
    assert.equal(f.html.dataset.scrollStopCount, String(index + 1));
    const y = f.win.scrollY;
    f.advance(249); f.wheel(20000);
    assert.equal(f.html.dataset.scrollStop, id);
    assert.equal(f.win.scrollY, y);
    f.advance(1);
    assert.equal(f.html.dataset.scrollStop, undefined);
  }
  assert.equal(f.wheel(20000).prevented, false);
  assert.equal(f.html.dataset.scrollStopCount, '15');
  f.controller.dispose();
});
test('강점 구간의 wheel·키 입력·스크롤바 이동은 취소하거나 정지하지 않는다', () => {
  const f = fixture({ strengths: true, initialY: 6900 });
  for (const y of [6900, 7820, 8372, 8924, 9476, 10028, 10580, 11132]) {
    f.setY(y);
    assert.equal(f.wheel(100).prevented, false);
    assert.equal(f.win.emit('keydown', { key: 'ArrowDown' }).prevented, false);
    assert.equal(f.win.emit('keydown', { key: 'PageDown' }).prevented, false);
    f.win.emit('pointerdown', { clientX: 1390 });
    f.setY(y + 100);
    assert.equal(f.win.scrollY, y + 100);
    assert.equal(f.html.dataset.scrollStop, undefined);
    assert.equal(f.html.dataset.scrollStopCount, undefined);
    assert.equal(f.timers.size, 0);
  }
  assert.equal(f.writes.length, 0);
  f.controller.dispose();
});
test('강점 8개를 한 번에 넘겨도 플랫폼부터 다른 장면의 250ms 정지는 유지한다', () => {
  const f = fixture({ strengths: true, initialY: 6900 });
  assert.equal(f.wheel(5000).prevented, false);
  f.setY(11900);
  assert.equal(f.html.dataset.scrollStop, undefined);
  assert.equal(f.timers.size, 0);
  assert.equal(f.wheel(3000).prevented, true);
  assert.equal(f.html.dataset.scrollStop, 'platform');
  assert.equal(f.html.dataset.scrollStopCount, '1');
  assert.equal(f.win.scrollY, 12710);
  f.advance(249);
  assert.equal(f.wheel(3000).prevented, true);
  assert.equal(f.win.scrollY, 12710);
  f.advance(1);
  assert.equal(f.html.dataset.scrollStop, undefined);
  assert.equal(f.timers.size, 0);
  f.controller.dispose();
});
test('강점 포함 지면도 나머지 15개 장면만 순서대로 한 번씩 정지한다', () => {
  const f = fixture({ visitCount: 5, ai: true, flight: true, withModel: true, flightVideoReady: true, strengths: true });
  const expected = ['journey', 'place', 'community', 'verification', 'reservation', 'record', 'platform',
    'merchant-overview', 'merchant-place', 'merchant-event', 'ai-traveler', 'ai-consulting', 'consulting-korea',
    'consulting-network', 'consulting-global'];
  for (const [index, id] of expected.entries()) {
    f.wheel(26000);
    assert.equal(f.html.dataset.scrollStop, id);
    assert.equal(f.html.dataset.scrollStopCount, String(index + 1));
    f.advance(250);
  }
  assert.equal(f.html.dataset.scrollStopCount, '15');
  assert.equal(f.wheel(26000).prevented, false);
  f.controller.dispose();
});
test('강점의 준비 전환과 역스크롤에서도 정지나 타이머를 등록하지 않는다', () => {
  const f = fixture({ strengths: true, strengthsReady: false, initialY: 6900 });
  const scene = f.elements.get('.strengths-scene');
  for (const ready of [false, true, false, true]) {
    scene.classList[ready ? 'add' : 'remove']('strengths-motion');
    f.controller.refresh(); f.flush();
    f.setY(6900);
    assert.equal(f.wheel(5000).prevented, false);
    f.setY(11900);
    assert.equal(f.wheel(-5000).prevented, false);
    f.setY(6900);
    assert.equal(f.html.dataset.scrollStop, undefined);
    assert.equal(f.timers.size, 0);
  }
  assert.equal(f.writes.length, 0);
  f.controller.dispose();
});
test('취소할 수 없는 강점 wheel 뒤의 네이티브 scroll도 뒤로 보정하지 않는다', () => {
  const f = fixture({ strengths: true, initialY: 6900 });
  const event = f.win.emit('wheel', { deltaY: 5000, deltaX: 0, deltaMode: 0, cancelable: false });
  assert.equal(event.prevented, false);
  f.setY(11900);
  assert.equal(f.win.scrollY, 11900);
  assert.equal(f.html.dataset.scrollStop, undefined);
  assert.equal(f.writes.length, 0);
  assert.equal(f.timers.size, 0);
  f.controller.dispose();
});

test('빠른 연속 입력에서도 모든 13개 애니메이션 구도를 249ms까지 유지하고 250ms에 한 번씩 해제한다', () => {
  const f = fixture({ ai: true, flight: true, withModel: true, flightVideoReady: true });
  const expected = ['journey', 'place', 'reservation', 'record', 'platform', 'merchant-overview',
    'merchant-place', 'merchant-event', 'ai-traveler', 'ai-consulting', 'consulting-korea', 'consulting-network', 'consulting-global'];
  for (const [index, name] of expected.entries()) {
    assert.equal(f.wheel(20000).prevented, true);
    const y = f.win.scrollY;
    assert.equal(f.html.dataset.scrollStop, name);
    assert.equal(f.html.dataset.scrollStopCount, String(index + 1));
    f.advance(200);
    assert.equal(f.wheel(20000).prevented, true);
    f.advance(49);
    assert.equal(f.html.dataset.scrollStop, name);
    assert.equal(f.wheel(20000).prevented, true);
    assert.equal(f.win.scrollY, y);
    assert.equal(f.html.dataset.scrollStopCount, String(index + 1));
    f.advance(1);
    assert.equal(f.html.dataset.scrollStop, undefined);
    assert.equal(f.win.scrollY, y);
    assert.equal(f.timers.size, 0);
  }
  assert.equal(f.wheel(20000).prevented, false);
  assert.equal(f.html.dataset.scrollStopCount, '13');
  f.controller.dispose();
});
test('역방향 wheel은 즉시 풀리고 한 화면보다 조금만 돌아가면 같은 지점에서 반복 정지하지 않는다', () => {
  const f = fixture();
  f.wheel(5000);
  assert.equal(f.wheel(-30).prevented, false);
  assert.equal(f.html.dataset.scrollStop, undefined);
  f.setY(1574);
  assert.equal(f.wheel(50).prevented, false);
});
test('한 화면 이상 되돌아와 다시 보는 장면은 재정지한다', () => {
  const f = fixture();
  f.wheel(5000); f.wheel(-1100); f.setY(504);
  f.wheel(5000);
  assert.equal(f.html.dataset.scrollStop, 'journey');
});
test('wheel의 예상 이동보다 실제 smooth 이동이 크게 진행되어도 scroll 경계가 정지점을 잡는다', () => {
  const f = fixture();
  assert.equal(f.wheel(20).prevented, false);
  f.setY(3000);
  assert.equal(f.win.scrollY, 1604);
});
test('비취소 관성 wheel이 scroll 이벤트보다 먼저 와도 이미 넘어간 장면을 놓치지 않는다', () => {
  const f = fixture();
  f.win.scrollY = 1500;
  f.win.emit('scroll');
  f.win.emit('wheel', { deltaY: 150, deltaX: 0, deltaMode: 0, cancelable: false });
  f.win.scrollY = 1650;
  f.win.emit('wheel', { deltaY: 100, deltaX: 0, deltaMode: 0, cancelable: false });
  f.win.emit('scroll');
  assert.equal(f.win.scrollY, 1604);
  assert.equal(f.html.dataset.scrollStop, 'journey');
});
test('늦은 이미지나 크기 재측정은 진행 중인 250ms 정지 시간을 끊거나 연장하지 않는다', () => {
  const f = fixture(); f.wheel(5000); f.advance(100);
  f.controller.refresh(); f.flush();
  assert.equal(f.html.dataset.scrollStop, 'journey');
  f.advance(149); assert.equal(f.html.dataset.scrollStop, 'journey');
  f.advance(1); assert.equal(f.html.dataset.scrollStop, undefined);
});
test('입력과 scroll 사이의 재측정도 아직 통과하지 못한 정지점 baseline을 유지한다', () => {
  const f = fixture(); f.win.scrollY = 1500; f.win.emit('scroll');
  f.win.emit('wheel', { deltaY: 200, deltaX: 0, deltaMode: 0, cancelable: false });
  f.win.scrollY = 1700; f.controller.refresh(); f.flush(); f.win.emit('scroll');
  assert.equal(f.win.scrollY, 1604);
});
test('AI의 마지막 이미지가 늦게 준비돼도 이미 예약된 refresh 뒤에 정지점을 다시 등록한다', () => {
  const f = fixture({ ai: true, aiReady: false });
  f.controller.refresh();
  f.root.emit('load');
  f.win.requestAnimationFrame(() => {
    const ai = f.elements.get('[data-ai-page="traveler"]');
    ai.classList.remove('ai-page-static'); ai.classList.add('ai-page-prepared');
  });
  f.flush(); f.flush(); f.setY(11000); f.wheel(3000);
  assert.equal(f.html.dataset.scrollStop, 'ai-traveler');
});
test('메뉴 클릭은 이동 전에 정지와 입력 의도를 취소한다', () => {
  const f = fixture(); f.wheel(5000);
  f.root.emit('click', { target: { closest: () => ({ href: '#ai' }) } });
  f.setY(14000);
  assert.equal(f.win.scrollY, 14000);
  assert.equal(f.html.dataset.scrollStop, undefined);
});
test('직접 앵커·히스토리·리로드 보정은 스크롤 정지에 걸리지 않는다', () => {
  for (const event of ['pingdom:navigate', 'hashchange', 'popstate']) {
    const f = fixture(); f.wheel(5000); f.win.emit(event); f.setY(14000);
    assert.equal(f.win.scrollY, 14000);
    assert.equal(f.timers.size, 0);
  }
});
test('열린 원본 보기 dialog의 입력은 가로채지 않고 정지를 해제한다', () => {
  const f = fixture(); f.wheel(5000); f.dialog(true);
  assert.equal(f.wheel(15000).prevented, false);
  assert.equal(f.html.dataset.scrollStop, undefined);
});
test('키보드 End도 가까운 장면에 정지하지만 버튼의 Space 동작은 보존한다', () => {
  const f = fixture();
  assert.equal(f.win.emit('keydown', { key: 'End' }).prevented, true);
  f.advance(250);
  assert.equal(f.win.emit('keydown', { key: ' ', target: { closest: () => ({}) } }).prevented, false);
});
test('모바일·낮은 viewport·동작 줄이기에는 정지하지 않는다', () => {
  for (const options of [{ desktop: false }, { reduced: true }]) {
    const f = fixture(options);
    assert.equal(f.wheel(15000).prevented, false);
    assert.equal(f.writes.length, 0);
  }
  const f = fixture(); f.wheel(5000); f.reducedQuery.matches = true; f.reducedQuery.emit('change'); f.flush();
  assert.equal(f.html.dataset.scrollStop, undefined);
  assert.equal(f.wheel(15000).prevented, false);
});
test('AI는 앞당긴 진입 거리를 반영하며 준비 실패한 지면은 정지 대상에서 제외한다', () => {
  for (const ready of [true, false]) {
    const f = fixture({ ai: true, aiReady: ready });
    f.setY(11000);
    assert.equal(f.wheel(3000).prevented, ready);
    if (ready) { assert.equal(f.html.dataset.scrollStop, 'ai-traveler'); assert.equal(f.win.scrollY, 11985.6); }
  }
});
test('이벤트 이미지가 준비되지 않으면 완성되지 않은 이벤트에서 정지하지 않는다', () => {
  const f = fixture({ eventReady: false }); f.setY(9400);
  assert.equal(f.wheel(5000).prevented, false);
});
test('새 항공 장면은 준비된 사진에서만 전환과 읽기를 포함해 250ms 정지한다', () => {
  for (const ready of [true, false]) {
    const f = fixture({ flight: true, flightReady: ready });
    f.setY(15000);
    assert.equal(f.wheel(5000).prevented, ready);
    if (!ready) continue;
    assert.equal(f.html.dataset.scrollStop, 'consulting-flight');
    assert.ok(Math.abs(f.win.scrollY - 15687.734545454545) < 1e-8);
    f.advance(249);
    assert.equal(f.html.dataset.scrollStop, 'consulting-flight');
    f.advance(1);
    assert.equal(f.html.dataset.scrollStop, undefined);
  }
});
test('450svh 글로벌 영상은 도시와 최종 구도에서 각각 250ms 정지하고 사진 fallback은 최종 정지를 건너뛴다', () => {
  const f = fixture({ flight: true, flightVideoReady: true, flightHeight: 4500 });
  f.setY(16000); f.wheel(10000);
  assert.equal(f.html.dataset.scrollStop, 'consulting-flight');
  assert.ok(Math.abs(f.win.scrollY - 16395.552727272727) < 1e-8);
  f.advance(250); f.wheel(10000);
  assert.equal(f.html.dataset.scrollStop, 'consulting-global');
  assert.ok(Math.abs(f.win.scrollY - 17304.642727272727) < 1e-8);
  f.advance(100); f.controller.refresh(); f.flush();
  f.advance(149); f.wheel(10000);
  assert.equal(f.html.dataset.scrollStop, 'consulting-global');
  f.advance(1);
  assert.equal(f.html.dataset.scrollStop, undefined);
  assert.equal(f.wheel(10000).prevented, false);
  const image = fixture({ flight: true, flightHeight: 4500 });
  image.setY(16800);
  assert.equal(image.wheel(10000).prevented, false);
});
test('글로벌 영상의 늦은 decoded frame과 실패는 두 RAF 뒤 최종 정지를 등록하거나 해제한다', () => {
  const f = fixture({ flight: true, flightReady: false, flightHeight: 4500 });
  const consulting = f.elements.get('[data-ai-page="consulting"]');
  f.setY(17000); f.root.emit('loadeddata');
  f.win.requestAnimationFrame(() => {
    consulting.classList.add('flight-ready'); consulting.classList.add('flight-video-ready');
  });
  f.flush(); f.flush(); f.wheel(1000);
  assert.equal(f.html.dataset.scrollStop, 'consulting-global');
  assert.ok(Math.abs(f.win.scrollY - 17304.642727272727) < 1e-8);
  f.root.emit('error');
  f.win.requestAnimationFrame(() => consulting.classList.remove('flight-video-ready'));
  f.flush(); f.flush();
  assert.equal(f.html.dataset.scrollStop, undefined);
  assert.equal(f.timers.size, 0);
  assert.equal(f.wheel(1000).prevented, false);
  f.controller.dispose();
  assert.equal(f.root.count('loadeddata'), 0);
  assert.equal(f.root.count('error'), 0);
});
test('footer 리로드 뒤 canplay에서 준비된 글로벌 영상은 AI 앵커부터 큰 입력을 반복해도 마지막 정지를 놓치지 않는다', () => {
  const f = fixture({ ai: true, flight: true, flightHeight: 4500, initialY: 19000 });
  const consulting = f.elements.get('[data-ai-page="consulting"]');
  f.root.emit('loadeddata'); f.flush(); f.flush();
  f.win.emit('pingdom:navigate'); f.setY(11000);
  // 첫 프레임 이후의 canplay 복구는 기존 load/loadeddata 알림 없이 준비를 바꿀 수 있습니다.
  consulting.classList.add('flight-video-ready'); f.root.emit('canplay');
  for (const [id, duration] of [['ai-traveler', 250], ['ai-consulting', 250], ['consulting-flight', 250], ['consulting-global', 250]]) {
    assert.equal(f.wheel(12000).prevented, true);
    assert.equal(f.html.dataset.scrollStop, id);
    f.advance(duration);
  }
  assert.equal(f.html.dataset.scrollStopCount, '4');
  assert.ok(Math.abs(f.win.scrollY - 17304.642727272727) < 1e-8);
  f.controller.dispose();
});
test('비취소 관성 입력 뒤 준비 클래스가 바뀌어도 scroll 재측정은 이전 경계를 보존한다', () => {
  const f = fixture({ flight: true, flightHeight: 4500, initialY: 17000 });
  f.win.emit('wheel', { deltaY: 100, deltaX: 0, deltaMode: 0, cancelable: false });
  f.elements.get('[data-ai-page="consulting"]').classList.add('flight-video-ready');
  f.setY(17500);
  assert.equal(f.html.dataset.scrollStop, 'consulting-global');
  assert.ok(Math.abs(f.win.scrollY - 17304.642727272727) < 1e-8);
  f.controller.dispose();
});
test('직접 지구는 큰 입력에도 소개·네트워크 7.18초·최종 11.9초에서 각각 한 번 정지한다', () => {
  const f = fixture({ flight: true, withGlobe: true, flightVideoReady: true, initialY: 14000 });
  const expected = [['ai-consulting', 0.32, 250], ['consulting-network', .40 + .52 * (7.18 / 12), 250], ['consulting-global', .40 + .52 * (11.9 / 12), 250]];
  for (const [id, progress, duration] of expected) {
    assert.equal(f.wheel(12000).prevented, true);
    assert.equal(f.html.dataset.scrollStop, id);
    assert.ok(Math.abs(f.win.scrollY - (13720 + 2780 * progress)) < 1e-8);
    f.advance(duration - 1); f.wheel(12000);
    assert.equal(f.html.dataset.scrollStop, id);
    f.advance(1);
    assert.equal(f.html.dataset.scrollStop, undefined);
  }
  assert.equal(f.html.dataset.scrollStopCount, '3');
  assert.equal(f.wheel(12000).prevented, false);
  f.controller.dispose();
});
test('직접 지구의 최종 poster는 네트워크 정지 없이 완성 구도에 멈추고 미디어 실패는 소개만 남긴다', () => {
  const poster = fixture({ flight: true, withGlobe: true, initialY: 15000 });
  poster.wheel(12000);
  assert.equal(poster.html.dataset.scrollStop, 'consulting-global');
  assert.ok(Math.abs(poster.win.scrollY - (13720 + 2780 * (.40 + .52 * (11.9 / 12)))) < 1e-8);
  poster.controller.dispose();
  const failed = fixture({ flight: true, withGlobe: true, flightReady: false, initialY: 14000 });
  failed.wheel(12000);
  assert.equal(failed.html.dataset.scrollStop, 'ai-consulting');
  failed.advance(250);
  assert.equal(failed.wheel(12000).prevented, false);
  failed.controller.dispose();
});
test('직접 지구의 늦은 canplay와 poster 복구는 입력 직전 정지를 재등록하고 역방향은 즉시 풀린다', () => {
  const f = fixture({ flight: true, withGlobe: true, flightReady: false, initialY: 19000 });
  const consulting = f.elements.get('[data-ai-page="consulting"]');
  f.root.emit('loadeddata'); f.flush(); f.flush();
  f.win.emit('pingdom:navigate'); f.setY(14000);
  consulting.classList.add('flight-ready'); consulting.classList.add('flight-video-ready');
  f.root.emit('canplay');
  f.wheel(12000); f.advance(250); f.wheel(12000);
  assert.equal(f.html.dataset.scrollStop, 'consulting-network');
  f.advance(250);
  // 첫 decode 이후 video가 실패해도 이미 준비된 완성 poster의 최종 읽기는 유지합니다.
  consulting.classList.remove('flight-video-ready');
  f.wheel(12000);
  assert.equal(f.html.dataset.scrollStop, 'consulting-global');
  assert.equal(f.wheel(-40).prevented, false);
  assert.equal(f.html.dataset.scrollStop, undefined);
  f.controller.dispose();
});
test('모델 지구는 모델 소개 뒤 한국 1.2초·네트워크 7.18초·최종 11.9초에서 각각 멈춘다', () => {
  const f = fixture({ flight: true, withModel: true, flightVideoReady: true, initialY: 14000 });
  const expected = [['ai-consulting', .32, 250], ['consulting-korea', .58 + .37 * (1.2 / 12), 250], ['consulting-network', .58 + .37 * (7.18 / 12), 250], ['consulting-global', .58 + .37 * (11.9 / 12), 250]];
  for (const [id, progress, duration] of expected) {
    f.wheel(12000);
    assert.equal(f.html.dataset.scrollStop, id);
    assert.ok(Math.abs(f.win.scrollY - (13720 + 2780 * progress)) < 1e-8);
    f.advance(duration);
  }
  assert.equal(f.html.dataset.scrollStopCount, '4');
  assert.equal(f.html.dataset.scrollStopLast, 'consulting-global');
  assert.equal(f.wheel(12000).prevented, false);
  f.controller.dispose();
});
test('모델 지구는 늦은 준비를 다음 입력 전에 반영하고 poster fallback은 네트워크를 생략한 최종 읽기를 제공한다', () => {
  const f = fixture({ flight: true, withModel: true, flightReady: false, initialY: 15600 });
  const consulting = f.elements.get('[data-ai-page="consulting"]');
  consulting.classList.add('flight-ready'); consulting.classList.add('flight-video-ready');
  f.root.emit('canplay'); f.wheel(12000);
  assert.equal(f.html.dataset.scrollStop, 'consulting-network');
  f.advance(250); consulting.classList.remove('flight-video-ready'); f.wheel(12000);
  assert.equal(f.html.dataset.scrollStop, 'consulting-global');
  assert.ok(Math.abs(f.win.scrollY - (13720 + 2780 * (.58 + .37 * (11.9 / 12)))) < 1e-8);
  assert.equal(f.wheel(-50).prevented, false);
  assert.equal(f.html.dataset.scrollStop, undefined);
  f.controller.dispose();
  const poster = fixture({ flight: true, withModel: true, initialY: 15000 });
  poster.wheel(12000);
  assert.equal(poster.html.dataset.scrollStop, 'consulting-global');
  poster.controller.dispose();
});
test('BFCache stop/start는 타이머와 리스너를 정리하고 현재 위치부터 재개한다', () => {
  const f = fixture(); f.wheel(5000); f.controller.refresh(); f.controller.stop();
  assert.equal(f.timers.size, 0); assert.equal(f.frames.size, 0); assert.equal(f.win.count('wheel'), 0);
  assert.equal(f.win.scrollY, 1604);
  f.win.scrollY = 4500; f.controller.start(); f.controller.start();
  assert.equal(f.win.count('wheel'), 1);
  f.wheel(10000); assert.equal(f.html.dataset.scrollStop, 'reservation');
  f.controller.dispose(); f.controller.start();
  assert.equal(f.win.count('wheel'), 0); assert.ok(f.disconnected() >= 2);
});

const globalStops = [['global-vision', .22], ['global-korea', .42 + .48 * (1.2 / 7.184)],
  ['global-world', .90]];

test('독립 글로벌 stop 계약은 Consulting 다음 소개·한국·완성 네트워크의 세 구도에 대응한다', () => {
  const spec = SCENE_STOPS.find(scene => scene.selector.includes('global'));
  assert.ok(spec);
  assert.equal(spec.ai, true);
  assert.deepEqual(spec.points.map(([id]) => id), globalStops.map(([id]) => id));
  for (const [index, [, progress]] of spec.points.entries()) {
    assert.ok(Math.abs(progress - globalStops[index][1]) < 1e-10);
  }
  const consultingIndex = SCENE_STOPS.findIndex(scene => scene.selector === '[data-ai-page="consulting"]');
  assert.ok(SCENE_STOPS.indexOf(spec) > consultingIndex);
});

test('현재 분리 지면은 강점 카드의 유무와 관계없이 나머지 15개 장면만 정지한다', () => {
  for (const strengths of [false, true]) {
    const f = fixture({ visitCount: 5, ai: true, flight: true, withModel: true,
      global: true, globalVideoReady: true, strengths });
    const expected = ['journey','place','community','verification','reservation','record',
      'platform','merchant-overview','merchant-place','merchant-event','ai-traveler','ai-consulting',
      ...globalStops.map(([id]) => id)];
    assert.equal(expected.length, 15);
    const consulting = f.elements.get('[data-ai-page="consulting"]');
    assert.equal(consulting.classList.contains('flight-ready'), false);
    assert.equal(consulting.classList.contains('flight-video-ready'), false);
    for (const [index, id] of expected.entries()) {
      assert.equal(f.wheel(40000).prevented, true);
      assert.equal(f.html.dataset.scrollStop, id);
      assert.equal(f.html.dataset.scrollStopCount, String(index + 1));
      const point = globalStops.find(([name]) => name === id);
      if (point) assert.ok(Math.abs(f.win.scrollY - f.globalY(point[1])) < 1e-8);
      assert.ok(f.win.scrollY < f.html.scrollHeight - f.win.innerHeight);
      const y = f.win.scrollY;
      f.advance(249); f.wheel(40000);
      assert.equal(f.html.dataset.scrollStop, id);
      assert.equal(f.win.scrollY, y);
      f.advance(1);
      assert.equal(f.html.dataset.scrollStop, undefined);
      assert.equal(f.timers.size, 0);
    }
    assert.equal(f.html.dataset.scrollStopLast, 'global-world');
    assert.equal(f.wheel(40000).prevented, false);
    f.controller.dispose();
  }
});

test('글로벌의 빠른 연속 입력은 3구도에서 각각 정확히 250ms 정지하고 refresh로 시간을 연장하지 않는다', () => {
  const f = fixture({ global: true, globalVideoReady: true, initialY: 15000 });
  for (const [index, [id, progress]] of globalStops.entries()) {
    assert.equal(f.wheel(30000).prevented, true);
    const y = f.globalY(progress);
    assert.equal(f.html.dataset.scrollStop, id);
    assert.ok(Math.abs(f.win.scrollY - y) < 1e-8);
    f.advance(100); f.controller.refresh(); f.flush();
    assert.equal(f.html.dataset.scrollStopCount, String(index + 1));
    f.advance(149);
    assert.equal(f.wheel(30000).prevented, true);
    assert.equal(f.html.dataset.scrollStop, id);
    assert.ok(Math.abs(f.win.scrollY - y) < 1e-8);
    f.advance(1);
    assert.equal(f.html.dataset.scrollStop, undefined);
    assert.equal(f.timers.size, 0);
    assert.ok(Math.abs(f.win.scrollY - y) < 1e-8);
  }
  assert.equal(f.html.dataset.scrollStopCount, '3');
  assert.equal(f.wheel(30000).prevented, false);
  f.controller.dispose();
});

test('글로벌 미디어가 대기해도 Consulting·글로벌 소개는 독립으로 정지하며 poster만 있으면 세계 구도를 제공한다', () => {
  const pending = fixture({ global: true, globalReady: false, initialY: 13000 });
  for (const id of ['ai-consulting','global-vision']) {
    assert.equal(pending.wheel(30000).prevented, true);
    assert.equal(pending.html.dataset.scrollStop, id);
    pending.advance(250);
  }
  assert.equal(pending.wheel(30000).prevented, false);
  pending.controller.dispose();
  const poster = fixture({ global: true, initialY: 15000 });
  for (const id of ['global-vision','global-world']) {
    assert.equal(poster.wheel(30000).prevented, true);
    assert.equal(poster.html.dataset.scrollStop, id);
    if (id === 'global-world') assert.ok(Math.abs(poster.win.scrollY - poster.globalY(globalStops[2][1])) < 1e-8);
    poster.advance(250);
  }
  assert.equal(poster.html.dataset.scrollStopCount, '2');
  assert.equal(poster.wheel(30000).prevented, false);
  poster.controller.dispose();
});

test('글로벌의 늦은 준비는 다음 입력 전에 반영되고 영상 실패·poster 실패는 현재 정지를 해제한다', () => {
  const f = fixture({ global: true, globalReady: false, initialY: 16000 });
  const scene = f.elements.get('[data-ai-page="global"]');
  assert.equal(f.wheel(5000).prevented, false);
  scene.classList.add('flight-ready'); scene.classList.add('flight-video-ready');
  f.root.emit('canplay');
  assert.equal(f.wheel(5000).prevented, true);
  assert.equal(f.html.dataset.scrollStop, 'global-korea');
  assert.ok(Math.abs(f.win.scrollY - f.globalY(globalStops[1][1])) < 1e-8);
  scene.classList.remove('flight-video-ready');
  assert.equal(f.wheel(5000).prevented, true);
  assert.equal(f.html.dataset.scrollStop, 'global-world');
  scene.classList.remove('flight-ready');
  assert.equal(f.wheel(5000).prevented, false);
  assert.equal(f.html.dataset.scrollStop, undefined);
  assert.equal(f.timers.size, 0);
  f.controller.dispose();
});

test('글로벌 역방향은 즉시 정지를 풀고 짧게 돌아왔을 때는 재정지하지 않으며 한 화면 뒤에는 다시 읽힌다', () => {
  const f = fixture({ global: true, globalVideoReady: true, initialY: 15000 });
  f.wheel(30000);
  const y = f.globalY(.22);
  assert.equal(f.html.dataset.scrollStop, 'global-vision');
  assert.equal(f.wheel(-20).prevented, false);
  assert.equal(f.html.dataset.scrollStop, undefined);
  assert.equal(f.timers.size, 0);
  f.setY(y - 50);
  assert.equal(f.wheel(100).prevented, false);
  f.setY(y - 1001);
  assert.equal(f.wheel(30000).prevented, true);
  assert.equal(f.html.dataset.scrollStop, 'global-vision');
  f.controller.dispose();
});

test('글로벌은 reduced-motion·좁은 화면에서 정지하지 않고 실행 중 전환하면 hold와 타이머를 정리한다', () => {
  for (const options of [{ desktop:false }, { reduced:true }]) {
    const f = fixture({ global:true, globalVideoReady:true, initialY:15000, ...options });
    assert.equal(f.wheel(30000).prevented, false);
    assert.equal(f.writes.length, 0);
    f.controller.dispose();
  }
  for (const [query, matches] of [['desktopQuery',false], ['reducedQuery',true]]) {
    const f = fixture({ global:true, globalVideoReady:true, initialY:15000 });
    f.wheel(30000);
    assert.equal(f.html.dataset.scrollStop, 'global-vision');
    f[query].matches = matches; f[query].emit('change'); f.flush();
    assert.equal(f.html.dataset.scrollStop, undefined);
    assert.equal(f.timers.size, 0);
    assert.equal(f.wheel(30000).prevented, false);
    f.controller.dispose();
  }
});

test('글로벌 앵커의 직접 복원은 정지를 우회하고 늦은 canplay 뒤 사용자 입력부터 3구도를 등록한다', () => {
  const f = fixture({ global:true, globalReady:false, initialY:23000 });
  const scene = f.elements.get('[data-ai-page="global"]');
  f.root.emit('loadeddata'); f.flush(); f.flush();
  f.win.emit('pingdom:navigate'); f.setY(15000);
  assert.equal(f.html.dataset.scrollStop, undefined);
  scene.classList.add('flight-ready'); scene.classList.add('flight-video-ready');
  f.root.emit('canplay');
  for (const [id] of globalStops) {
    assert.equal(f.wheel(30000).prevented, true);
    assert.equal(f.html.dataset.scrollStop, id);
    f.advance(250);
  }
  assert.equal(f.html.dataset.scrollStopCount, '3');
  assert.ok(Math.abs(f.win.scrollY - f.globalY(globalStops[2][1])) < 1e-8);
  f.controller.dispose();
  assert.equal(f.root.count('canplay'), 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.timers.size, 0);
});
