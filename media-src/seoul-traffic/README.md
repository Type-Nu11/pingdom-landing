# 서울 도로 야경 루프

Pingdom 첫 화면용 8초 무음 영상. 생성된 야경 plate 위에 120개의 금빛·샴페인색 paired 차량 라이트를 SVG로 합성합니다. 원본 plate는 그대로 보존하며 도로 위치와 곡률에만 빛을 배치합니다.

## 재생성

```sh
npm ci
npm run check -- --snapshots
npm run render -- --fps 30 --quality delivery --output renders/master-gold.mp4
ffmpeg -y -i renders/master-gold.mp4 -an -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart -g 240 -keyint_min 240 -sc_threshold 0 ../../dist/assets/seoul-traffic-desktop-gold.mp4
ffmpeg -y -i renders/master-gold.mp4 -vf 'crop=720:1080:600:0' -an -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -g 240 -keyint_min 240 -sc_threshold 0 ../../dist/assets/seoul-traffic-mobile-gold.mp4
ffmpeg -y -ss 1.3 -i renders/master-gold.mp4 -frames:v 1 renders/poster-gold.png
node --input-type=module -e "import sharp from 'sharp'; await sharp('renders/poster-gold.png').webp({quality:86}).toFile('../../dist/assets/seoul-traffic-poster-gold.webp');"
```

## 루프 구조

- 배경 1672×941 이미지를 1920×1080 프레임에 표시합니다.
- 단일 paused GSAP timeline에서 모든 차량의 x 좌표를 계산합니다.
- 빛 길이·속도·시작 위치는 seed 29092026으로 고정합니다.
- 각 차량은 8초에 정확히 3회 또는 6회 이동 구간을 순환합니다. 화면 밖 520px 지점에서만 wrap하므로 화면 안에 순간 이동이 없습니다.
- SVG transform은 매 시각 `translate(x, roadY(x, lane)) rotate(tangent)`로 직접 결정합니다. GSAP의 SVG bbox origin 누적 보정을 피하고 역방향 seek도 동일한 위치를 만듭니다.
- 코어, 작은 halo, 도로 반사를 같은 차량 그룹에 묶습니다. SVG filter는 userSpaceOnUse를 사용해 수평 선의 0높이 bounding box에도 적용됩니다.
- 모바일 출력은 desktop 원본의 중앙 720×1080 영역입니다.

`assets/plate-prompt.txt`에 이미지 생성 근거를 보관합니다. 실제 서울 교통 촬영이나 교통량 데이터가 아닌 개념 합성 영상입니다.

금빛 버전은 이전 대비 차량 수 2.86배, 이동 속도 3배이며 이전 이름의 MP4와 poster를 그대로 보존합니다.
