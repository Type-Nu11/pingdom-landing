# Assets

- `dist/assets/*-preview.webp`: 앱 PNG 원본을 너비 960px로 축소한 미리보기입니다. 확대 모달에서는 원본 PNG를 사용합니다.
- `dist/assets/pingdom-portal-lossless.webp`, `ai-places-triptych-lossless.webp`: 같은 이름의 PNG와 해상도·RGBA 픽셀이 동일한 무손실 표시용 파일입니다.
- `dist/assets/pingdom-sans.woff2`: Pretendard에서 현재 사이트 문구만 추출하고 예약 이름을 사용하지 않도록 내부 이름을 PingdomSans로 변경한 가변 글꼴 서브셋입니다. 원본의 SIL Open Font License를 따르며 원본과 라이선스를 함께 보관합니다. [OFL 웹폰트 이름 안내](https://openfontlicense.org/webfonts-and-reserved-font-names/)에 따라 저작자·라이선스 메타데이터도 보존합니다.
- 위 최적화 자산은 `scripts/optimize-assets.py`로 재생성합니다. 문구 변경 시 글꼴도 함께 다시 생성해야 합니다.

- `dist/assets/app-*.webp`, `web-*.webp`, `team-*.webp`: 사용자 제공 타입널 포트폴리오 PDF의 실제 화면 및 최초 팀 프로필 이미지.
- `dist/assets/pretendard-variable.woff2`: Pretendard 1.3.9. SIL Open Font License. 라이선스는 같은 폴더의 Pretendard-LICENSE.txt.
- `dist/assets/pingdom-pin.png`: 이 프로젝트를 위해 내장 ImageGen으로 생성한 메인 비주얼. 공식 로고를 대체하지 않는 장식용 장소 핀.

## ImageGen prompt

Use case: stylized-concept. Asset type: premium landing page hero for Pingdom, a Korea local discovery platform. Create a single monumental sculptural 3D location/map pin made of liquid polished metal and translucent glass, in the style of premium futuristic digital design studio campaign imagery. The recognizable teardrop location-pin silhouette has a large hollow circular center, thick elegantly twisted soft contours with sinuous flowing folded surfaces, tilted in 3/4 perspective 15 degrees to the right. Highly reflective obsidian chrome with vivid hot magenta #ff176b highlights and deep violet iridescent reflections, a few beautiful bright white specular edges. Dramatic studio lighting. Solid near-black #080808 backdrop, no horizon, no floor, no objects, no stars or particles, no typography or letters, no logo, no watermark. Centered object occupies about 85 percent of a square image. Art direction: sharp high contrast, sculptural and luxurious, striking but extremely clean. Not a flat vector icon, not plastic, not a cartoon. Keep all corners pure near-black to blend into a black webpage.

- `dist/assets/presentation-*.png`: 사용자 제공 발표자료 26쪽의 프로필 영역을 PDF 렌더링으로 직접 추출한 7명 이미지. 현재 팀 소개에서 사용.

## 브랜드 워드마크

- `dist/assets/pingdom-wordmark-source.png`: 사용자가 제공한 PingDom 로고 스크린샷 원본. 변경 없이 복사해 사용.
- HTML의 `wordmark-cutout` 필터가 흰 배경과 검은 캡처 테두리를 숨기며, 원본 윤곽과 색상 프로필을 sRGB로 변환한 `#ff1956`을 표시합니다. 현재 헤더에만 사용합니다. AI 제목과 푸터는 텍스트로 구성합니다.
- 내장 ImageGen 배경 추출을 검토했으나 원본 색상·가장자리 차이로 채택하지 않았습니다. 검토 프롬프트: 원본 PingDom 글자 형태·간격·색상을 유지하고 흰 배경과 검은 캡처 테두리만 제거, 투명 배경. 실제 사이트에는 생성 결과가 아닌 첨부 원본을 사용합니다.

## 원본 해상도 화면

- `app-*-source.png`: 사용자 제공 타입널 포트폴리오 PDF 19–23쪽의 1800×3680 이미지 스트림을 직접 추출했습니다. 확대 보간이나 AI 재생성을 하지 않았습니다.
- `web-admin-source.png`: 포트폴리오 24쪽의 1864×1003 원본 이미지.
- `web-merchant-source.png`: 포트폴리오 29쪽의 1866×1003 원본 이미지.
- `ai-traveler-slide.png`: 발표자료 23쪽의 실제 AI 대화 예시 영역을 1764×934로 추출했습니다.
- `ai-consulting-slide.png`: 발표자료 19쪽의 상권 컨설팅 및 분석 보고서 영역을 1820×800으로 추출했습니다.

## 도시 배경

- `seoul-dusk.png`: 내장 ImageGen으로 생성한 1774×887 장식용 히어로 배경. 서울에서 영감을 받은 장면이며 특정 장소의 실제 사진으로 제시하지 않습니다. `pingdom-pin-opaque.png`를 전경에 배치하며, 투명 배경을 사용해 금속 표면의 불투명도를 유지합니다.
- 프롬프트: Cinematic wide hero background for Pingdom, a Korea local travel discovery landing page. Seoul-inspired blue-hour rooftop view over a quiet Korean urban neighborhood, layered dark charcoal rooftops, contemporary towers and a distant hill and slender tower on the far right, warm windows and restrained muted magenta reflections. Editorial travel photography, nuanced midnight-blue shadows, natural film grain and atmospheric depth. Ultra-wide 2:1 landscape, city concentrated on the right and lower third, quiet dark negative space on the left for white Korean typography. No foreground people, readable text, logos, map pins, watermarks, captions or UI. Conceptual Seoul-inspired background, not a claim of a specific exact place.


## 현재 비주얼과 UI

- `pingdom-pin-opaque.png`: 기존 핀을 ImageGen으로 편집한 1254×1254 RGBA. 외부 배경과 중앙 구멍만 투명하며 크롬 표면은 불투명합니다. 형태와 핑크 반사광을 유지했습니다. 이전 히어로에 사용했던 자료로 보관합니다.
- 편집 프롬프트 핵심: Remove only the black outside background and the central pin hole to true alpha. Preserve the exact pin silhouette, polished chrome body, magenta reflections, lighting and opaque metallic surfaces. No translucent metal, no background glow, no text.
- `ai-places-triptych.png`: ImageGen으로 생성한 2172×724 이미지. 카페·식당·팝업의 세 장면을 같은 너비로 구성하고 CSS에서 각 장면을 표시합니다. 특정 실제 매장 사진이 아닌 소개용 가상 장면이며 UI에도 예시로 표시합니다.
- 생성 프롬프트 핵심: Three equal square editorial photographs in a seamless horizontal triptych: a quiet sunlit Seoul-inspired cafe, an intimate Korean neighborhood restaurant, and a contemporary pop-up exhibition space. Restrained warm neutral palette, subtle magenta accents, realistic materials. No people, letters, brand logos or watermarks. Fictional illustrative locations.
- AI 대화·추천 카드·분석 리포트는 HTML/CSS/JavaScript로 구현합니다. `ai-*-slide.png`는 이전 자료로 보관하며 현재 화면에는 표시하지 않습니다.
- `merchant-register.png`: 포트폴리오 30쪽 X1, 1864×1004.
- `merchant-event.png`: 포트폴리오 31쪽 X1, 1864×1003.
- `merchant-claim.png`: 포트폴리오 30쪽 X2, 1865×1003.
- `admin-places.png`: 포트폴리오 25쪽 X1, 1865×1004.
- `admin-owners.png`: 포트폴리오 26쪽 X2, 2908×1648.
- `admin-quality.png`: 포트폴리오 28쪽 X1, 1863×1003.
- 위 운영 화면 6개는 PDF의 원본 이미지 스트림을 직접 추출했습니다. 이미지 내 텍스트를 AI로 재생성하지 않았습니다.
- 팀 사진은 원본 파일을 유지하고 사용자의 최신 교정에 따라 김일강에는 `presentation-yongin.png`, 이용인에는 `presentation-ilgang.png`를 연결합니다. 파일명은 최초 추출 시점의 식별자로 유지합니다.

- 히어로 보조 구체와 회전 궤도는 CSS 그라데이션·테두리·키프레임으로 구현한 장식입니다. 이전 히어로의 기록이며, 현재 화면에서는 제거했습니다.

## 리본형 히어로 재구성

- `dist/assets/pingdom-portal.png`: 내장 ImageGen으로 생성한 1345×1170 RGBA 입체 리본 조형. 공식 로고가 아닌 장식용 비주얼이며, 흰 글자와 중앙 조형이 겹치는 첫 화면에 사용합니다. 동일 이미지를 확대·흐림 처리해 배경 깊이를 만듭니다.
- 프롬프트: Use case: stylized-concept. Transparent centerpiece for Pingdom. One sculptural flowing ribbon loop, an abstract portal suggesting discovery and connection, with an asymmetric open center. Wide folded iridescent metallic glass, sinuous flowing folds, twisting diagonally from bottom left to top right. Hot pink and fuchsia edges, lilac and violet reflections, black chrome, pearl-white highlights and a restrained amber edge. Dramatic gallery studio lighting, high-end CGI. Entire sculpture visible, centered, three-quarter perspective, broad oval silhouette. True transparent background around and inside the hollow center; opaque solid surfaces. No map pin, spheres, city, text, logos, UI, orbit rings or separate bubbles.
