# 현재 자산과 출처

## 추가 AI 전면 수정 · revision-6

여행 AI와 상권 상담의 주 시각을 새 투명 3D 서비스 원리 그림으로 바꿉니다. 두 그림은 내장 `image_gen`의 `stylized-concept`, `transparent_background=true`로 제작했습니다. 가상의 장소 분위기와 가게·동네 모형이며 실제 핑덤 등록 장소·제품 UI·상권 분석 결과가 아닙니다. 이후 코멘트에 따라 원본 보기 버튼과 dialog는 제거했습니다. 생성 프롬프트는 [ai-refresh-prompts.md](ai-refresh-prompts.md), 원본 경로·치수·bytes·SHA256은 `dist/assets/ai-refresh/manifest.json`에 기록했습니다.

- `traveler-discovery.webp`: glass map·pink pin·세 장소 분위기 그림, 1536×1024 RGBA, 438,546 bytes.
- `consulting-neighborhood.webp`: 가게·동네·상권을 표현한 3D 그림, 1536×1024 RGBA, 312,690 bytes.
- PNG에서 WebP quality95/method6으로 변환했습니다. 크기·crop·색을 다시 구성하지 않았고 디코딩 alpha가 원본과 정확히 일치함을 확인했습니다. 원본 alpha 범위는0..254이며 모서리는0입니다.
- 사용자 제공 우주 사진은 기존 `ai-traveler-background.webp` 1920×1080·141,636 bytes 압축본을 제한된 배경으로 사용합니다. 원본 `image 10.png`를 같은1920×1080 Lanczos 크기로 분석한 RGB 평균 차이는2.11/1.18/1.86입니다. 구도는 유지하면서 작은 배경을 위해7680×4320 전체 디코딩을 피합니다. 고해상도 `revision/ai-cosmos.webp`는 원본 기록으로 보관합니다.

아래는 직전 배포와 이전 자산의 기록입니다. 최신 AI 그림과 혼동하지 않습니다.

## 직전 revision-5 자산 기록

AI 배경은 사용자가 첨부한 `/Users/azunox/Downloads/image 10.png`입니다. 원본 7680×4320의 크기·구도·색을 유지하고 RGB WebP quality 94/method 6으로만 변환했습니다. 출력 `dist/assets/revision/ai-cosmos.webp`는 1,724,582 bytes이며 SHA256은 `8441b892393e84ce48f1a3939c8ff58a7595296d1eaded57c0db8070403f8605`입니다. 원본과 출력 메타데이터는 `revision/manifest.json`에 기록했습니다.

플랫폼에는 여행자·카페·운영 작업 사진 3개를 사용합니다. `local-culture.webp`와 이전 팀 프로필은 활성 PC 장면에서 사용하지 않습니다. 팀 소개는 전체 문서에서 제거했습니다. AI는 원본 221×258 추천 카드 한 장과 원문 추천 이유를 같은 흰 제품면에 담습니다. 제공 우주 이미지는 제품 뒤의 제한된 면에서 사용합니다. 컨설팅은 실제 상담 확인 패널 489×557 전체를 사용하여 조건·요청란·분석 요청의 맥락을 유지합니다.

상점주 카메라의 초점 이동은 원본 전체 등록/이벤트 이미지에 CSS 원근과 crop을 적용한 것입니다. 제품 자산 파일의 픽셀·문구·색을 바꾸지 않았습니다. 아래의 이전 자산 기록은 현재 활성 화면과 구분합니다.

## 이전 시안에서 보관한 UI 파생 레이어

아래 두 분리 패널은 이전 시안 기록으로 보관합니다. 현재 상점주 구도는 native 전체 등록/이벤트 화면의 카메라 이동을 사용하며 예약 달력을 분리해 확대하지 않습니다.

데스크톱 모션에서 실제 `app-booking-preview.webp` 전체 화면과 `merchant-event.png`를 추가로 사용합니다. 원본 PNG에서 크기 변경 없이 lossless WebP로 추출한 두 패널은 `dist/assets/desktop-motion/manifest.json`에 원본 SHA256·좌표·픽셀 크기·bytes·미입력 상태를 기록했습니다.

| 레이어 | 원본 및 crop XYWH | 결과 |
| --- | --- | --- |
| `merchant-register-panel.webp` | `merchant-register.png` 1864×1004, `[506,196,1101,500]` | 1101×500, 검색·카테고리·위치 선택 전 영역 |
| `merchant-event-panel.webp` | `merchant-event.png` 1864×1003, `[1025,195,581,635]` | 581×635, 새 이벤트 등록 카드 |

원본 crop과 디코딩 WebP의 RGBA 픽셀이 일치합니다. 로고·문구·색·폼 내용을 재생성하지 않았습니다. 이미지 준비 전에는 원본 화면을 유지하고, 준비된 crop만 원래 좌표에서 분리합니다. 모바일용 자산이나 새 모바일 구도는 제작하지 않았습니다.

공식 평면 로고, 앱·운영 웹 화면과 팀 사진은 기존 프로젝트의 원본을 사용합니다. 제품 화면의 문구·수치·색·이미지를 AI로 재생성하지 않습니다. 본문 산책 사진은 별도로 생성한 브랜드 분위기 이미지입니다.

## 원래 첫 화면의 복원 자산

다음 자산과 재생 모듈은 기존 첫 화면에서 가져와 현재 페이지에 다시 연결했습니다. 새 본문용 이미지와 구분합니다.

- `seoul-traffic-poster-highway-exposure.webp`: 기존 서울 야경·고가도로 장노출 배경 포스터.
- `seoul-traffic-desktop-highway-exposure.mp4`, `seoul-traffic-mobile-highway-exposure.mp4`: 화면 크기에 따라 선택하는 기존 반복 영상.
- `pingdom-intro-symbol-source.png`: 검은 인트로의 원본 심볼.
- `pingdom-wordmark-chrome.webp`: 기존 금속 워드마크. 하프톤 렌더러의 원본 이미지이며 본문의 공식 평면 로고와 별개입니다.
- `pingdom-sans.woff2`: 기존 히어로 제목과 인트로의 글꼴.

`hero-preserved.mjs`가 `hero-intro.mjs`, `ring-particles.mjs`, `ring-flow.mjs`, `halftone-renderer.mjs`, `hero-background.mjs`를 실제로 사용합니다. 기존 인트로·영상·하프톤은 보관만 하는 파일이 아니라 활성 첫 화면의 구성입니다.

## 본문의 공식 로고와 실제 제품 화면

| 사용 위치 | 현재 자산과 원본 |
| --- | --- |
| 메뉴·푸터 로고 | `redesign/official-wordmark.webp`: `pingdom-wordmark-source.png`의 캡처 테두리와 외부 여백만 제외 |
| 발견 장면 | `app-map-preview.webp`: `app-map-source.png`의 전체 화면 표시용 축소본. 대구 구지면 지도·검색·카테고리·추천 목록이 한 화면에 포함 |
| 장소 정보 | `app-place-preview.webp`: `app-place-source.png`의 실제 대성반점 상세 화면 |
| 예약 | `redesign/booking-calendar.webp`: `app-booking-source.png`의 실제 날짜·오전/오후 선택 영역 crop |
| 방문 기록 | `app-profile-preview.webp`: `app-profile-source.png`의 마이페이지·달력·방문 기록 |
| 운영자 | `admin-places.png`: 실제 장소 목록·지도·운영 메뉴 |
| 상점주 | `merchant-register.png`: 실제 신규 장소 등록 웹 |
| 여행자 AI | `redesign/ai-traveler.webp`: `ai-traveler-slide.png`의 실제 응답 패널 crop |
| 상권 상담 | `web-report.webp`: 기존 실제 컨설팅 웹 화면을 원래 전체 구도로 사용 |
| 팀 | 발표자료의 `presentation-*.png`. 김일강은 `presentation-yongin.png`, 이용인은 `presentation-ilgang.png`에 연결 |

전체 화면과 crop 모두 고유 비율을 유지합니다. 제품 UI를 늘이거나 재조합해 임의의 화면을 만들지 않습니다. 원본의 반복 장소, 날짜, 거리, 사용자 이름과 기타 수치를 유지합니다.

공식 핑크는 `#FF1956`입니다. 로고와 원본 UI의 색을 바꾸지 않으며, 작은 본문 라벨과 밝고 어두운 지면의 보조 글자는 각각 읽기 대비를 확보한 색을 사용합니다. 본문 글꼴은 자체 호스팅된 전체 Pretendard Variable WOFF2입니다.

`dist/assets/redesign/manifest.json`은 이전 UI 추출 과정의 원본 경로·해상도·crop 좌표·결과 해상도·파일 크기를 유지합니다. `pixel_exact: true`인 11개 파생 자산은 생성 당시 crop 영역과 WebP의 RGBA 바이트를 비교하고 원본 ICC 프로필을 보존했습니다. 이 manifest의 모든 자산이 현재 화면에 표시되는 것은 아닙니다.

검색 바·지도·추천 목록을 분리한 `map-search.webp`, `map-surface.webp`, `map-recommendations.webp`와 이전 카드 겹침 시안은 현재 HTML에서 사용하지 않습니다. 이전 `neighborhood-dusk*.webp`, 추가 UI crop도 파일을 보관하되 현재 자산과 구분합니다.

## 본문 산책 사진 생성 기록

기존 자료에는 새 본문의 사진 spread에 사용할 독립적인 고해상도 로컬 산책 사진이 없었습니다. 내장 `image_gen` 도구로 가상의 한국 동네를 산책하는 분위기를 생성했습니다. 실제 핑덤 등록 장소나 실제 여행자를 촬영한 사진이라는 의미는 아닙니다. 생성 사진의 풍경과 원본 앱의 대구 지도는 동일한 장소를 나타내지 않습니다.

