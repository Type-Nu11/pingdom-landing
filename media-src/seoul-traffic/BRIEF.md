---
workflow: general-video
flow: automation
storyboard: no
message: "서울의 밤과 빠르게 이어지는 차량의 빛"
destination: website-background
aspect: 1920x1080
language: ko
length: 8s
angle: photographic-loop
---

## Intent

원래 서울 skyline과 직선 고가도로 사진에 긴 금빛 장노출을 적용한 Pingdom 배경용 8초 무음 루프. 사진·도로 구도는 유지하고 높은 밀도의 긴 빛과 빠른 pulse만 추가한다.

## Assets

- assets/plate.png — 원래 고정 배경. 이미지 자체는 변경하지 않는다.
- assets/plate-prompt.txt — 원래 생성 근거.

## Customizations

- 기존 도로 기울기와 6차선 유지. 24개 연속 가닥, 950–1650px 잔광, 좁은 흰 코어, 금빛 halo.
- 고정 seed·정수 주기. 8초/30fps seamless loop.
- 1920×1080 desktop MP4, 중앙 720×1080 mobile MP4, WebP poster. 새 이름 `seoul-traffic-*-highway-exposure`.
- UI·문자·로고·음악·카메라 이동 없음. 교차로 구도는 사용하지 않는다. 기존 출력은 보존한다.

## Notes

스냅샷 확인 후 최종 render를 수행한다. 사이트 통합·commit·배포는 부모 작업자 담당이다.
