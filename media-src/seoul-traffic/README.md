# 서울 도로 야경 루프

Pingdom 첫 화면용 8초 무음 영상. 생성된 교차로 야경 plate 위에 56개의 연속 장노출 궤적을 합성합니다. 금빛·따뜻한 흰색과 일부 붉은 궤적이 도로를 따라 교차하며, 밝기 덩어리와 긴 잔광이 빠르게 이동합니다. 원본 plate는 편집하지 않습니다.

## 재생성

```sh
npm ci
npm run check -- --snapshots
npm run render -- --fps 30 --quality delivery --output renders/master-exposure.mp4
ffmpeg -y -i renders/master-exposure.mp4 -an -c:v libx264 -preset slow -crf 24 -maxrate 4M -bufsize 4M -pix_fmt yuv420p -movflags +faststart -g 240 -keyint_min 240 -sc_threshold 0 ../../dist/assets/seoul-traffic-desktop-exposure.mp4
ffmpeg -y -i renders/master-exposure.mp4 -vf 'crop=720:1080:600:0' -an -c:v libx264 -preset slow -crf 24 -maxrate 1500k -bufsize 1500k -pix_fmt yuv420p -movflags +faststart -g 240 -keyint_min 240 -sc_threshold 0 ../../dist/assets/seoul-traffic-mobile-exposure.mp4
ffmpeg -y -ss 1.3 -i renders/master-exposure.mp4 -frames:v 1 renders/poster-exposure.png
node --input-type=module -e "import sharp from 'sharp'; await sharp('renders/poster-exposure.png').webp({quality:86}).toFile('../../dist/assets/seoul-traffic-poster-exposure.webp');"
```

## 루프 구조

- `assets/intersection-plate.png` 1672×941 원본을 1920×1080에 표시합니다. 생성 근거는 `assets/intersection-plate-prompt.txt`입니다.
- 4개 곡선 경로에 56개 광원 가닥을 배치하고, 원거리로 갈수록 선폭과 간격을 줄입니다.
- Canvas의 연속 ribbon polygon은 선분 경계 없이 금빛 노출·흰 코어·작은 diffuse halo를 그립니다. 정적 저노출 위로 850–1550px 잔광이 이동합니다.
- 각 궤적에는 3개 밝기 덩어리가 있으며 seed 29092026으로 위상을 고정합니다. 단일 paused GSAP timeline의 시각만으로 모든 프레임을 재생성합니다.
- 8초당 3·4·5회 정수 순환합니다. 경로 양쪽의 1750px 여유는 잔광보다 길어 화면 안에서 wrap이 보이지 않습니다.
- 왼쪽 전경 수목은 빛 레이어만 가립니다. 도시와 카메라는 고정합니다.
- 모바일은 desktop 중앙의 720×1080 crop입니다. 영상은 H.264/yuv420p/faststart이며 오디오가 없습니다.

실제 서울 촬영·교통량 데이터가 아닌 개념 합성 영상입니다. 이전 원본·금빛 MP4와 poster는 그대로 보존합니다. 검증 결과는 `VERIFICATION.md`에 기록합니다.