- 방식: 내장 `image_gen`, `photorealistic-natural`. CLI/API fallback과 입력 참조 이미지는 사용하지 않았습니다.
- 생성 원본: `/Users/azunox/.codex/generated_images/01a0f006-2f56-70c1-9a72-f190c532af72/exec-d866c31f-7f1b-4632-a1eb-9219a1bb163f.png` (1672×941).
- 가로 배포 이미지: `dist/assets/rebuild/local-walk.webp` (1920×1080, Lanczos fit, WebP quality 75, 288,228 bytes).
- 모바일 배포 이미지: `dist/assets/rebuild/local-walk-mobile.webp` (900×1200). 원본의 `x=645..1351`, `y=0..941` 영역을 crop한 뒤 Lanczos 리샘플링, WebP quality 77, 167,670 bytes.
- 별도 세로 프레이밍은 여행자와 매장 앞을 중심으로 구성했습니다. 실제 UI와 달리 사진 파생에는 표시용 압축·리샘플링을 적용했습니다.
- 이미지 내부에 공식 로고·UI·읽을 수 있는 생성 문구를 넣지 않았습니다. 생성 원본과 가로·세로 파생 파일의 인물 비율, 보행 자세, 건물·보도 질감, 절제된 오후 빛을 직접 확인했습니다.
- 최종 생성 프롬프트와 상세 사용 기록: [rebuild-image-prompt.txt](rebuild-image-prompt.txt).

## 기존 UI 파생 재생성

Pillow가 설치된 Python에서 기존 UI crop을 재생성할 수 있습니다. 배포에는 Python이 필요하지 않습니다.

```sh
python scripts/extract-product-assets.py \
  --neighborhood-source /path/to/previous-neighborhood.png \
  --contact-sheet /tmp/pingdom-product-assets.jpg
```

이 스크립트의 `--neighborhood-source`는 이전 시안의 1870×841 동네 이미지용입니다. 현재 `rebuild/local-walk*.webp`를 생성하는 절차로 혼동하지 않습니다. 현재 사진의 원본·crop·압축 설정은 `rebuild-image-prompt.txt`를 기준으로 사용하며 원본 파일은 수정하지 않습니다.


## 33개 코멘트 반영: PC native 자산과 벡터 그래픽

`dist/assets/desktop-polish/manifest.json`에 23개 native 전체 화면과 실제 UI crop의 출처·원본/출력 SHA256·크기·bytes를 기록했습니다. 모두 해상도 변경 없이 lossless WebP로 변환하고 원본 영역과 디코딩 RGBA가 일치함을 검증했습니다.

- 앱 8개: 1800×3680 원본. 활성 PC 지면은 지도·장소·예약·프로필을 사용하며 이전 960×1963 표시용 축소본의 추가 손실을 제거합니다.
- 상점주 등록/이벤트: 원래 1864×1004/1003 전체 화면과 기존의 정확한 패널 crop을 사용합니다.
- 여행자 AI: 1439×645 실제 응답 전체와 추천 카드 5개를 원래 위치·내용 그대로 분리합니다.
- 상권 컨설팅: clean UI 최대 원본 1200×641과 실제 상담 패널 489×557 crop을 사용합니다. 목업 합성 이미지를 더 높은 실제 제품 해상도로 취급하지 않습니다.
- 산책 사진: 생성 원본 1672×941 그대로 표시합니다. 이전 확대·quality75 압축을 추가하지 않습니다.
- 공식 워드마크와 팀 프로필은 기존 최대 원본을 유지합니다. 낮은 원본 해상도를 새 제품 정보나 다른 인물로 재생성하지 않았습니다.

장소 상세의 블러 5개는 `place-privacy-regions.json`의 native 좌표와 전체 이미지 비율에 대응합니다. 이름·사진 2개·주소·연락처 외의 영업 정보와 혜택 UI를 보존하며 PC의 DOM backdrop-filter로 표시합니다.

이전 플랫폼의 지도/초대 카드/연결망 SVG·CSS는 최신 PC 지면에서 제거했습니다. 새 구성은 사진 3장과 역할 설명으로 구성하며 원본 관리자 지도 화면은 기존 좁은 화면 문서에 보존합니다.

검증: `node scripts/check-native-assets.mjs`. 외부 생성 원본 없이 배포 파일의 출력 SHA256·크기만 확인할 때는 `--outputs-only`를 사용합니다.

## 최신 8개 코멘트: 새 소개 사진 4종

내장 `imagegen`으로 만든 1536×1024 소개용 사진입니다. 원본 PNG를 보존하고 같은 해상도의 RGB WebP quality 94/method 6으로 변환했습니다. 실제 장소·등록 업체·이용자·운영자·팀원 사진이라는 의미가 아닙니다. 제품 UI와 인물 프로필은 기존 원본을 유지합니다.

| 파일 | 소개 용도 |
| --- | --- |
| `revision/traveler-discovery.webp` | 동네 골목에서 장소를 발견하는 여행자 |
| `revision/merchant-cafe.webp` | 카페에서 방문자를 맞이하는 상점주 |
| `revision/operator-workspace.webp` | 장소 사진과 정보를 살펴보는 운영 작업 |
| `revision/local-culture.webp` | 새로운 로컬 문화 공간 발견 |

`dist/assets/revision/manifest.json`에 생성 원본의 절대 경로·도구·생성 요청 요약·표시 용도·해상도·출력 SHA256을 기록했습니다. 최신 화면에서는 여행자/상점주/운영자 사진을 플랫폼에서 사용하고 문화 사진은 보관합니다. 새 로고·UI·읽을 수 있는 생성 문구·가상의 실적 수치를 사진에 삽입하지 않았습니다.

### 2026-09-30 공식 로고 투명 표시

`redesign/official-wordmark.svg`는 기존 crop WebP bytes를 그대로 내부에 포함합니다. SVG의 sRGB filter가 alpha=1.294416244×(1-G)로 흰 배경과 가장자리를 분리하고 원본 내부의 실색 G=58/255를 alpha=1로 두고 공식 `#FF1956` 색을 합성합니다. 글자 윤곽·간격은 원본에서 읽으며 새 로고를 생성하지 않습니다. header/footer에서 이 파일을 사용합니다. 원본 WebP와 PNG는 보존했습니다.

### 2026-09-30 Consulting 항공 전환

최종 연출은 사용자가 제공한 도시 야경을 바탕으로 합니다. 내장 `imagegen`으로 선명도를 보완하고 가로 파노라마로 확장한 뒤, HyperFrames에서 옆방향 비행과 핀 등장을 담은 9초·1920×1080·60fps 무음 MP4를 제작합니다. 이전 주간 후보 `consulting-flight/seoul-aerial.webp`는 최종 영상에 사용하지 않습니다.

| 구분 | 파일과 치수 |
| --- | --- |
| 사용자 제공 원본 | `/var/folders/xh/_kv9hs511bq2wx9jdj_q930h0000gn/T/codex-clipboard-448feadb-31e7-49d4-a4af-5ffa3f4f6f64.png` · 900×600 |
| AI 복원·가로 확장 원본 | `/Users/azunox/.codex/generated_images/01a0efe2-c1ac-7bf2-89f4-6a8f4a672bfb/exec-8dcec340-bfe4-4958-be14-6341b2ae56f9.png` · 2103×748 |
| 웹 영상 | `dist/assets/consulting-flight/seoul-night-flight.mp4` · FullHD 출력 |
| 웹 포스터 | `dist/assets/consulting-flight/seoul-night-poster.webp` |

사용자 원본의 건물과 야경을 참고한 AI 복원·확장 이미지이며, 보완된 질감과 확장 영역에는 생성된 내용이 포함됩니다. FullHD는 영상 출력 크기입니다. 원본 900×600의 정보 한계를 제거하거나 실제 도시의 고해상도 촬영 정보를 새로 확보했다는 의미는 아닙니다.

야경 이미지에 카메라 이동을 적용한 소개 영상입니다. 핀의 위치·등장 순서·ring은 서비스 원리를 표현하는 개념 연출이며 실제 등록 업체 위치나 상권 분석 결과와 대응하지 않습니다. 외부 주간 사진을 재사용하는 대신 위 사용자 제공 파일과 생성 원본을 최종 자산의 출처로 기록합니다.

### 2026-09-30 Consulting 글로벌 전환: v10 제작 기록

새 요구는 더 긴 도시 야경 비행 뒤에 지구와 여러 핀을 연결하는 16초 영상입니다. 위 9초 영상은 이전 제작 기록으로 보존합니다. 새 composition은 `review/consulting-flight-10/global-flight-video`에 있으며, 이미지 제작 요청은 `review/consulting-flight-10/IMAGE-PROMPTS.md`에 기록했습니다.

사용자 제공 야경을 참조해 내장 `imagegen`으로 새로운 긴 파노라마와 중첩 구간 세 장을 생성했습니다. 아래 치수는 각 PNG의 실제 이미지 헤더로 확인한 생성 원본 크기입니다.

| 생성 원본 | 실제 치수 | 용도 |
| --- | --- | --- |
| `review/consulting-flight-10/global-flight-video/assets/seoul-night-ultrawide.png` | 2172×724 | 긴 야경 구도와 연결 기준 |
| `review/consulting-flight-10/global-flight-video/assets/seoul-night-left.png` | 1536×1024 | 왼쪽 중첩 구간 |
| `review/consulting-flight-10/global-flight-video/assets/seoul-night-center.png` | 1536×1024 | 중앙 중첩 구간 |
| `review/consulting-flight-10/global-flight-video/assets/seoul-night-right.png` | 1536×1024 | 오른쪽 중첩 구간 |

건물·창문·지붕과 확장 영역을 AI로 재구성한 브랜드 연출용 이미지입니다. 생성된 건물의 세부와 중첩 구간의 배열은 실제 도시 현황이나 정확한 지리 좌표의 근거로 사용하지 않습니다. 출력 해상도와 생성 원본의 실제 치수를 구분하며, 원본에 없던 촬영 정보를 확보한 것으로 표현하지 않습니다.

16초·60fps·960프레임 무음 영상의 렌더와 웹 인코딩을 완료했습니다. 4K master와 1440p 웹 영상 모두 H.264 High·yuv420p이며 출력 해상도와 생성 원본 치수를 구분합니다.

| 출력 | 파일 | 실제 치수 | 실제 크기 |
| --- | --- | --- | --- |
| 보관용 master | `review/consulting-flight-10/global-flight-video/renders/global-flight-master.mp4` | 3840×2160 | 179,397,004 bytes |
| 웹 영상 | `dist/assets/consulting-flight/seoul-global-flight.mp4` | 2560×1440 | 61,980,621 bytes |
| 웹 포스터 | `dist/assets/consulting-flight/seoul-global-poster.webp` | 2560×1440 | 839,558 bytes |

