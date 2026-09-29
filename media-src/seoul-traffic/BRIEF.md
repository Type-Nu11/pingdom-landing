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

Pingdom 배경용 8초 무음 고정 카메라 야경 루프. 사용자 참고사진처럼 넓은 서울 교차로를 따라 금빛·따뜻한 흰색·일부 붉은 빛이 길고 연속된 장노출 궤적으로 흐른다.

## Assets

- assets/intersection-plate.png — 새로 생성한 조감 교차로 야경. 원본 이미지는 편집하지 않는다.
- assets/intersection-plate-prompt.txt — 생성 근거.

## Customizations

- 원근감 있는 4개 경로와 56개 연속 광원 가닥. 850–1550px 잔광, 좁은 흰 코어, 작은 diffuse halo.
- 고정 seed와 정수 회전 주기. 8초/30fps seamless loop.
- 1920×1080 desktop MP4, 중앙 crop 720×1080 mobile MP4, WebP poster. 새 파일명은 `seoul-traffic-*-exposure`.
- UI·문자·로고·음악·카메라 이동 없음. 기존 영상 자산은 보존한다.

## Notes

사용자의 영상 수정 요청에 따라 로컬 render까지 수행한다. 배포와 commit은 부모 작업자 담당이다.
