import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { createScrollStory } from '../dist/scroll-story.mjs';

// 실제 controller에 DOM·IntersectionObserver·RAF 대역을 주입합니다.
// CSS 렌더링, sticky 배치, 실제 브라우저의 교차 판정이나 스크롤 성능을 검증하는 테스트는 아닙니다.
class ObservedTarget extends EventTarget {
  types = new Set();
  addEventListener(type, callback, options) {
    this.types.add(type);
    super.addEventListener(type, callback, options);
  }
  get listenerCount() {
    return [...this.types].reduce((sum, type) => sum + getEventListeners(this, type).length, 0);
  }
}
function element(attribute = '', { top = 1500, height = 200 } = {}) {
  const classes = new Set(), properties = new Map();
  const node = {
    parentElement: null,
    rect: { top, height, left: 0, width: 1000 },
    reads: 0,
    writes: 0,
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
      toggle(name, force) {
        const enabled = force ?? !classes.has(name);
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      }
    },
    style: {
      setProperty(name, value) { properties.set(name, String(value)); node.writes++; },
      getPropertyValue: name => properties.get(name) ?? '',
      removeProperty: name => properties.delete(name)
    },
    matches: selector => selector === `[${attribute}]`,
    querySelectorAll: () => [],
    getBoundingClientRect() {
      node.reads++;
      return { ...node.rect, bottom: node.rect.top + node.rect.height, right: node.rect.left + node.rect.width };
    }
  };
  return node;
}
function fixture(t, { reduced = false, observerSupported = true } = {}) {
  const html = element();
  const near = element('data-reveal', { top: 500 });
  const past = element('data-reveal', { top: -500 });
  const below = element('data-reveal');
  const outer = element('data-reveal');
  const inner = element('data-reveal');
  const hidden = element('data-reveal', { top: 0, height: 0 });
  const button = element();
  outer.parentElement = html;
  inner.parentElement = outer;
  button.parentElement = inner;
  const reveals = [near, past, below, outer, inner, hidden];
  reveals.forEach(node => node.style.setProperty('--reveal-delay', '160ms'));
  const story = element('data-scroll-story', { top: 1800, height: 2200 });
  const steps = Array.from({ length: 3 }, () => element('data-story-step'));
  story.querySelectorAll = selector => selector === '[data-story-step]' ? steps : [];
  const media = element('data-scroll-media', { top: 1800, height: 600 });
  const selectors = { '[data-reveal]': reveals, '[data-scroll-story]': [story], '[data-scroll-media]': [media] };
  const root = Object.assign(new ObservedTarget(), {
    hidden: false,
    documentElement: html,
    querySelectorAll: selector => selectors[selector] ?? []
  });
  const reducedMotion = Object.assign(new ObservedTarget(), { matches: reduced });
  const frames = new Map(), observers = [];
  let sequence = 0;
  class IntersectionObserverMock {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observed = new Set();
      this.disconnectCount = 0;
      observers.push(this);
    }
    observe(node) { this.observed.add(node); }
    unobserve(node) { this.observed.delete(node); }
    disconnect() { this.disconnectCount++; this.observed.clear(); }
  }
  const view = Object.assign(new ObservedTarget(), {
    innerHeight: 1000,
    innerWidth: 1200,
    matchMedia: () => reducedMotion,
    requestAnimationFrame: callback => { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame: id => frames.delete(id)
  });
  if (observerSupported) view.IntersectionObserver = IntersectionObserverMock;
  const controller = createScrollStory({ root, view, reducedMotion });
  t.after(() => controller.destroy());
  return {
    controller, root, view, reducedMotion, frames, observers, html, reveals,
    near, past, below, outer, inner, hidden, button, story, steps, media,
    emit: (target, name) => target.dispatchEvent(new Event(name)),
    intersect(node, isIntersecting) {
      observers.forEach(observer => {
        if (observer.observed.has(node)) observer.callback([{ target: node, isIntersecting }]);
      });
    },
    focus(node) {
      const event = new Event('focusin');
      Object.defineProperty(event, 'target', { value: node });
      root.dispatchEvent(event);
    },
    frame() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(16));
    }
  };
}
const value = (node, property) => Number(node.style.getPropertyValue(property));
const revealed = node => node.classList.contains('is-revealed');

