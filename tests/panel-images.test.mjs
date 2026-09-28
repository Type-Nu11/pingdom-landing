import test from 'node:test';
import assert from 'node:assert/strict';

class Element {
  constructor() {
    this.attrs = new Map(); this.children = []; this.events = {};
    const classes = new Set();
    this.classList = {
      add: name => classes.add(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
      contains: name => classes.has(name)
    };
  }
  get attributes() { return [...this.attrs].map(([name, value]) => ({ name, value })); }
  setAttribute(name, value) { this.attrs.set(name, value); }
  getAttribute(name) { return this.attrs.get(name); }
  addEventListener(name, fn) { this.events[name] = fn; }
  append(...children) { children.forEach(child => { child.parent = this; this.children.push(child); }); }
  replaceWith(image) {
    assert.ok(this.parent, 'Replacement must target the currently mounted image');
    const parent = this.parent;
    parent.children[parent.children.indexOf(this)] = image;
    image.parent = parent; this.parent = null;
  }
}
const tick = () => new Promise(resolve => setImmediate(resolve));
let sequence = 0;
async function fixture() {
  const images = [];
  class Image extends Element {
    constructor() {
      super(); this.naturalWidth = 1800; this.naturalHeight = 3680;
      this.done = new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
      images.push(this);
    }
    decode() { return this.done; }
    cloneNode() {
      const clone = new Image(); clone.src = this.src; clone.isClone = true;
      if (!this.holdClone) clone.resolve();
      return clone;
    }
  }
  globalThis.Image = Image;
  globalThis.document = { createElement: () => new Element() };
  const { createImagePanel, warmImages } = await import('../dist/panel-images.mjs?test=' + sequence++);
  const region = new Element();
  const initial = new Element(); initial.setAttribute('id', 'screen'); initial.src = 'initial.png';
  region.append(initial);
  const panel = createImagePanel(region);
  const spec = src => ({ target: region.children[0], src, alt: src + ' 설명' });
  const request = src => images.find(image => !image.isClone && image.src === src);
  return { region, initial, panel, spec, request, images, warmImages };
}

test('나중에 선택한 화면만 표시하고 늦게 끝난 이전 응답은 무시한다', async () => {
  const f = await fixture(); const content = [];
  const first = f.panel.show([f.spec('old.png')], () => content.push('old'));
  const last = f.panel.show([f.spec('last.png')], () => content.push('last'));
  assert.equal(f.region.getAttribute('aria-busy'), 'true');
  f.request('last.png').resolve();
  assert.equal(await last, true);
  f.request('old.png').resolve();
  assert.equal(await first, false);
  assert.equal(f.region.children[0].src, 'last.png');
  assert.deepEqual(content, ['last']);
  assert.equal(f.region.getAttribute('aria-busy'), 'false');
});

test('두 이미지와 실제 표시 노드의 디코딩이 모두 끝나야 문구와 함께 교체한다', async () => {
  const f = await fixture(); const second = new Element(); f.region.append(second);
  let committed = false;
  const result = f.panel.show([f.spec('main.png'), { target: second, src: 'side.png', alt: '보조' }], () => { committed = true; });
  f.request('main.png').resolve(); await tick();
  assert.equal(committed, false); assert.equal(f.region.children[0], f.initial);
  f.request('side.png').holdClone = true;
  f.request('side.png').resolve(); await tick();
  assert.equal(committed, false);
  f.images.find(image => image.isClone && image.src === 'side.png').resolve();
  await result;
  assert.equal(committed, true);
  assert.equal(f.region.children[0].src, 'main.png');
  assert.equal(f.region.children[2].src, 'side.png');
  assert.equal(f.region.children[0].getAttribute('id'), 'screen');
  assert.equal(f.region.children[2].alt, '보조');
});

test('이전 요청의 실패는 현재 성공 화면을 오류 상태로 되돌리지 않는다', async () => {
  const f = await fixture();
  const old = f.panel.show([f.spec('failure.png')], () => assert.fail('Stale commit'));
  const current = f.panel.show([f.spec('success.png')], () => {});
  f.request('success.png').resolve(); await current;
  f.request('failure.png').reject(new Error('network')); await old;
  assert.equal(f.region.classList.contains('is-image-error'), false);
  assert.equal(f.region.children[0].src, 'success.png');
});

test('현재 요청 실패 시 기존 내용은 교체하지 않고 다시 시도할 수 있다', async () => {
  const f = await fixture(); let committed = false;
  const failed = f.panel.show([f.spec('retry.png')], () => { committed = true; });
  f.request('retry.png').reject(new Error('network')); await failed;
  assert.equal(committed, false); assert.equal(f.region.children[0], f.initial);
  assert.equal(f.region.classList.contains('is-image-error'), true);
  const status = f.region.children[1];
  assert.equal(status.children[1].hidden, false);
  status.children[1].events.click();
  f.images.filter(image => !image.isClone && image.src === 'retry.png').at(-1).resolve();
  await tick();
  assert.equal(committed, true);
  assert.equal(f.region.classList.contains('is-image-error'), false);
});

test('모달을 닫고 다시 열어도 닫힌 화면의 지연 요청이 개입하지 않는다', async () => {
  const f = await fixture();
  const closed = f.panel.show([f.spec('closed.png')], () => assert.fail('Closed dialog commit'));
  f.panel.cancel();
  const reopened = f.panel.show([f.spec('reopened.png')], () => {});
  f.request('closed.png').resolve(); await closed;
  assert.equal(f.region.getAttribute('aria-busy'), 'true');
  f.request('reopened.png').resolve(); await reopened;
  assert.equal(f.region.children[0].src, 'reopened.png');
});

test('미리 불러오던 이미지를 재사용하고 반복 전환에서도 표시 노드를 새로 준비한다', async () => {
  const f = await fixture();
  f.warmImages(['shared.png']); f.warmImages(['shared.png']);
  const result = f.panel.show([f.spec('shared.png')], () => {});
  assert.equal(f.images.filter(image => !image.isClone).length, 1);
  assert.equal(f.request('shared.png').fetchPriority, 'high');
  f.request('shared.png').resolve(); await result;
  const visible = f.region.children[0];
  await f.panel.show([f.spec('shared.png')], () => {});
  assert.notEqual(f.region.children[0], visible);
  assert.equal(f.images.filter(image => !image.isClone).length, 1);
});

test('디코딩 캐시를 제한하고 오래된 항목은 다시 준비한다', async () => {
  const f = await fixture();
  for (let index = 0; index < 5; index++) {
    const src = index + '.png'; f.warmImages([src]); f.request(src).resolve(); await tick();
  }
  f.warmImages(['0.png']);
  const requests = f.images.filter(image => !image.isClone && image.src === '0.png');
  assert.equal(requests.length, 2);
  requests[1].resolve(); await tick();
});

test('응답이 멈춰도 제한 시간 후 오류 표시와 재시도가 가능하다', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = await fixture();
  const pending = f.panel.show([f.spec('timeout.png')], () => assert.fail('Timed-out commit'));
  t.mock.timers.tick(15000); await pending;
  assert.equal(f.region.getAttribute('aria-busy'), 'false');
  assert.equal(f.region.classList.contains('is-image-error'), true);
  assert.equal(f.region.children[1].children[1].hidden, false);
});
