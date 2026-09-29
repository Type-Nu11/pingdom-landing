export function createHeroBackground({ hero, reducedMotion }) {
  const video = hero.querySelector('.hero-background-video');
  const connection = navigator.connection;
  let state = { visible: false, introPending: false };
  let wanted = false, pending = false, failed = false, disposed = false, revision = 0;
  video.muted = true;
  video.playsInline = true;
  video.loop = true;

  function allowed() {
    return !disposed && !failed && !reducedMotion.matches && !connection?.saveData &&
      !document.hidden && (state.introPending || state.visible);
  }
  function releaseSource() {
    if (!video.getAttribute('src')) return;
    video.removeAttribute('src');
    video.load();
  }
  function fallback() {
    failed = true; wanted = false; revision++;
    video.pause();
    hero.classList.remove('hero-video-ready');
    releaseSource();
  }
  function onPlaying() {
    if (allowed()) hero.classList.add('hero-video-ready');
    else video.pause();
  }
  async function play() {
    pending = true;
    const request = ++revision;
    try {
      await video.play();
      if (!allowed()) video.pause();
      else if (!video.paused) hero.classList.add('hero-video-ready');
    } catch (error) {
      // pause/load가 취소한 이전 요청은 새 재생 상태를 실패로 바꾸지 않습니다.
      if (request === revision && allowed() && error?.name !== 'AbortError') fallback();
    } finally {
      pending = false;
      if (!allowed()) video.pause();
      else if (request !== revision && video.paused) sync();
    }
  }
  function sync(next = state) {
    if (disposed) return;
    state = next;
    if (!allowed()) {
      if (wanted) revision++;
      wanted = false;
      video.pause();
      if (reducedMotion.matches || connection?.saveData || failed) {
        hero.classList.remove('hero-video-ready');
        releaseSource();
      }
      return;
    }
    wanted = true;
    if (!video.getAttribute('src')) {
      // 재생이 필요해질 때 한 가지 해상도만 불러옵니다.
      video.src = window.matchMedia('(max-width: 700px)').matches ? video.dataset.mobileSrc : video.dataset.desktopSrc;
    }
    if (!pending && video.paused) void play();
  }
  const onConnectionChange = () => sync();
  video.addEventListener('playing', onPlaying);
  video.addEventListener('error', fallback);
  connection?.addEventListener?.('change', onConnectionChange);
  return {
    sync,
    dispose() {
      if (disposed) return;
      disposed = true; wanted = false; revision++;
      video.pause();
      hero.classList.remove('hero-video-ready');
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', fallback);
      connection?.removeEventListener?.('change', onConnectionChange);
      releaseSource();
    }
  };
}
