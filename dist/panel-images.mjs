const sources = new Map();
const CACHE_LIMIT = 4;
const LOAD_TIMEOUT = 15000;

function decode(image) {
  let timer;
  return Promise.race([
    image.decode(),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Image load timed out')), LOAD_TIMEOUT); })
  ]).finally(() => clearTimeout(timer));
}

function loadSource(src, priority = 'high') {
  const cached = sources.get(src);
  if (cached) {
    if (priority === 'high') cached.image.fetchPriority = 'high';
    sources.delete(src);
    sources.set(src, cached);
    return cached.promise;
  }
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = priority;
  image.src = src;
  const entry = { image, ready: false };
  entry.promise = decode(image).then(() => {
    entry.ready = true;
    // 원본 PNG의 디코딩 메모리를 무제한으로 보관하지 않습니다.
    for (const [key, value] of sources) {
      if (sources.size <= CACHE_LIMIT) break;
      if (value.ready) sources.delete(key);
    }
    return image;
  }, error => {
    if (sources.get(src) === entry) sources.delete(src);
    throw error;
  });
  sources.set(src, entry);
  return entry.promise;
}

export function warmImages(paths) {
  paths.forEach(src => { loadSource(src, 'low').catch(() => {}); });
}

async function prepareImage({ target, src, alt }) {
  const source = await loadSource(src);
  const image = source.cloneNode(false);
  for (const { name, value } of target.attributes) {
    if (!['src', 'srcset', 'loading', 'width', 'height', 'alt'].includes(name)) image.setAttribute(name, value);
  }
  image.loading = 'eager';
  image.width = source.naturalWidth;
  image.height = source.naturalHeight;
  image.alt = alt;
  // 표시할 노드 자체를 디코딩한 뒤 교체해야 이전 비트맵이 남지 않습니다.
  await decode(image);
  return { target, image };
}

export function createImagePanel(region) {
  let revision = 0;
  let retry;
  const status = document.createElement('div');
  status.className = 'image-status';
  const message = document.createElement('span');
  message.setAttribute('role', 'status');
  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.textContent = '다시 시도';
  retryButton.addEventListener('click', () => retry?.());
  status.append(message, retryButton);
  region.append(status);
  region.classList.add('image-panel');

  function setState(state) {
    region.classList.toggle('is-image-loading', state === 'loading');
    region.classList.toggle('is-image-error', state === 'error');
    region.setAttribute('aria-busy', String(state === 'loading'));
    retryButton.hidden = state !== 'error';
    message.textContent = state === 'error' ? '이미지를 불러오지 못했습니다.' : state === 'loading' ? '화면을 불러오는 중' : '';
  }

  async function show(specs, commit) {
    const request = ++revision;
    retry = () => show(specs, commit);
    setState('loading');
    let prepared;
    try {
      prepared = await Promise.all(specs.map(prepareImage));
    } catch {
      if (request === revision) setState('error');
      return false;
    }
    // 다른 탭 선택이나 모달 닫기 이후에 끝난 요청은 화면을 변경하지 않습니다.
    if (request !== revision) return false;
    prepared.forEach(({ target, image }) => target.replaceWith(image));
    setState('ready');
    retry = undefined;
    commit();
    return true;
  }

  return {
    show,
    cancel() { revision++; retry = undefined; setState('ready'); }
  };
}