test('초기 위치 복원과 교차 진입은 콘텐츠를 공개하고 이후 idle RAF는 남기지 않는다', t => {
  const f = fixture(t);
  assert.equal(f.html.classList.contains('scroll-motion-ready'), true);
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.equal(revealed(f.near), true);
  assert.equal(revealed(f.past), true);
  assert.equal(f.past.style.getPropertyValue('--reveal-delay'), '0ms');
  assert.equal(revealed(f.below), false);
  assert.equal(revealed(f.hidden), false);
  assert.equal(f.frames.size, 0);
  f.intersect(f.below, true);
  assert.equal(revealed(f.below), true);
  assert.equal(f.below.style.getPropertyValue('--reveal-delay'), '160ms');
  assert.equal(f.frames.size, 0);
  assert.ok(f.observers.every(observer => !observer.observed.has(f.below)));
});

test('모션 감소 또는 IntersectionObserver 미지원이면 전체를 표시하고 프레임을 요청하지 않는다', t => {
  for (const options of [{ reduced: true }, { observerSupported: false }]) {
    const f = fixture(t, options);
    assert.equal(f.html.classList.contains('scroll-motion-ready'), false);
    assert.ok(f.reveals.every(revealed));
    assert.ok(f.reveals.every(node => node.style.getPropertyValue('--reveal-delay') === '0ms'));
    f.emit(f.view, 'scroll');
    f.emit(f.view, 'resize');
    f.controller.refresh();
    assert.equal(f.frames.size, 0);
  }
});

test('빠른 scroll·resize는 한 프레임에서 최신 위치를 반영하고 진행값을 범위 안으로 제한한다', t => {
  const f = fixture(t);
  f.frame();
  f.intersect(f.story, true);
  f.intersect(f.media, true);
  f.story.rect.top = -300;
  f.emit(f.view, 'scroll');
  f.story.rect.top = -600;
  f.media.rect.top = 570;
  for (let index = 0; index < 8; index++) {
    f.emit(f.view, 'scroll');
    f.emit(f.view, 'resize');
  }
  const storyReads = f.story.reads, mediaReads = f.media.reads;
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.equal(f.story.reads, storyReads + 1);
  assert.equal(f.media.reads, mediaReads + 1);
  assert.equal(value(f.story, '--story-progress'), .5);
  assert.deepEqual(f.steps.map(step => value(step, '--step-progress')), [1, .72, 0]);
  assert.equal(value(f.media, '--media-progress'), .5);
  assert.equal(f.frames.size, 0);
  f.story.rect.top = -10000;
  f.media.rect.top = -10000;
  f.emit(f.view, 'scroll');
  f.frame();
  assert.equal(value(f.story, '--story-progress'), 1);
  assert.ok(f.steps.every(step => value(step, '--step-progress') === 1));
  assert.equal(value(f.media, '--media-progress'), 1);
  f.story.rect.top = 10000;
  f.media.rect.top = 10000;
  f.emit(f.view, 'scroll');
  f.frame();
  assert.equal(value(f.story, '--story-progress'), 0);
  assert.ok(f.steps.every(step => value(step, '--step-progress') === 0));
  assert.equal(value(f.media, '--media-progress'), 0);
  assert.equal(f.frames.size, 0);
});

test('화면 밖으로 나간 장면은 마지막 위치만 반영하고 반복 scroll에서 측정하지 않는다', t => {
  const f = fixture(t);
  f.frame();
  f.intersect(f.story, true);
  f.frame();
  f.story.rect.top = -3000;
  f.intersect(f.story, false);
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.equal(value(f.story, '--story-progress'), 1);
  const reads = f.story.reads, writes = f.story.writes;
  for (let index = 0; index < 5; index++) f.emit(f.view, 'scroll');
  assert.equal(f.frames.size, 0);
  f.frame();
  assert.equal(f.story.reads, reads);
  assert.equal(f.story.writes, writes);
});

test('작거나 낮은 화면으로 resize하면 sticky 전개 대신 모든 단계를 표시한다', t => {
  const f = fixture(t);
  f.story.rect.top = -600;
  f.frame();
  assert.equal(value(f.steps[2], '--step-progress'), 0);
  for (const [width, height] of [[900, 1000], [1200, 600]]) {
    f.view.innerWidth = width;
    f.view.innerHeight = height;
    f.emit(f.view, 'resize');
    assert.equal(f.frames.size, 1);
    f.frame();
    assert.equal(value(f.story, '--story-progress'), 1);
    assert.ok(f.steps.every(step => value(step, '--step-progress') === 1));
    assert.equal(f.frames.size, 0);
  }
});

