# Assets

- `dist/assets/app-*.webp`, `web-*.webp`, `team-*.webp`: 사용자 제공 타입널 포트폴리오 PDF의 실제 화면 및 최초 팀 프로필 이미지.
- `dist/assets/pretendard-variable.woff2`: Pretendard 1.3.9. SIL Open Font License. 라이선스는 같은 폴더의 Pretendard-LICENSE.txt.
- `dist/assets/pingdom-pin.png`: 이 프로젝트를 위해 내장 ImageGen으로 생성한 메인 비주얼. 공식 로고를 대체하지 않는 장식용 장소 핀.

## ImageGen prompt

Use case: stylized-concept. Asset type: premium landing page hero for Pingdom, a Korea local discovery platform. Create a single monumental sculptural 3D location/map pin made of liquid polished metal and translucent glass, in the style of premium futuristic digital design studio campaign imagery. The recognizable teardrop location-pin silhouette has a large hollow circular center, thick elegantly twisted soft contours with sinuous flowing folded surfaces, tilted in 3/4 perspective 15 degrees to the right. Highly reflective obsidian chrome with vivid hot magenta #ff176b highlights and deep violet iridescent reflections, a few beautiful bright white specular edges. Dramatic studio lighting. Solid near-black #080808 backdrop, no horizon, no floor, no objects, no stars or particles, no typography or letters, no logo, no watermark. Centered object occupies about 85 percent of a square image. Art direction: sharp high contrast, sculptural and luxurious, striking but extremely clean. Not a flat vector icon, not plastic, not a cartoon. Keep all corners pure near-black to blend into a black webpage.

- `dist/assets/presentation-*.png`: 사용자 제공 발표자료 26쪽의 프로필 영역을 PDF 렌더링으로 직접 추출한 7명 이미지. 현재 팀 소개에서 사용.

## 브랜드 워드마크

- `dist/assets/pingdom-wordmark-source.png`: 사용자가 제공한 PingDom 로고 스크린샷 원본. 변경 없이 복사해 사용.
- HTML의 `wordmark-cutout` 필터가 흰 배경과 검은 캡처 테두리를 숨기며, 원본 윤곽과 색상 프로필을 sRGB로 변환한 `#ff1956`을 표시합니다. 헤더, 검증 카드, AI 제목, 푸터에서 동일하게 사용합니다.
- 내장 ImageGen 배경 추출을 검토했으나 원본 색상·가장자리 차이로 채택하지 않았습니다. 검토 프롬프트: 원본 PingDom 글자 형태·간격·색상을 유지하고 흰 배경과 검은 캡처 테두리만 제거, 투명 배경. 실제 사이트에는 생성 결과가 아닌 첨부 원본을 사용합니다.