`dist/assets/consulting-flight/global-manifest.json`에 원본 5개·사용자 참조 원본·master·웹 영상·포스터의 실제 치수, 바이트 수와 SHA256을 기록했습니다. 로컬 감사에서 각 기록과 실제 파일이 일치했습니다. 웹 영상은 15프레임 간격 키프레임 64개, B프레임과 오디오 스트림 0, `moov`가 `mdat`보다 앞에 있는 faststart를 확인했습니다. 보관용 master의 키프레임 간격은 250프레임이며 웹 스크럽용 파일과 구분합니다. 공개 배포 응답과 브라우저 검증은 이 로컬 출력 감사에 포함하지 않습니다.

지구는 composition 안에서 Three.js로 렌더링해 영상에 포함하며 웹 페이지에 별도 Three.js 의존성을 추가하지 않습니다. `MEDIA.md`가 참조하는 `BRIEF.md`와 [NASA Blue Marble: Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/)의 제작·출처 기록을 확인했습니다. 텍스처는 [NASA 공식 June 2004 JPEG](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/june/world.200406.3x5400x2700.jpg)이며 보관 파일 `review/consulting-flight-10/global-flight-video/assets/nasa-blue-marble-june.jpg`의 실제 크기는 5400×2700·1,692,239 bytes입니다. 출처 표기는 **NASA Earth Observatory**, 제작자는 Reto Stöckli, NASA Goddard Space Flight Center입니다. 재사용 기준은 [NASA Earth Science FAQ](https://science.nasa.gov/earth/faq/)의 이미지 재사용 안내를 따릅니다.

지구 표면은 2004년 6월 합성 지표 텍스처이며 현재 위성 화면이나 실시간 도시 정보로 표현하지 않습니다. 도시와 지구 위 핀은 서비스 원리를 표현하는 개념 연출이며 실제 등록 업체, 운영 국가·서비스 제공 범위, 실시간 상권 분석 결과를 표시하지 않습니다.

공개 프로덕션 [Pingdom](https://pingdom-landing.vercel.app/)의 v10 자산을 익명 HTTP로 감사했습니다. 실제 루트·index·app·AI CSS/모듈·scroll-stops·웹 영상·포스터·manifest의 응답 9개가 모두 HTTP 200·정상 MIME이며 전체 바이트 수와 SHA256이 로컬 파일과 일치합니다. 실제 HTML과 app의 revision-10 참조도 일치합니다. 영상의 첫·마지막 1024바이트 Range 요청은 모두 HTTP 206·정확한 Content-Range와 로컬 본문 일치를 확인했습니다. 상세 결과는 [public-assets-audit.json](review/consulting-flight-10/public-assets-audit.json)에 기록했습니다. 이 감사는 공개 파일 전달 검증이며 실제 브라우저 재생·스크롤 검증과 구분합니다.

### 2026-09-30 Consulting 공식 핀 교체: v11 제작 기록

사용자가 첨부한 공식 핑 로고를 참조해 도시·지구·웹 사진 fallback의 핀을 같은 투명 자산으로 교체했습니다. v10의 야경 패널·NASA 지표·도시 카메라·지구 회전·16초 타이밍은 유지하며 이전 v9·v10 자산과 검증 기록은 보존합니다. composition은 `review/consulting-flight-11/brand-pin-video`입니다.

첨부 원본은 `review/consulting-flight-11/official-pin-reference.png`에 그대로 보존했습니다. 실제 치수는 506×528·19,474 bytes이며 불투명한 어두운 배경과 중심을 포함합니다. ICC 내부 설명은 `Display`, macOS에서 식별한 프로파일은 Display P3입니다. 원본 주색을 sRGB로 변환한 기준은 `#FF1956`입니다.

내장 `imagegen`의 참조 편집과 `transparent_background=true`로 만든 `brand-pin-video/assets/pingdom-pin-clean.png`는 실제 1254×1254 RGBA·572,991 bytes입니다. 요청한 2048×2048과 실제 생성 크기를 구분합니다. 첨부의 실루엣·비율을 참조한 생성 파생이며 원본과 픽셀·색의 완전 일치를 주장하지 않습니다. 생성 요청은 [IMAGE-PROMPT.md](review/consulting-flight-11/IMAGE-PROMPT.md)에 기록했습니다.

`dist/assets/consulting-flight/pingdom-pin-clean.webp`는 같은 1254×1254·342,672 bytes의 lossless 형식 변환입니다. 생성 PNG와 디코딩 RGBA가 정확히 일치하고 alpha bbox `[142,57,1134,1181]`, 중앙 원형 구멍의 alpha 0과 가장자리 anti-alias alpha를 확인했습니다. 도시 DOM과 지구 Sprite는 생성 PNG를 공유하고 웹 fallback은 이 WebP를 사용합니다. 정사각형 비율과 하단 tip anchor `[626,1181]`을 적용하며 흰 중심·기존 자체 SVG/CanvasShape·채워진 도시 바닥 장식을 제거했습니다.

| 출력 | 파일 | 실제 치수 | 실제 크기 |
| --- | --- | --- | --- |
| 보관용 master | `review/consulting-flight-11/brand-pin-video/renders/brand-pin-master.mp4` | 3840×2160 | 178,848,303 bytes |
| 웹 영상 | `dist/assets/consulting-flight/seoul-global-flight-brand.mp4` | 2560×1440 | 61,840,413 bytes |
| 웹 포스터 | `dist/assets/consulting-flight/seoul-global-poster-brand.webp` | 2560×1440 | 836,954 bytes |

두 영상은 실제 16초·60fps·960프레임·무음 H.264 High·yuv420p·BT.709입니다. `brand-manifest.json`의 원본·로고·composition·master·웹 영상·포스터 치수·바이트 수·SHA256을 로컬 파일과 대조했습니다. 웹 영상의 GOP15·키프레임 64개·B프레임 0·PTS/DTS 일치·faststart가 통과했습니다. 보관용 master는 GOP250이며 웹 스크럽 파일과 구분합니다. 결과는 [local-assets-audit.json](review/consulting-flight-11/local-assets-audit.json)에 기록했습니다. 이 파일 감사에는 공개 배포·브라우저 재생·스크롤·실측 FPS가 포함되지 않습니다.

도시 원본의 실제 치수와 AI 재구성 범위, NASA Earth Observatory의 June 2004 Blue Marble 출처·제작자·재사용 기준은 위 v10 기록과 v11 composition의 `MEDIA.md`·`BRIEF.md`를 유지합니다. 도시와 지구 핀은 브랜드의 확장 목표를 표현하며 실제 등록 장소·운영 국가·서비스 제공 범위·실시간 분석 결과를 표시하지 않습니다.

공개 프로덕션 [Pingdom](https://pingdom-landing.vercel.app/)의 v11 자산을 익명 HTTP로 감사했습니다. 루트·index·app·AI CSS/모듈·scroll-stops·새 웹 영상·포스터·로고 WebP·brand-manifest 응답 10개가 모두 HTTP 200·정상 MIME이며 전체 바이트 수와 SHA256이 로컬과 일치합니다. HTML과 app의 revision-11 연결, 새 영상·포스터·로고 참조와 원격 manifest 기록도 일치합니다. 영상 첫·마지막 1024바이트 요청은 모두 HTTP 206·정확한 Content-Range·로컬 본문 일치를 확인했습니다. 공개 alias만 요청했으며 쿠키·인증·배포 보호 우회·보호된 개별 배포 URL은 사용하지 않았습니다. 증거는 [public-assets-audit.json](review/consulting-flight-11/public-assets-audit.json)에 기록했습니다. 이 감사는 공개 파일 전달 검증이며 실제 브라우저 재생·스크롤·실측 FPS 검증과 구분합니다.

### 2026-09-30 Consulting 지구 네트워크: v12 제작 기록

사용자 첨부 `review/consulting-flight-12/earth-network-reference.png`를 큰 하단 돔·짙은 남색·흰 지리점·얇은 격자의 디자인 참조로 사용했습니다. 원본은 실제 1727×739·1,019,567 bytes이며 SHA256은 `cd546bed02b3f7a36134e5991cd8bf28827a17f9a84b6bbacf51edd59ab9b4d2`입니다. 참조 페이지 문구와 실적 정보는 영상 구성에 포함하지 않습니다. 새 composition은 `review/consulting-flight-12/network-flight-video`입니다.

v11의 야경 패널과 공식 로고 PNG를 그대로 재사용하며 새 이미지 생성은 하지 않았습니다. 공식 PNG는 1254×1254·572,991 bytes이고 SHA256 `7642f9b9f9459c4eb21ea7a9b3371ff1ead8cdbae8c940e4f2dd14e2749bcaac`가 이전 원본과 일치합니다. 기존 웹 로고의 lossless RGBA 일치·투명 구멍·경계 alpha도 다시 확인했습니다. 원본 첨부와 생성 파생의 차이는 위 v11 기록을 유지합니다.

구형 지면의 흰 점은 보존한 NASA Earth Observatory June 2004 Blue Marble 지표의 육지·빙하 색상 샘플에서 구성합니다. NASA 원본의 5400×2700·1,692,239 bytes와 SHA256은 v10·v11과 같습니다. `network-flight-video/assets/nasa-land-points.json`은 실제 771,808 bytes·27,563점·82,689개 좌표이며 SHA256은 `d1c661b4479c183f24bde799adad1b2af8f345ca4afd268020ebc23f7f976cc8`입니다. 선언된 sampling step은 0.65°입니다. JSON 파일·NASA 출처 해시·점 개수×3·모든 좌표의 유한값 일치를 검증했으며 지리 투영이나 색상 샘플링 정확도를 검증한 것으로 확대하지 않습니다. NASA 출처·제작자·재사용 기준은 위 v10 기록과 v12 `MEDIA.md`를 유지합니다.

manifest의 장면 구성은 0–8.5초 도시 비행, 8.5–12초 도시 핀에서 큰 돔으로 연결, 12–20초 중앙 허브의 순차 경로와 신호, 20–22초 완성 구도 유지입니다. 도시·허브·경로는 향후 확장 목표를 표현하는 개념 연출이며 현재 운영 국가·실제 업체·판매 실적·실시간 지리 데이터를 표시하지 않습니다. Three.js는 영상 렌더 composition에서 사용합니다.

| 출력 | 파일 | 실제 치수 | 실제 크기 |
| --- | --- | --- | --- |
| 보관용 master | `review/consulting-flight-12/network-flight-video/renders/network-flight-master.mp4` | 3840×2160 | 162,697,502 bytes |
| 웹 영상 | `dist/assets/consulting-flight/seoul-network-flight.mp4` | 2560×1440 | 65,363,141 bytes |
| 웹 포스터 | `dist/assets/consulting-flight/seoul-network-poster.webp` | 2560×1440 | 861,870 bytes |

두 영상은 실제 22초·60fps·1320프레임·무음 H.264 High·yuv420p·BT.709입니다. `network-manifest.json`과 원본·참조·지리점 JSON·composition·master·웹 영상·포스터·로고 15개 파일의 실제 치수·바이트 수·SHA256이 일치했습니다. 웹 영상은 GOP15·키프레임 88개·B프레임 0·PTS/DTS 일치·faststart가 통과했습니다. 보관용 master는 GOP250입니다. 결과는 [local-assets-audit.json](review/consulting-flight-12/local-assets-audit.json)에 기록했습니다. 이 파일 감사에는 공개 배포·실제 브라우저 재생·스크롤·실측 FPS·경로 기하와 투영 정확도 검증이 포함되지 않습니다. v9·v10·v11 자산과 검증 기록은 보존합니다.

공개 프로덕션 [Pingdom](https://pingdom-landing.vercel.app/)의 v12 자산 전달 감사가 통과했습니다. 루트·index·app·AI CSS/모듈·scroll-stops·새 영상·포스터·공식 로고 WebP·network-manifest 응답 10개 모두 익명 HTTP 200·정상 MIME이며 전체 바이트 수·SHA256이 로컬과 일치합니다. revision-12 연결, 새 영상·포스터·로고 참조와 원격 manifest 전체 내용도 일치합니다. 65,363,141 bytes 영상의 첫·마지막 1024바이트는 각각 정확한 Content-Range·HTTP 206·로컬 본문 일치를 확인했습니다. 공개 alias만 사용했으며 인증·쿠키·보호 우회·보호된 개별 배포 URL·redirect는 사용하지 않았습니다. 결과는 [public-assets-audit.json](review/consulting-flight-12/public-assets-audit.json)에 기록했습니다. 이 감사는 공개 파일 전달을 확인하며 실제 브라우저 재생·스크롤·실측 FPS와 지리 정확도 검증을 포함하지 않습니다.

### 2026-09-30 revision-12a 재배포 전달 검증

v12 파일 전달 감사 이후 실제 브라우저에서 발견한 지구 완성 구도 정지 누락을 다루기 위해 `ai-pages.mjs`·`scroll-stops.mjs`를 보완하고 모듈 참조를 `revision-12a`로 갱신했습니다. 영상·포스터·로고·network-manifest는 v12와 같은 파일을 유지합니다. 새 배포 `dpl_24Wqu52YiRJP4c2Gq9C27shCpf3e`의 READY 통보 후 공개 alias만 익명 요청했습니다.

루트·index·app·AI CSS/모듈·scroll-stops·영상·포스터·로고·manifest 10개 응답의 HTTP 200·정상 MIME·전체 바이트 수·SHA256과 revision-12a 참조가 로컬과 일치합니다. 원격 manifest 전체 내용과 65,363,141 bytes 영상의 앞·뒤 1024바이트 HTTP 206·Content-Range·본문도 일치합니다. 인증·쿠키·보호 우회·개별 배포 URL·redirect는 사용하지 않았습니다. 새 결과는 [public-assets-audit-12a.json](review/consulting-flight-12/public-assets-audit-12a.json)에 저장했으며 기존 v12 보고서는 SHA256까지 그대로 보존했습니다. 이 추가 감사는 수정 파일의 공개 전달 검증이며 완성 구도 정지의 실제 브라우저 검증과 구분합니다.

### 2026-09-30 Consulting 먼 항공뷰·지구 간소화: v13 생성 원본 기록

v13은 가까운 빌딩 패널 세 장 대신 더 높은 시점의 연속 야경 한 장을 사용하기 위해 새 파노라마를 생성했습니다. 내장 `imagegen`에 실제 입력한 참조는 v12의 AI 생성 `seoul-night-center.png`이며, 기존 사용자 야경에서 이어지는 재구성 파생입니다. 소개 일러스트는 기존 `consulting-neighborhood.webp`의 떠 있는 핀을 제거한 투명 베이스로 편집해 기존 공식 핀을 별도로 연결할 수 있도록 준비합니다. 정확한 prompt·입력 인자·반환 원본 위치·입력 SHA256은 [imagegen-prompts.md](review/consulting-flight-13/imagegen-prompts.md)에 보존했습니다.

| 새 생성 원본 | 실제 치수·형식 | 실제 크기 | SHA256 |
| --- | --- | --- | --- |
| `review/consulting-flight-13/network-flight-video/assets/seoul-night-aerial-wide.png` | 2172×724 PNG RGB | 3,165,359 bytes | `f7811b72b6a8ff6a712b000eb48975cbba1fe2facb4df24c15a57a0b7bc2fa82` |
| `dist/assets/ai-refresh/consulting-neighborhood-base-v13.png` | 1536×1024 PNG RGBA | 1,972,673 bytes | `d072958aa306f77388e6f9963b8bf3ad88c96accccb4849be32300a5d3843c87` |

두 보존 파일은 도구가 반환한 생성 PNG와 전체 바이트·SHA256이 일치합니다. 야경 요청의 3840×1280과 실제 생성된 2172×724는 구분합니다. 생성 원본을 4K로 표현하지 않으며 향후 4K master는 렌더 출력 프레임 크기입니다. 생성된 원경·건물 배치·촬영 고도는 연출 의도이며 실제 촬영 정보나 현재 도시 지리의 근거가 아닙니다.

노핀 베이스는 실제 alpha 범위 0–254, bbox `[78,21,1489,960]`입니다. 완전 투명 픽셀 917,505개·부분 투명 픽셀 655,359개이며 alpha 255인 픽셀은 없습니다. 실제 관찰에서 중앙 카페 위의 떠 있는 핀이 제거되어 있습니다. 참조 편집 결과이므로 나머지 일러스트의 픽셀 완전 일치를 주장하지 않습니다.

[Toss 공식 홈페이지](https://toss.im/) 마지막 글로벌 섹션과 [공개 RotatingEarth 구현](https://static.toss.im/frontend/new.toss.im/toss-im-new/_next/static/chunks/2652.10e9730b93fb1bbe.js)은 점 지구·회전·여백의 시각 참고로 조사했습니다. Toss의 점 데이터·이미지·영상·코드를 production/composition 자산으로 복사하지 않습니다. 지리점은 기존 NASA Blue Marble 출처를, 공식 핀은 v11 파생·원본 기록을 유지합니다. 핀과 연결은 서비스 개념 연출이며 운영 국가·판매 실적·실시간 분석 결과를 뜻하지 않습니다.

현재 검증 범위는 생성 원본 이미지 헤더·바이트·SHA·alpha·반환 파일 복사 일치입니다. 최종 composition freeze와 master·웹 영상·포스터·manifest 감사, 공개 배포 HTTP/Range 감사는 완료 알림 뒤 실제 파일 기준으로 추가 기록합니다. 이전 v9·v10·v11·v12·revision-12a 자산과 감사 증거는 보존합니다.

### 2026-09-30 v13 최종 출력·로컬 자산 감사

승인된 composition의 실제 SHA256은 `43db1843adfc050c9f488433599715bc1148c0ac53aa009daee7fef5a2b9155a`이며 `index.motion.json`은 `f8819e9cfd2036bc9ccf3cdca71ebe128db13283facdf6b73525a305c201645b`입니다. `source-freeze.sha256`에 기록된 11개 소스·자산의 SHA256이 모두 일치하고 최종 `check.json`은 `ok=true`입니다. 검사·소스·렌더 자체를 감사 도구로 변경하지 않습니다.

| 최종 출력 | 실제 규격 | 실제 크기 | SHA256 |
| --- | --- | --- | --- |
| `review/consulting-flight-13/network-flight-video/renders/network-flight-master.mp4` | 3840×2160, 22초·60fps·1320프레임 | 197,715,537 bytes | `b40735ef6584cc5916afc10cca145be42b7c158720c5141d17b74c572e68eac6` |
| `dist/assets/consulting-flight/seoul-global-flight-v13.mp4` | 2560×1440, 22초·60fps·1320프레임 | 83,800,740 bytes | `9c396ccad93192a55c36501c39d151f73f48828c454bada7fed1c8c4f1335fe7` |
| `dist/assets/consulting-flight/seoul-global-poster-v13.webp` | 2560×1440 WebP | 1,085,054 bytes | `360071defd0c34adce36b39010c3c6bdb204476b21e0257d1eda71cf51083fc9` |

master·웹 영상은 무음 H.264 High·yuv420p·BT.709입니다. 웹은 GOP15·키프레임 88개·B프레임 0·PTS/DTS 일치·faststart를 확인했습니다. master는 GOP250·키프레임 6개입니다. 포스터는 승인된 웹 영상의 0초 프레임을 PNG로 추출한 뒤 Pillow WebP quality96/method6으로 형식만 변환한 파일입니다. 새 4K master의 출력 규격과 2172×724 생성 야경 원본의 실제 해상도는 구분합니다.

최종 지리점 JSON은 fixed-hash tangent disk jitter 30%를 적용한 Fibonacci 구면 샘플의 NASA 육지·빙하 색상 재판독 결과로 선언되어 있습니다. 실제 파일은 972,933 bytes·34,735점·104,205개 좌표이며 SHA256은 `657921bfdb7619fc1ce4575a4f59e9e3c4ba6e120753f6652a41e009f852034b`입니다. 출처 NASA SHA256·개수×3·좌표 유한값·선언된 sampling/jitter 파라미터의 manifest 일치를 검사했습니다. 실제 지리 투영·색상 재판독·경로 기하 정확도를 검증했다는 의미는 아닙니다.

`network-manifest-v13.json`은 실제 12,010 bytes·SHA256 `fa69085bb3171c74e24358c25756ca24f74495615ffce7072df71cf41a1e0452`입니다. 새 야경·노핀 베이스·이미지 입력·정확한 prompt 기록·공식 핀·NASA 지표·freeze 정보·출력 metadata를 기록하며 기존 v12 `network-manifest.json`을 덮어쓰지 않습니다. 선언된 흐름은 도시 0–7.8초, 전환 준비 7.8–9.5초, full-bleed 도시에서 지구 등장 9.5–11.15초, 32개 경로 확장 11.5–20초와 겹치는 16–20초 추가 카메라 후퇴, 완성 구도 유지 20–22초입니다.

[local-assets-audit.json](review/consulting-flight-13/local-assets-audit.json)에서 관련 파일 20개의 metadata·바이트·SHA256·manifest 일치, 별도 freeze 11개 SHA, MP4 packet/키프레임/faststart, 공식 PNG↔WebP RGBA·alpha, 새 노핀 alpha가 통과했습니다. 기존 v12 영상·manifest 해시도 보존되어 있습니다. 이 감사는 렌더 장면 품질·지리 정확도·브라우저 재생/스크롤·실측 FPS·공개 배포 검증을 포함하지 않습니다. 공개 READY 이후 새 버전 파일의 익명 전달 감사는 별도로 기록합니다.

### 2026-09-30 v13 공개 프로덕션 전달 검증

배포 `dpl_CrNHfJDj7q5rrfcJQrGtdkE4Wb4M`의 READY 이후 공개 [Pingdom alias](https://pingdom-landing.vercel.app/)만 익명 HTTP로 감사했습니다. 루트·index·app·AI CSS/모듈·scroll-stops·새 v13 영상·포스터·공식 핀 WebP·노핀 PNG·새 manifest의 응답 11개가 모두 HTTP 200·정상 MIME이며 전체 바이트 수·SHA256이 로컬과 일치합니다. 실제 HTML/app의 revision-13 연결과 새 영상·포스터·노핀 베이스·공식 로고 참조, 원격 `network-manifest-v13.json`의 전체 내용·version13도 일치합니다.

83,800,740 bytes 영상의 첫 1024바이트는 `bytes 0-1023/83800740`, 마지막 1024바이트는 `bytes 83799716-83800739/83800740`의 정확한 HTTP 206 Content-Range·정상 MIME·로컬 본문 일치를 확인했습니다. 결과는 [public-assets-audit.json](review/consulting-flight-13/public-assets-audit.json)(11,247 bytes, SHA256 `947d01ee2207cfa8a7fb19ced3efa4573ed0d5e437b8bb78a6b5cd24b40b0dd8`)에 기록했습니다.

공개 alias만 사용하며 인증·쿠키·보호 우회·보호된 개별 deployment URL·redirect는 사용하지 않았습니다. 원격 미디어 본문은 전체 해시 계산용으로 스트리밍하고 별도 저장하지 않았습니다. 이 결과는 파일의 공개 전달 검증이며 실제 브라우저 렌더링/재생·스크롤 정지·역스크롤·실측 FPS·지리 정확도 검증과 구분합니다. 기존 v12·revision-12a 자산과 감사 증거는 보존합니다.


### 2026-09-30 v14 바로 지구로·제품 화면 가독성

v14 Consulting은 도시 사진·건물 일러스트·도시에서 지구로 이어지는 전환을 제거했습니다. 첫 프레임부터 점 지구가 보이는 12초 구성입니다. 기존 v13 composition·도시·노핀 이미지·영상·manifest·공개 검증 증거는 보존하고, 새 sibling 영상·포스터·manifest를 사용합니다. 실제 제품 UI를 AI로 재작성하지 않았습니다.

v14 composition은 `review/consulting-flight-14/network-flight-video`입니다. 소스 SHA256은 `f2ec763e86328f3176f84af7875611e6d9577c19559ac33bb4925cba7a159147`, motion SHA256은 `5a12331cb6ff43669fd57766e5c27cc8e397c4f70b97f442067e708734a72ec3`이며 freeze의 10개 파일이 일치합니다. 최종 HyperFrames check는 `ok=true`, 오류 0개·구조 권고 2개입니다. 도시는 v14 source assets에 복사하지 않았습니다.

지구는 기존 NASA Blue Marble June 2004 지표 5400×2700와 v13의 지리점 JSON을 재사용합니다. 120,000은 선언된 Fibonacci 구면 표본 수이며, 실제 육지·빙하 점은 34,735개·104,205개 좌표입니다. JSON은 972,933 bytes·SHA256 `657921bfdb7619fc1ce4575a4f59e9e3c4ba6e120753f6652a41e009f852034b`입니다. 공식 핀 PNG는 기존 1254×1254 RGBA·SHA256 `7642f9b9f9459c4eb21ea7a9b3371ff1ead8cdbae8c940e4f2dd14e2749bcaac`이며 지구 허브로 사용합니다. NASA 출처·제작자와 기존 핀 생성 파생의 한계는 v14 `MEDIA.md`와 이전 기록을 유지합니다. Toss의 점 데이터·영상·이미지·코드는 복사하지 않습니다.

선언된 흐름은 0–1.8초 지구 드러남, 1.8–7.18초 32개 개념 경로의 순차 연결, 7.2–10.5초 추가 카메라 후퇴, 10.5–12초 완성 구도 유지입니다. 핀·위경도·경로는 향후 발견 범위를 표현하는 연출이며 현재 글로벌 운영 범위·등록 업체·판매 실적·실시간 위성 데이터를 뜻하지 않습니다.

| 최종 출력 | 실제 규격 | 실제 크기 | SHA256 |
| --- | --- | --- | --- |
| `review/consulting-flight-14/network-flight-video/renders/network-flight-master.mp4` | 3840×2160, 12초·60fps·720프레임 | 65,430,843 bytes | `cc0888a5c175c8378a004678d42420275c3fbfdeabec9f2f2ebcb63f229feb0d` |
| `dist/assets/consulting-flight/seoul-globe-flight-v14.mp4` | 2560×1440, 12초·60fps·720프레임 | 25,437,581 bytes | `e442a85f6f0499ae1652065f7f538fd433d00dd911bfce175a84cf3f0dd361c6` |
| `dist/assets/consulting-flight/seoul-globe-poster-v14.webp` | 2560×1440 lossless WebP | 1,152,698 bytes | `e9545f03b2af151cfc274d2d58d559dcc8eadfff9447e1f1dc7a0da90d202258` |

두 영상은 무음 H.264 High·yuv420p·BT.709·B프레임 0·PTS/DTS 일치·faststart입니다. 웹은 GOP15·키프레임 48개, master는 GOP250·키프레임 3개입니다. 포스터는 master의 11초 프레임 660을 디코딩한 PNG를 Lanczos로 2560×1440에 변환한 뒤 lossless WebP로 저장했습니다. 변환 후 RGB 픽셀과 WebP 디코딩 픽셀이 정확히 일치합니다. 추가 문자·UI·장면을 합성하지 않았습니다. 4K는 master 출력 규격이며 제품 화면 원본의 상세 정보를 더 생성했다는 의미가 아닙니다.

제품 목업은 기존 1800×3680 native 앱 PNG와 lossless WebP를 유지합니다. 전환 중 두 전체 기기를 함께 표시하지 않도록 exclusive opacity로 바꾸고, 원본에 이미 있는 기기 프레임 외의 CSS 측면 프레임을 제거했습니다. 이름·주소·연락처의 기존 지정 블러는 유지합니다. 사진 두 영역은 기존 소개용 생성 카페·골목 사진을 DOM overlay로 표시하며 native UI 파일의 픽셀을 수정하지 않습니다. 이 소개 사진은 실제 등록 장소를 촬영한 증거가 아닙니다. 원본·native의 디코딩 RGBA 정확한 일치를 재검증했습니다.

상점주 화면은 원본 전체 이미지의 확대 카메라 대신 아래 두 실제 UI crop를 직접 표시합니다. UI 문구·색·폼·아이콘을 다시 그리거나 resize하지 않았고, 원본 crop와 WebP 디코딩 RGBA가 전 픽셀 일치합니다.

| 제품 crop | 원본 LTRB 좌표 | 출력 | SHA256 |
| --- | --- | --- | --- |
| `desktop-polish/merchant-register-focus-v14.webp` | `merchant-register.png` 1864×1004, `[506,196,1606,792]` | 1100×596, 37,672 bytes | `1af8cc9835a9a72e5eafd7ea4acd4794a08a457c586b87822b543ea2d6347e5e` |
| `desktop-polish/merchant-event-focus-v14.webp` | `merchant-event.png` 1864×1003, `[506,196,1606,830]` | 1100×634, 14,982 bytes | `2fdf3e82e6e7609242c566a18983135478e5749d465f5d39139185c22995bbbb` |

표시 frame은 최대 1100×634이며 등록 이미지는 위아래 19px 흰 여백으로 원래 비율을 유지합니다. 정착 이후 transform을 제거하고 내부 border 대신 outline을 사용하여 DPR 1의 1100px 표시에서 내부 native 픽셀 폭을 유지합니다. `cameraScale`은 전체 구간 1이며 등록·이벤트 opacity는 겹치지 않는 흰 화면 전환입니다. 더 높은 DPR에서 없는 원본 디테일을 무한히 복구한다는 주장은 하지 않습니다. 조사와 정확 crop 검증은 [product-native-audit.md](review/consulting-flight-14/product-native-audit.md), [merchant-focus-assets-audit.json](review/consulting-flight-14/merchant-focus-assets-audit.json)에 기록합니다.

새 `network-manifest-v14.json`은 15,434 bytes·SHA256 `a112cef303f76608c0afe17cdc2bcd127eacc153d731b8c12560990d6de6854b`입니다. 실제 소스·출력·NASA·공식 핀·포스터 변환·제품 crop·소개 사진·revision-14 runtime 9개 파일의 metadata를 기록합니다. [local-assets-audit.json](review/consulting-flight-14/local-assets-audit.json)에서 관련 파일 35개와 별도 freeze 10개의 해시, MP4 packet/키프레임/faststart, 포스터 lossless 변환 픽셀, 공식 PNG/WebP RGBA·alpha, 제품 native/crop RGBA, 지리점의 출처 hash·개수×3·유한값·선언 필드가 통과했습니다. 지리 투영·경로 정확도·장면 품질·브라우저 동작·실측 FPS·공개 전달 검증은 이 파일 감사에 포함되지 않습니다. 공개 READY 이후 익명 HTTP/Range 결과는 별도로 추가합니다.


### 2026-09-30 v14 공개 프로덕션 전달 검증

배포 `dpl_AvjdQKxNCR5jgkkWKbs8CDQWRWqs`의 READY 후 공개 [Pingdom alias](https://pingdom-landing.vercel.app/)만 익명 HTTP로 감사했습니다. 루트·index·app·AI/visit/commercial CSS·desktop-motion/polish/AI/scroll-stops 모듈·새 영상·포스터·공식 로고 WebP·등록/이벤트 crop·장소 native·소개 사진 두 개·manifest의 응답 19개 모두 HTTP 200·정상 MIME이며 전체 바이트 수·SHA256이 로컬과 일치합니다. revision-14와 새 활성 자산 참조 22개, 원격 manifest 전체 JSON·version14·출력 metadata도 일치합니다. Consulting HTML에 이전 도시 영상과 건물 베이스의 참조가 없음을 확인했습니다.

25,437,581 bytes 영상 앞 1024바이트는 `bytes 0-1023/25437581`, 뒤 1024바이트는 `bytes 25436557-25437580/25437581`의 정확한 Content-Range·HTTP 206·정상 MIME·로컬 본문 일치를 확인했습니다. [public-assets-audit.json](review/consulting-flight-14/public-assets-audit.json)은 17,598 bytes·SHA256 `616d9f85bb0c079a4f55db688d9d260ce7f7c8ed52e6ecf326e3637f61ea2c52`입니다.

공개 alias만 사용했으며 쿠키·인증·보호 우회·보호된 개별 deployment URL·redirect는 사용하지 않았습니다. 원격 영상·이미지 본문은 해시 계산을 위해 스트리밍했으며 별도로 저장하지 않았습니다. 이 감사는 공개 파일 전달·MIME·바이트/해시·활성 참조·Range를 검증하고 실제 브라우저 구도/재생·빠른 스크롤·역방향·실측 FPS·지리 정확도 검증과 구분합니다. 이전 v13 및 앞선 공개 감사 증거는 보존합니다.


### 2026-09-30 revision-14.1 상점주 첫 정지 경계 보완·재배포

첫 상점주 정지 지점의 실제 진행도가 약 0.19997이면 화면 표시는 0.2000이어도 `p>=.20` 정착 판정이 거짓일 수 있었습니다. `desktop-polish.mjs`의 정착 기준을 `p>=.19`로 보완했습니다. index의 app와 app의 desktop-polish 참조만 `revision-14.1`로 갱신하고 나머지 모듈·CSS는 `revision-14`를 유지합니다. HTML·app·desktop-polish 3개 runtime 파일만 바뀌며 영상·포스터·제품 crop·그 밖의 제작 source는 동일합니다.

처음 배포된 15,434-byte manifest는 `review/consulting-flight-14/network-manifest-v14-initial.json`에 SHA256 `a112cef303f76608c0afe17cdc2bcd127eacc153d731b8c12560990d6de6854b` 그대로 보존했습니다. 현재 `dist/assets/consulting-flight/network-manifest-v14.json`은 runtime snapshot 9개와 혼합 cache graph·보완 이유를 반영한 16,360 bytes·SHA256 `d23cb617e3ae46e3236e79ffd82c12c3e8cf370404568f2f7d9ff58e0f5999fd`입니다. 실제 변경 범위와 영상 불변 검사는 [runtime-manifest-refresh-v14-1.json](review/consulting-flight-14/runtime-manifest-refresh-v14-1.json), 관련 파일 35개의 갱신된 로컬 감사는 [local-assets-audit-14-1.json](review/consulting-flight-14/local-assets-audit-14-1.json)에 기록합니다. 초기 로컬·공개 보고서는 덮어쓰지 않았습니다.

최종 배포 `dpl_3nKbxCCP93Kqv3vkN9XncTfxrTrf`의 READY 이후 공개 alias에서 19개 응답을 익명으로 다시 확인했습니다. 모든 HTTP 200·정상 MIME·전체 바이트 수·SHA256, 실제 혼합 cache graph와 활성 참조 22개, 원격 manifest 전체 JSON·runtime `revision-14.1`이 일치합니다. 첫 배포 대비 바뀐 응답은 루트·index·app·desktop-polish·manifest뿐이며 미디어·crop·나머지 전달 자산의 해시는 같았습니다. 25,437,581 bytes 영상의 앞뒤 1024바이트 HTTP 206·Content-Range·본문도 정확히 일치합니다.

증거 [public-assets-audit-14-1.json](review/consulting-flight-14/public-assets-audit-14-1.json)은 18,020 bytes·SHA256 `03188512a2782e30bb9b885e0549e228e21bc7714680775d2f7c75ec9afc7075`입니다. 첫 v14 공개 보고서의 SHA256 `616d9f85bb0c079a4f55db688d9d260ce7f7c8ed52e6ecf326e3637f61ea2c52`도 그대로 보존했습니다. 보호된 개별 배포 URL·인증·쿠키·우회·redirect는 사용하지 않았으며 이 감사 범위는 공개 파일 전달이고 실제 정지/구도/재생·실측 FPS 검증과 구분합니다.


### 2026-09-30 revision-14.1 실제 공개 브라우저 동작

최종 공개 alias의 1766×982·DPR 1 확인에서 첫 상점주 정지는 진행도 표기 0.2000·`merchantSettled=true`·frame 1100×634·`transform:none`입니다. 등록/이벤트 opacity는 각각 1/0이며 가로 overflow는 0입니다. [merchant-first-stop-final.json](review/consulting-flight-14/merchant-first-stop-final.json)과 대응 PNG에 기록합니다.

[browser-states.json](review/consulting-flight-14/browser-states.json)의 공개 Consulting 상태는 건물 모델 0·2560×1440 영상·readyState 4·overflow 0입니다. 빠른 스크롤로 network와 global 정지에 도달했고 영상 시간 7.178741초→11.898053초, 역방향 9.385062초를 확인했습니다. 담당 브라우저 검증의 warning/error console은 빈 배열이었으며 `globe-*-public.png`에 실제 구도를 남겼습니다. 파일 전달 감사와 별도로 해당 PC viewport의 브라우저 동작을 확인한 결과이고, 실측 FPS나 다른 viewport 검증을 의미하지 않습니다.

### 2026-09-30 v15 제품 UI 5개 재제작·원래 소개 흐름 복원

v15는 앱 안의 사진만 교체하는 작업이 아니라 **앱 UI 3개와 상점주 웹 UI 2개 전체를 고해상도로 다시 제작한 변경**입니다. 기존 화면의 기능·구조를 기준으로 글자·아이콘·입력창·선·프레임을 코드로 새로 그렸습니다. v14의 원본 native 화면과 no-resize crop, 이전 생성 사진·영상·manifest·검증 증거는 보존하며 새 `assets/product-hq-v15/` sibling 자산을 사용합니다. 새 UI를 기존 screenshot의 픽셀과 완전히 동일한 원본 캡처로 표현하지 않습니다.

| 재제작 UI | 실제 웹 표시 자산 | 실제 raster 크기 | 제작 방식 |
| --- | --- | --- | --- |
| 장소 상세 | `app-place-hq-v15.webp` | 2250×4600 RGBA | 코드-native SVG, 글자 path, 단일 기기 프레임 |
| 예약 | `app-booking-hq-v15.webp` | 2250×4600 RGBA | 코드-native SVG, 글자 path, 단일 기기 프레임 |
| 방문 기록/프로필 | `app-profile-hq-v15.webp` | 2250×4600 RGBA | 코드-native SVG, 글자 path, 단일 기기 프레임 |
| 상점주 장소 등록 | `merchant-register-v15.webp` | 7456×4016 RGB | 원본 1864×1004 좌표 기준 SVG/text/shape 및 4× 새 raster |
| 상점주 이벤트 관리 | `merchant-event-v15.webp` | 7456×4016 RGB | 원본 전체 UI 기준 SVG/text/shape 및 4× 새 raster |

표의 경로는 모두 `dist/assets/product-hq-v15/` 아래입니다. 앱 세 자산은 같은 이름의 `.svg`·`.png`도 보존하며, 편집 가능한 text 단계 SVG와 생성 코드는 `review/consulting-flight-15/phone-ui-src/`에 남깁니다. 실제 배포 SVG의 글자는 기존 Pretendard 폰트를 shaping한 path이며, PNG와 lossless WebP의 RGBA 일치를 제작 감사에서 확인했습니다. 기기 프레임은 UI 자산 안에 한 번만 그렸습니다. 새 앱 전체 UI 자산을 기존 저해상도 화면 위에 사진만 덧대는 방식으로 설명하지 않습니다.

상점주 참고 원본의 실제 크기는 등록 1864×1004, 이벤트 1864×1003이며 재제작 지면은 두 화면 모두 1864×1004 좌표로 통일했습니다. 각 `.svg`와 생성 코드를 `review/consulting-flight-15/merchant-ui-src/`에 보존합니다. SVG에 기존 Pretendard가 내장되어 있고 로고는 공식 wordmark의 alpha 윤곽을 기준으로 재제작했습니다. 기존 빈 폼·필드·카피·색상 구성을 참고하며 기존 screenshot bitmap을 SVG에 포함하거나 확대하지 않았습니다. 지도는 원본 시청 UI의 도로/공원/기존 라벨을 참고한 정적 벡터 지면이며 모든 미세 도로의 정확한 지리 복원이나 실제 지도 서비스 화면을 주장하지 않습니다.

원래 상점주 흐름인 전체 등록 화면 → 등록 상세 확대 → 전체 이벤트 화면을 복원했습니다. 기존 `.20/.50/.86` 읽기 지점과 카피·section·스크롤 정지 계약을 유지합니다. 등록 상세는 원본 `[506,196,1606,792]` 패널을 기준으로 최대 `1864/1100 = 1.694545`배 확대합니다. 확대된 레이아웃 크기에서 새 고밀도 이미지를 다시 표시하고 카메라는 pure translate로 중심을 맞춥니다. 작은 CSS 합성 레이어를 먼저 rasterize한 뒤 확대하는 방식으로 되돌리지 않았습니다.

### 소개 사진 4개

`photo-cafe-v15.png`, `photo-street-v15.png`, `photo-concert-v15.png`, `photo-popup-v15.png`는 내장 imagegen으로 제작한 실제 **1536×1024 RGB** 사진형 자산입니다. 각각 카페 실내·외부 골목·공연장·팝업 공간을 표현하며 앱 UI 안의 사진 재료로 사용합니다. 실제 등록 장소·행사·방문자 사진이나 서비스 이용 사실의 증거가 아닙니다. UI의 글자/필드/프레임은 생성 사진에 포함시키지 않고 코드로 별도 제작했습니다. 생성 사진 해시와 사용 영역은 [phone-assets-audit.json](review/consulting-flight-15/phone-ui-src/phone-assets-audit.json), [final-photo-map.json](review/consulting-flight-15/phone-ui-src/final-photo-map.json)에 기록합니다.

### Consulting 소개 복원·직접 지구 연결

Consulting은 기존 노핀 3D 동네 모델 `assets/ai-refresh/consulting-neighborhood-base-v13.png`(1536×1024 RGBA)와 공식 핀 `assets/consulting-flight/pingdom-pin-clean.webp`(1254×1254)을 같은 소개 layer에 복원했습니다. 두 자산을 새로 생성하거나 수정하지 않았습니다. 모델과 핀은 함께 최대 **1.4배**만 확대되며 이후 기존 v14 지구 영상으로 직접 연결합니다. 도시·야경 사진이나 도시 비행 영상은 복원하지 않았습니다.

영상/포스터는 기존 `seoul-globe-flight-v14.mp4`·`seoul-globe-poster-v14.webp`를 재사용합니다. 새 영상 렌더는 없습니다. 기존 12초·60fps·32개 개념 경로·추가 카메라 후퇴와 NASA/공식 핀 출처는 v14 제작 기록을 유지합니다. 소개 모델의 핀과 지구 연결선은 서비스 개념과 확장 목표를 표현하며 실제 업체 위치·운영 국가·실적·실시간 분석 결과를 뜻하지 않습니다.

### v15 검증 상태

상점주 직접 관련 검사 30개가 통과했고 소스·자산 freeze 9개 SHA를 확인했습니다. 담당 Consulting의 직접 관련 검사 13개 통과 결과는 [runtime-QA.md](review/consulting-flight-15/runtime-QA.md)에 기록되어 있습니다. 앱 자산의 실제 크기·글자 path·단일 프레임·PNG/WebP RGBA 일치·사진 출처는 앱 제작 감사, 상점주 자산 크기·재제작 방식·freeze는 [merchant UI QA](review/consulting-flight-15/merchant-ui-src/QA.md)와 manifest를 근거로 합니다. 전체 테스트를 실행했다는 의미는 아닙니다.

**최종 완료 (2026-10-01 KST):** 로컬·공개 1331×982에서 앱3개·merchant3개·Consulting4개 구도 및 역스크롤을 실제 native 입력으로 확인했습니다. 기록 구도 overflow0, console warning/error0. 배포 READY `dpl_7iSaGijxTfyqpfbot9piVn9c8k4D` / revision-15. 익명 공개 HTTP19개200·MIME·bytes/SHA와 영상64KiB Range206이 로컬과 일치했습니다. [최종 QA](review/consulting-flight-15/QA.md), [공개 감사](review/consulting-flight-15/report.md), [제작 사양·저장 경로](review/consulting-flight-15/imagegen-prompts.md)에 증거를 보존합니다. 모바일·다른 브라우저·실기기 성능 검증은 별도 범위입니다.

## v17 첨부 원본 전체 앱 화면

현재 앱 기능 소개의 활성 자산은 `dist/assets/product-hq-v17/` 아래의 다음 5개입니다. 이전 v15 자산과 제작 이력은 보존합니다.

| 기능 | 사용자 원본 | 원본 해상도 | 활성 WebP |
| --- | --- | --- | --- |
| 장소 정보 | P1.png | 1608×3496 | app-place-hq-v17.webp |
| 커뮤니티 | P2.png | 1608×3496 | app-community-hq-v17.webp |
| 방문 검증 | P3.png | 1608×3512 | app-verification-hq-v17.webp |
| 예약 | ㅖ4.png | 1608×3496 | app-booking-hq-v17.webp |
| 여행 기록 | P5.png | 1608×3496 | app-profile-hq-v17.webp |

각 파일은 2250×4600 lossless WebP이며 같은 이름의 PNG와 SVG를 보존합니다. 단일 코드 프레임의 화면 영역은 450×920 좌표계에서 `[24,23,402,874]`입니다. SVG의 이미지 embed는 첨부 PNG와 바이트가 일치하며 원본 UI·사진·글자를 그대로 유지합니다. 비율을 유지한 meet 배치 후 물리적인 둥근 화면 모서리와 island만 적용합니다. 별도 상태줄을 덧그리지 않습니다. 검증 화면은 원본 비율 차이로 양쪽 약 0.916 SVG px 여백이 있습니다.

PNG와 WebP의 전체 decoded RGBA, SVG 출력의 모든 보이는 픽셀 및 alpha가 일치합니다. libwebp가 선택하는 완전 투명 픽셀의 RGB만 PNG에도 맞췄으며 보이는 픽셀 변경은 없습니다. 투명 모서리와 반투명 프레임 경계도 검사했습니다. 최대 340 CSS px 기기 폭에서 실제 원본 UI 기준 5.294배, 검증 화면 5.318배의 해상도로 최소 2배 조건을 충족합니다.

실제 bytes·SHA256·원본 출처·해상도는 [manifest](dist/assets/product-hq-v17/manifest.json), 원본과 제작 코드 및 30개 파일 동결은 [제작 기록](review/app-features-17/phone-ui-src/README.md)과 [freeze](review/app-features-17/phone-ui-src/phone-assets-freeze.json)에 보존합니다. 화면 내용은 사용자가 제공한 앱 소개 자료이며, 새로 생성한 장소 사진으로 설명하지 않습니다. 공개 파일 전달과 PC 화면 검증은 [최종 QA](review/app-features-17/QA.md)에서 제작 감사와 구분합니다.

revision18은 위 v17 자산을 그대로 사용합니다. 목업의 상시 3D 변형과 전체 이미지 필터를 제거해 정면에서 선명하게 표시하는 CSS 수정입니다. 자산 재생성·업스케일·재인코딩은 하지 않았으며, 직접 원본 PNG와 단일 프레임을 분리한 후보는 review/app-quality-18/native-candidate-assets/에 비교 증거로만 보존하고 배포하지 않습니다. [자산 원인 감사](review/app-quality-18/asset-diagnosis.md)에 실제 원본 크기 렌더 일치와 비교의 한계를 기록합니다.

## revision19 강점 카드

카드 안의 지도·핀·정보 패널·태그·달력·게시글·상점주 패널은 `index.html`의 HTML/SVG와 `strengths.css`로 작성한 기능 설명용 예시입니다. 앱 스크린샷을 확대하거나 새 래스터 UI 파일을 만들지 않았습니다. 배경 사진은 기존 `product-hq-v15/photo-cafe-v15.png`, `photo-street-v15.png`를 재사용합니다. 문구는 현재 페이지의 앱·AI·상점주 기능을 근거로 하며 매출·신뢰도·경쟁 우위 수치를 주장하지 않습니다.

## revision20 강점 카드 재디자인

`#strengths`의 작은 사진·여러 겹의 UI 패널을 제거하고 여섯 카드를 하나의 큰 사진 장면으로 구성했습니다. 현재 사진은 `dist/assets/strengths-v20/`의 `discovery-cafe`, `context-shop`, `proof-gallery`, `booking-dinner`, `neighborhood-walk`, `business-owner` 각각의 `-v20.png` 파일입니다. 모두 내장 imagegen으로 새로 제작한 1024×1536 PNG이며 원본을 확대·재인코딩하지 않았습니다. 실제 장소·이용자·방문 기록의 촬영 증거가 아닌 기능 소개용 사진입니다.

스크롤 장면의 카드 폭은 PC 최대 460 CSS px로 원본 가로 픽셀 기준 최소 약 2.22배이며, 카드 비율에 맞춰 `object-fit: cover`로 표시합니다. 실제 PC 검사 viewport의 표시 해상도는 QA에 별도 기록합니다. 글자·핀·기능 표시는 HTML/SVG/CSS로 렌더링하고 사진에 굽지 않습니다. 카드당 단일 사진과 한 기능의 표시를 사용하며 기존 앱 자산·Consulting 모델·지구 영상은 이번 변경 범위에 포함하지 않습니다.

[사진 manifest](dist/assets/strengths-v20/manifest.json), [생성 프롬프트 4개](review/strengths-20/photography-prompts.json), [생성 프롬프트 2개](review/strengths-20/photography-pair-prompts.json)와 [배포 freeze](review/strengths-20/deployment-freeze.json)에 출처·실제 크기·bytes·SHA를 보존합니다. revision19 구성과 자산은 제작 이력으로 보존합니다.

## revision21 카드 정리 및 지구 영상

사진 6개는 revision20 원본을 그대로 사용합니다. 첫 카드의 AI 로고는 기존 공식 `assets/pingdom-ai-symbol-source.png`의 회색 배경을 기존 SVG 색상 행렬로 투명하게 표시한 꽃 심볼입니다. 사진이나 원본 로고 파일의 픽셀을 수정하지 않았습니다. 예약 완료 패널과 카드 제목은 native HTML/SVG이며 실제 예약 발생을 나타내는 증거가 아닌 소개용 예시입니다.

지구 영상은 `assets/consulting-flight/korea-global-flight-v21.mp4`입니다. 첫 한국 장면은 `korea-globe-poster-v21.webp`, 영상 오류·동작 줄이기 설정의 최종 세계 구도는 `global-globe-poster-v21.webp`로 구분합니다. 기존 NASA 지표를 재사용하고 한국 주변의 고밀도 지표 점을 추가해 같은 구면을 연속 촬영합니다. 연결선은 핑덤의 글로벌 목표를 설명하는 개념 경로입니다. 제목은 영상에 굽지 않고 HTML로 표시합니다.

최종 v21 웹 영상은 2560×1440·60fps·12초·720프레임, H.264 High·CRF18·GOP12·무B프레임·faststart·무음이며 74,204,601 bytes입니다. 두 포스터는 같은 2560×1440 무손실 WebP입니다. 3840×2160·60fps master는 review에만 보존합니다. 기존 프로젝트는 유지하고 새 제작 프로젝트의 HyperFrames를 0.8.96에서 0.8.99로 갱신했습니다. 원본·NASA 지표·공식 핀 출처와 실제 출력 해시는 `network-manifest-v21.json`, 검증은 [영상 QA](review/revision-21/globe-film/QA.md)에 기록합니다.

revision21 READY 후 공개 alias의 freeze 20개 파일은 익명 HTTP 200·MIME·전체 bytes/SHA256 일치, 영상 앞/뒤 1024 bytes는 정확한 HTTP 206·Content-Range·본문 일치입니다. 기록은 [공개 감사](review/revision-21/public-assets-audit.json), 실제 PC 화면 검증은 [QA](review/revision-21/QA.md)에 분리합니다.

## revision22 지구의 선과 지도 밀도 개선

활성 지구 매체는 `korea-global-flight-v22.mp4`, `korea-globe-poster-v22.webp`, `global-globe-poster-v22.webp`입니다. v21의 NASA 지표·공식 핀·카메라·32개 구면 경로 중심선·12초 타이밍은 유지했습니다. 새 영상에서 경로는 월드 단위 튜브 대신 화면 폭을 계산하는 ribbon으로 표시하므로 한국 확대 때도 함께 굵어지지 않습니다. 출력 2560×1440 기준 경로 폭은 0.8px, 이동점은 1.5px, 도착점은 2px이며 실제 페이지의 표시 배율에 따라 함께 축소됩니다.

한국 주변 점은 같은 NASA 원본에서 고정된 미세 분산으로 다시 표본을 뽑아 75,256개에서 15,151개로 줄였습니다. 한국은 주변보다 밝게 구분하고 세계 점·격자·이동점의 밝기를 낮췄습니다. 경로는 핑덤의 글로벌 목표를 표현하는 개념선이며 실제 운영 국가나 실시간 데이터가 아닙니다.

웹 영상은 2560×1440·60fps·12초·720프레임, H.264 High·CRF18·GOP12·무B프레임·faststart·무음이며 33,503,121 bytes입니다. 두 포스터도 같은 해상도의 무손실 WebP입니다. 3840×2160·60fps master와 v21 원본은 review에 보존합니다. 실제 자산 해시는 `network-manifest-v22.json`, 제작·형상 보존 검증은 [영상 QA](review/revision-22/globe-film/QA.md), 페이지 확인은 [revision22 QA](review/revision-22/QA.md)에 기록합니다.

revision22 READY 후 공개 alias의 freeze 12개 파일은 익명 HTTP 200·MIME·전체 bytes/SHA256 일치, MP4 앞·뒤 Range는 HTTP 206·Content-Range·본문 일치입니다. [공개 감사](review/revision-22/public-assets-audit.json)에 실제 runtime revision-19/21과 새 v22 매체가 함께 연결되는 것을 기록합니다.

## revision24 선으로 표현한 지구와 브랜드 네트워크

활성 매체는 `korea-global-flight-v24.mp4`, `korea-globe-poster-v24.webp`, `global-globe-poster-v24.webp`입니다. v23 입자 강화 시안은 활성화하지 않고 보존합니다. v24는 지표 입자 renderer를 제거하고 실제 해안선과 30° 간격 위도·경도선으로 지구를 표시합니다. 공식 핀·카메라·32개 개념 경로·12초 타이밍은 유지합니다.

해안선은 Natural Earth 공식 public-domain coastline 원본에서 제작했습니다. 세계 50m에서 동아시아 영역을 제외한 60,869개 정점과 동아시아 10m의 17,482개 정점을 함께 사용해 윤곽선 중복을 막습니다. 원본 ZIP·버전·SHA256·약관·좌표 처리와 한국/제주 윤곽 확인은 [geometry 출처](review/revision-24/coastline-geometry/README.md), [manifest](review/revision-24/coastline-geometry/manifest.json)에 보존합니다. 이전 NASA 원본과 제작 이력은 삭제하지 않습니다.

연결선은 기존 페이지의 `--pink:#FF1956`을 사용하며 2560×1440 출력 기준 1.7px입니다. 해안선은 세계 1.1px/동아시아 1.2px의 청백색, 격자는 약 0.67px의 낮은 대비로 구분합니다. 한국 핀 주변 25px에서는 선의 중첩 대비만 부드럽게 낮춥니다. 이 경로들은 글로벌 목표를 표현하는 개념 연출입니다.

웹 영상은 H.264 High·2560×1440·60fps·12초·720프레임·CRF18·GOP12·무B프레임·faststart·무음이며 18,171,668 bytes입니다. 두 포스터는 같은 해상도의 lossless WebP이고 4K60 master는 review에 보존합니다. 실제 bytes/SHA·source 보존·압축 프레임·포스터 일치 검증은 [제작 감사](review/revision-24/globe-film/asset-audit-final.json), 활성 자산 metadata는 `network-manifest-v24.json`에 기록합니다.

revision24 READY 후 공개 alias의 freeze 12개 파일, 19,325,695 bytes 모두 익명 HTTP 200·MIME·전체 SHA256이 일치합니다. MP4 앞·뒤 1024 bytes의 HTTP 206·Content-Range·본문도 일치합니다. [공개 감사](review/revision-24/public-assets-audit.json)와 [실제 페이지 QA](review/revision-24/QA.md)를 구분합니다.

## revision25 독립 글로벌 비전

새 raster 자산을 제작하거나 영상을 다시 인코딩하지 않았습니다. 기존 공식 `assets/consulting-flight/pingdom-pin-clean.webp`를 독립 비전 장면에 재사용하고, CSS 원형 경계가 같은 한국 핀 위치에서 펼쳐지며 기존 v24 지구 영상으로 이어집니다. MP4·한국/세계 포스터·network-manifest-v24.json의 bytes/SHA256 및 강점 카드 자산을 그대로 보존합니다. [매체 보존](review/revision-25/media-preservation.json), [공개 자산 감사](review/revision-25/public-assets-audit.json), [검증 범위](review/revision-25/QA.md).

## revision26 강점 카드 사진 2개 추가

`dist/assets/strengths-v26/travel-journal-v26.png`와 `dist/assets/strengths-v26/consulting-cafe-v26.png`는 built-in imagegen으로 새로 제작한 1024×1536 PNG입니다. 여행 기록과 영업 전 매장 준비를 표현하는 소개용 사진이며 실제 장소나 방문 기록을 뜻하지 않습니다. [생성 프롬프트](review/revision-26/image-prompts.json), [8개 사진 통합 metadata](dist/assets/strengths-v26/manifest.json).

기존 v20 사진 6개와 v24 지구 매체는 bytes/SHA256을 보존합니다. 새 사진은 공개 PC 표시 크기 399.30×579.38 대비 최소 2.56배 해상도이며, 여행 달력·상담 조건 UI는 raster 사진에 합성하지 않고 HTML/CSS/SVG로 렌더링합니다. [공개 감사](review/revision-26/public-assets-audit.json), [범위 보존](review/revision-26/scope-preservation.json), [QA](review/revision-26/QA.md).

## revision27 상점주 웹 모션

사용자가 제공한 토스 화면 녹화는 움직임 분석용으로 `review/revision-27/reference/`에 프레임을 추출했습니다. 참조 영상·추출 프레임은 공개 사이트 자산에 포함하지 않습니다. 사이트의 상점주 등록·이벤트 화면은 기존 `assets/product-hq-v15/merchant-register-v15.webp`, `merchant-event-v15.webp`(각 7456×4016)를 유지합니다.

새 영상·이미지·라이브러리는 추가하지 않았습니다. `desktop-polish.mjs`가 스크롤 위치에서 외곽 진입·설명 이동·화면 교체 상태를 계산하고 `commercial-v2.css`가 표시합니다. index/app/polish/commercial의 변경 참조는 revision27이며 웹 원본과 다른 섹션의 자산 참조는 유지합니다. 관련 파일의 공개 전달 해시는 `review/revision-27/release-freeze.json` 및 `public-assets-audit.json`에 기록합니다.

## revision28 큰 지구 종료 매체

글로벌 활성 영상은 `assets/consulting-flight/korea-global-flight-v28.mp4`, 최종 정적 복구는 `global-globe-poster-v28.webp`입니다. 한국 진입과 새 소개 지도는 기존 `korea-globe-poster-v24.webp`를 재사용합니다. v24 원본·매체는 보존합니다.

새 영상은 기존 3840×2160 master의 [0,7.2) 구간에서 변환한 2560×1440·60fps·432프레임·무음 H.264 High/CRF18/GOP12/B0/yuv420p/faststart이며 10,809,575 bytes입니다. 이후 pullback 구간은 포함하지 않습니다. runtime 종료는 7.184초이며 최종 frame431의 PTS는 7.183333초입니다. 최종 lossless WebP는 614,278 bytes이며 새 영상의 해당 프레임과 RGB 픽셀이 일치합니다.

32개 브랜드색 연결선은 종료 때 모두 그려집니다. 마지막 목적지 점의 fade는 원본에서 7.43초에 끝나므로 이 컷에는 완전한 fade 구간이 포함되지 않습니다. 기존 Natural Earth 해안선·공식 핀 출처와 글로벌 목표를 나타내는 개념 경로의 의미를 유지합니다. 실제 운영 국가·실적을 뜻하지 않습니다.

활성 세 매체의 bytes/SHA와 codec·프레임 경계는 `global-flight-manifest-v28.json`, 제작 검증은 `review/revision-28/media/asset-audit-final.json`에 기록합니다. 원본 composition의 새 렌더나 CLI 버전 변경은 없습니다. 공개 전달 검증은 [revision28 QA](review/revision-28/QA.md)와 freeze/공개 감사 기록을 구분합니다.

## revision29 흰 글로벌 연결선

v24의 별도 source 사본 `review/revision-29/globe-film`에서 동일한 32경로·해안선·공식 핀을 보존하고 흰 route/endpoint/signal과 최종 거리 4.3을 기존 전환에 통합했습니다. 4K·60fps 원본을 2560×1440·60fps·7.2초/432프레임 H.264 High/CRF18/GOP12/B0/faststart로 출력했습니다.

활성 영상은 `assets/consulting-flight/korea-global-flight-v29.mp4`이며 같은 영상의 프레임0/431을 lossless로 저장한 `korea-globe-poster-v29.webp`/`global-globe-poster-v29.webp`를 사용합니다. 핀은 #FF1956, 연결선은 #FFFFFF이며 폭은 웹 2K 기준 1.7px입니다. 종료 7.184초는 frame431의 PTS7.183333을 표시합니다.

출처·명령·SHA·해상도·poster 픽셀 일치 검증은 `global-flight-manifest-v29.json`과 `review/revision-29/globe-film/asset-audit-final.json`에 기록했습니다. v24/v28 원본을 보존했습니다.
