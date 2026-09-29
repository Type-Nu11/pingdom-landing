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

Pingdom 랜딩페이지 배경용 8초 무음 고정 카메라 야경 루프. 서울에서 영감을 받은 실사 풍경의 하단 고가도로에 차량 빛이 밝은 금빛과 샴페인색 리본으로 훨씬 빠르고 조밀하게 길게 이어진다.

## Assets

- assets/plate.png — 생성한 밤서울 고정 배경. 이미지 자체는 편집하지 않는다.
- assets/plate-prompt.txt — plate 생성 프롬프트.

## Customizations

- 양방향 3차선에 약 150–385px 길이의 금빛·샴페인색 차량 라이트 120대. 기존 대비 2.86배 밀도와 3배 속도.
- 차선 곡률에 정합한 미세한 halo와 아스팔트 반사.
- 8초/30fps seamless loop, 1920×1080 desktop MP4, 중앙 crop 720×1080 mobile MP4, WebP poster.

## Notes

- UI·문자·로고·음악·카메라 이동 없음.
- 고정 seed와 정수 회전 주기로 프레임을 결정한다.
- 사용자 영상 제작 요청에 따라 로컬 render까지 수행한다. 배포와 commit은 범위 밖이다.

- 새 결과는 `seoul-traffic-*-gold` 파일로 저장하여 이전 영상을 보존한다.