test('숨김은 대기 프레임을 취소하고 복귀 후 최신 위치를 한 번 갱신한다', t => {
  const f = fixture(t);
  f.frame();
  f.intersect(f.story, true);
  assert.equal(f.frames.size, 1);
  f.root.hidden = true;
  f.emit(f.root, 'visibilitychange');
  assert.equal(f.frames.size, 0);
  const writes = f.story.writes;
  f.story.rect.top = -600;
  f.emit(f.view, 'scroll');
  f.emit(f.view, 'resize');
  f.intersect(f.media, true);
  f.frame();
  assert.equal(f.frames.size, 0);
  assert.equal(f.story.writes, writes);
  f.root.hidden = false;
  f.emit(f.root, 'visibilitychange');
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.equal(value(f.story, '--story-progress'), .5);
  assert.equal(f.frames.size, 0);
});

test('중첩된 숨김 영역의 키보드 포커스는 모든 reveal 조상과 지연을 즉시 해제한다', t => {
  const f = fixture(t);
  f.frame();
  assert.equal(revealed(f.outer), false);
  assert.equal(revealed(f.inner), false);
  f.focus(f.button);
  for (const ancestor of [f.outer, f.inner]) {
    assert.equal(revealed(ancestor), true);
    assert.equal(ancestor.style.getPropertyValue('--reveal-delay'), '0ms');
    assert.ok(f.observers.every(observer => !observer.observed.has(ancestor)));
  }
  assert.equal(f.frames.size, 0);
});

test('해시 이동·pageshow·탭 활성화 refresh는 IO 통지 없이도 새 위치와 콘텐츠를 복구한다', t => {
  const f = fixture(t);
  f.frame();
  f.story.rect.top = -300;
  f.below.rect.top = -400;
  f.emit(f.view, 'hashchange');
  f.frame();
  assert.equal(value(f.story, '--story-progress'), .25);
  assert.equal(revealed(f.below), true);
  assert.equal(f.below.style.getPropertyValue('--reveal-delay'), '0ms');
  f.story.rect.top = -900;
  f.emit(f.view, 'pageshow');
  f.frame();
  assert.equal(value(f.story, '--story-progress'), .75);
  f.hidden.rect.height = 200;
  f.hidden.rect.top = 300;
  f.controller.refresh();
  f.controller.refresh();
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.equal(revealed(f.hidden), true);
  assert.equal(f.frames.size, 0);
});

test('실시간 모션 감소 전환은 대기 작업을 취소하고 다시 켜면 현재 위치부터 복구한다', t => {
  const f = fixture(t);
  f.frame();
  f.intersect(f.story, true);
  assert.equal(f.frames.size, 1);
  f.reducedMotion.matches = true;
  f.emit(f.reducedMotion, 'change');
  assert.equal(f.frames.size, 0);
  assert.equal(f.html.classList.contains('scroll-motion-ready'), false);
  assert.ok(f.reveals.every(revealed));
  const writes = f.story.writes;
  f.emit(f.view, 'scroll');
  f.emit(f.view, 'resize');
  f.frame();
  assert.equal(f.story.writes, writes);
  f.story.rect.top = -600;
  f.reducedMotion.matches = false;
  f.emit(f.reducedMotion, 'change');
  assert.equal(f.html.classList.contains('scroll-motion-ready'), true);
  assert.equal(f.frames.size, 1);
  f.frame();
  assert.equal(value(f.story, '--story-progress'), .5);
  assert.equal(f.frames.size, 0);
});

test('destroy는 프레임·observer·이벤트를 정리하고 늦은 콜백이나 refresh를 무효화한다', t => {
  const f = fixture(t);
  assert.equal(f.frames.size, 1);
  assert.ok(f.root.listenerCount > 0);
  assert.ok(f.view.listenerCount > 0);
  assert.ok(f.reducedMotion.listenerCount > 0);
  f.controller.destroy();
  f.controller.destroy();
  assert.equal(f.frames.size, 0);
  assert.equal(f.html.classList.contains('scroll-motion-ready'), false);
  assert.equal(f.root.listenerCount, 0);
  assert.equal(f.view.listenerCount, 0);
  assert.equal(f.reducedMotion.listenerCount, 0);
  assert.ok(f.observers.every(observer => observer.disconnectCount === 1 && observer.observed.size === 0));
  const writes = f.story.writes;
  f.observers.forEach(observer => observer.callback([{ target: f.below, isIntersecting: true }]));
  f.focus(f.button);
  f.emit(f.view, 'scroll');
  f.emit(f.view, 'resize');
  f.emit(f.root, 'visibilitychange');
  f.emit(f.reducedMotion, 'change');
  f.controller.refresh();
  f.frame();
  assert.equal(revealed(f.below), false);
  assert.equal(revealed(f.outer), false);
  assert.equal(f.story.writes, writes);
  assert.equal(f.frames.size, 0);
});
