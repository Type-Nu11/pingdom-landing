# 서울 도로 야경 루프

Pingdom 첫 화면용 8초 무음 영상. 원래 서울 스카이라인과 직선 고가도로 plate 위에 24개의 금빛·따뜻한 흰색 장노출 가닥을 합성합니다. 밝기 덩어리와 긴 잔광만 빠르게 이동하며, 원본 사진과 도로 위치는 변경하지 않습니다.

## 재생성

```sh
npm ci
npm run check -- --snapshots
npm run render -- --fps 30 --quality delivery --output renders/master-highway-exposure.mp4
ffmpeg -y -i renders/master-highway-exposure.mp4 -an -c:v libx264 -preset slow -crf 24 -maxrate 4M -bufsize 4M -pix_fmt yuv420p -movflags +faststart -g 240 -keyint_min 240 -sc_threshold 0 ../../dist/assets/seoul-traffic-desktop-highway-exposure.mp4
ffmpeg -y -i renders/master-highway-exposure.mp4 -vf 'crop=720:1080:600:0' -an -c:v libx264 -preset slow -crf 24 -maxrate 1500k -bufsize 1500k -pix_fmt yuv420p -movflags +faststart -g 240 -keyint_min 240 -sc_threshold 0 ../../dist/assets/seoul-traffic-mobile-highway-exposure.mp4
ffmpeg -y -ss 1.3 -i renders/master-highway-exposure.mp4 -frames:v 1 renders/poster-highway-exposure.png
node --input-type=module -e "import sharp from 'sharp'; await sharp('renders/poster-highway-exposure.png').webp({quality:86}).toFile('../../dist/assets/seoul-traffic-poster-highway-exposure.webp');"
```

## 루프 구조

- `assets/plate.png` 1672×941 원본을 1920×1080에 표시합니다. 원본·프롬프트 `assets/plate-prompt.txt`를 그대로 유지합니다.
- 기존 6차선과 `roadY=(691+94*u-40*u²+lane)*1080/941`을 유지합니다. 차선마다 4가닥을 배치하고 빛 레이어를 아스팔트 범위에 한정합니다.
- Canvas 연속 ribbon polygon은 선분 경계 없이 금빛 노출·좁은 흰 코어·작은 halo를 그립니다. 저노출 바탕 위로 950–1650px 잔광과 밝기 덩어리가 빠르게 움직입니다.
- 가닥마다 4개 pulse, 8초당 4·5·6회 정수 순환. seed 29092026과 단일 paused GSAP timeline으로 프레임을 결정합니다.
- 1800px 여유 구간이 잔광보다 길어 화면 안에 wrap이 보이지 않습니다. skyline과 카메라는 고정입니다.
- 모바일은 desktop 중앙 720×1080 crop입니다. H.264/yuv420p/faststart, 오디오 없음.

실제 서울 촬영·교통량 데이터가 아닌 개념 합성 영상입니다. 이전 영상·poster는 보존합니다. 현재 결과 파일명은 `seoul-traffic-*-highway-exposure`입니다. 검증 결과는 `VERIFICATION.md`에 기록합니다.
