# 검증 결과

## 원래 고가도로 장노출 버전

- 원래 `assets/plate.png` 서울 skyline·직선 고가도로로 복원했다. 원본 파일은 017074c와 SHA-256 `acf5556418f405125176259e43a7364d7075c0114d5c402e2efe69916710f87e`까지 동일하다.
- 기존 roadY와 6차선 위치를 유지한다. 24개 연속 가닥·950–1650px 잔광·가닥당 4개 pulse가 8초에 4·5·6회 순환한다. 교차로·X 궤적은 제거했다.
- HyperFrames pin probe: 0.8.91 최신, 변경 없음. history bracket `ba3e10a9` 사용.
- 초기 `snapshots/highway-exposure-layout/frame-00-at-1.3s.png`를 부모 작업자가 확인한 뒤 같은 구도로 render를 진행했다.
- `npx hyperframes check --snapshots --at 0,1.3,4,7.966 --json`: lint/runtime/layout/motion 오류 0·경고 0, 실제 Chromium motion 161샘플 통과. 4초 snapshot에서도 빛의 도로 정합을 확인했다.
- HyperFrames 실제 render: 240프레임·8초, screenshot capture / hardware GPU, 10.8초 소요.
- 최종 desktop 1920×1080 / 998,879 bytes, mobile 720×1080 / 394,489 bytes, poster 1920×1080 / 281,894 bytes. 파일명은 `seoul-traffic-*-highway-exposure`이며 이전 출력은 보존했다.
- 최종 MP4 두 개 모두 ffprobe H.264/yuv420p/30fps/8.000초/240프레임/audio 없음. atom 순서 ftyp → moov → free → mdat로 faststart 확인.
- 최종 인코딩 프레임 `renders/compressed-highway-exposure-check.png`에서 원본 구도·긴 금빛 가닥을 확인했다. 도로 영역의 루프 이음새 변화량 3.82/255, 일반 연속 프레임 중앙값 3.20/255·최댓값 3.52/255였다. t=0과 t=8은 정수 주기 계산상 같지만 인코딩 결과의 픽셀 동일성을 주장하지 않는다.
- README에 최종 render·비트레이트 제한 압축·mobile crop·Sharp WebP 재현 명령을 반영했다. 사이트 검증은 부모 작업자 담당이다.

## 원래 고가도로 장노출 웹 통합 검증

- 부모 작업자가 실제 IAB 1446px 데스크톱에서 intro-complete, 새 desktop-highway-exposure source, readyState=4·paused=false·duration=8초를 확인했다.
- 원래 첨부 사진과 배경이 일치하며 글씨 가독성·가로 넘침 없음을 확인했다.
- 부모 작업자가 실제 IAB 390×844 모바일에서도 새 mobile-highway-exposure source, intro-complete, readyState=4·paused=false·duration=8초, 가로 넘침 없음을 확인했다.
- 데스크톱·모바일에서 원본 배경·도로 위 빛·글씨 가독성을 확인했으며, 콘솔 오류·경고는 0이다.
- 화면 증거: `review/traffic-highway-exposure-desktop.png`, `review/traffic-highway-exposure-mobile.png`.
- 사이트는 자산 경로만 교체하고 JavaScript·CSS를 변경하지 않아 기존 단위 테스트를 반복하지 않았다.

## 교차로 장노출 버전

- 사용자 참고의 연속 곡선 장노출을 반영해 새 intersection plate와 4개 경로·56개 가닥으로 수정했다. 850–1550px 잔광, 좁은 흰 코어, 금빛 halo, 일부 warm red와 왼쪽 전경 수목 가림을 적용했다.
- pin probe: HyperFrames 0.8.91 최신, 변경 없음. history bracket `8256c196` 사용.
- `npx hyperframes check --snapshots --at 0,1.3,4,7.966 --json`: lint/runtime/layout/motion 오류 0·경고 0, 실제 Chromium motion 161샘플 통과.
- 최종 snapshot `snapshots/frame-01-at-1.3s.png`에서 긴 연결·큰 회전·원근 폭·수목 가림을 확인했다. 압축 결과도 `renders/compressed-exposure-check.png`로 확인했다.
- HyperFrames 실제 render: 240프레임·8초, screenshot capture / hardware GPU, 27.1초 소요.
- 출력: desktop 1920×1080 / 4,180,139 bytes, mobile 720×1080 / 1,528,668 bytes, poster 1920×1080 / 449,738 bytes. 파일명은 `seoul-traffic-*-exposure`이며 기존 출력은 보존했다.
- 최종 MP4 두 개는 ffprobe에서 H.264/yuv420p/30fps/8.000초/240프레임/audio 없음 확인. `+faststart`로 moov atom을 mdat 앞으로 배치했다.
- t=0과 t=8은 정수 주기 계산상 같은 상태다. 최종 인코딩 도로 영역의 마지막→첫 프레임 회색조 변화량은 2.80/255, 일반 연속 프레임 중앙값 2.09/255·최댓값 2.24/255였다. 압축된 첫 I-frame의 차이를 포함하는 수치이며 픽셀 동일성으로 보고하지 않는다.
- 재생성·최종 비트레이트 제한 압축·중앙 crop·Sharp WebP 명령은 README에 기록했다. 웹 통합·배포 검증은 부모 작업자 범위다.

## 교차로 장노출 웹 통합 검증

- 부모 작업자가 실제 IAB 1446px 데스크톱과 390×844 모바일에서 확인했다.
- intro-complete, video readyState=4·paused=false, 이미지 정상, 가로 넘침 없음, 콘솔 오류·경고 0.
- 화면 증거: `review/traffic-exposure-desktop.png`, `review/traffic-exposure-mobile.png`.
- 사이트 변경은 dist/index.html의 영상·poster 자산 3개 경로 교체이며 기존 본문 상향 위치를 유지했다. 앱 JavaScript와 CSS는 변경하지 않았다.

## 금빛 고밀도 버전

- 변경: 42대 → 120대(2.86배), 8초당 1·2회 → 3·6회 순환(3배 속도), 금빛·샴페인색 리본. plate와 도로 y 좌표는 변경하지 않았다.
- pin 확인: `npx hyperframes@latest upgrade --project . --check` 결과 HyperFrames 0.8.91이 최신이며 pin 변경 없음.
- `npm run check -- --snapshots --at 0,1.3,4,7.966 --json`: lint/runtime/layout/motion 오류 0·경고 0, 실제 Chromium motion 161샘플 통과.
- `snapshots/frame-02-at-4.0s.png`와 최종 poster에서 금빛 리본이 고가도로 위에 놓이는 것을 확인했다.
- 최종 HyperFrames render: 240프레임, 8.0초, screenshot capture / hardware GPU, render 11.8초.
- 출력: `seoul-traffic-desktop-gold.mp4` 1920×1080 / 1,493,407 bytes, `seoul-traffic-mobile-gold.mp4` 720×1080 / 532,474 bytes, `seoul-traffic-poster-gold.webp` 1920×1080 / 274,840 bytes.
- 두 MP4 모두 ffprobe로 H.264/yuv420p/30fps/8.000초/240프레임/audio 없음 확인. atom 순서는 ftyp → moov → free → mdat로 faststart 확인.
- 8초에 각 차량이 정수 횟수 순환하여 계산상 0초·8초 위치가 일치한다. 인코딩된 도로 영역의 마지막→첫 프레임 평균 회색조 차이 5.54/255, 일반 연속 프레임 중앙값 5.26/255·최댓값 6.10/255로 이음새 차이가 일반 이동 프레임 범위 안이다.
- 기존 MP4·poster는 변경하지 않고 -gold 파일을 추가했다.

## 기존 흰색·붉은 빛 버전

- HyperFrames 0.8.91 `check --snapshots --at 0,1.3,4,7.966 --json`: lint/runtime/layout/motion 오류 0, 경고 0. 실제 Chromium에서 4개 장면 snapshot과 161개 motion 샘플 검사.
- 사진은 원본 PNG SHA-256과 프로젝트 assets/plate.png SHA-256이 일치한다.
- 최종 도로 곡률과 최하단 차선 여유는 snapshots/frame-02-at-4.0s.png에서 눈으로 확인했다. 모든 차량 빛이 고가도로에 붙고, 건물은 고정된다.
- 실제 HyperFrames render: 240프레임, 8.0초. screenshot capture / hardware GPU, 최종 render 8.7초.
- ffprobe: desktop 1920×1080, mobile 720×1080, 둘 다 H.264/yuv420p/30fps/8.000초/240프레임, audio stream 없음.
- MP4 atom 순서: ftyp → moov → free → mdat. 두 MP4 모두 faststart를 확인했다.
- 파일 크기: desktop 930,833 bytes, mobile 326,619 bytes.
- 반복 이음새: seed/정수 8초 이동 주기로 0초와 8초의 계산 좌표가 동일하다. 인코딩된 도로 영역의 마지막→첫 프레임 평균 회색조 차이 1.60/255, 일반 연속 프레임 중앙값 1.10/255. 실제 차량 이동을 유지하며 검은 프레임이나 장면 전환을 넣지 않는다.
- 정적 keyframes inspector는 GSAP plain-object 좌표를 SVG transform으로 반영하는 동작의 대상을 추적하지 못해 --shot 대상 없음으로 종료했다. 이 진단은 통과로 기록하지 않는다. 실제 Chromium snapshot과 check motion 검사로 움직임을 검증했다.
- 영상 제작 작업자의 CUA는 unavailable이었으며, 이후 메인 작업자가 아래 웹 통합 검증을 수행했다.

## 금빛 버전 웹 통합 검증

- header/nav와 해당 인트로 fade 호출을 함께 제거했다. 상단 문구·모델·하단 문구는 데스크톱에서 hero 높이의 7%, 모바일에서는 64px 상향했다.
- 배경은 위로 확장해 금빛 도로가 하단 문구 뒤를 가로지르도록 배치했다. 실제 IAB 1446px 데스크톱과 390×844 모바일에서 구도와 가로 넘침 없음을 확인했다.
- 두 화면에서 intro-playing → intro-complete 전환, gold MP4의 readyState=4, paused=false, 8초 재생을 확인했다. 콘솔 오류·경고 없음.
- 화면 증거: review/traffic-gold-desktop.png, review/traffic-gold-mobile.png.
- 이번 변경은 기존 인트로 테스트 17개와 JavaScript 구문 검사, git diff --check를 통과했다. 영상 재생 제어 로직은 변경하지 않았으므로 이전의 배경 테스트를 반복하지 않았다.

## 기존 버전 웹 통합 검증

- 실제 IAB 데스크톱에서 1920×1080 영상 디코딩과 8초 무음 반복 재생, 인트로 완료 상태를 확인했다. 배경 구도를 12% 확장해 차량 궤적이 하단 문구 아래에 보이게 조정했다.
- 인트로 중 scrollY=1234로 첫 화면 밖에 이동해도 intro-playing과 영상 재생이 유지됐다. 인트로 완료 뒤에는 영상이 일시정지하고, 첫 화면 복귀 시 기존 위치에서 다시 재생됐다.
- 390×844 모바일에서 720×1080 전용 영상 선택, 실제 재생, 가로 넘침 없음, 기존 모델 폭 351px 유지를 확인했다.
- 해당 데스크톱·모바일 확인 중 브라우저 경고·오류는 없었다. 검증 화면은 저장소의 review/traffic-mobile.png와 review/traffic-production.png에 보관한다.
- 배경 재생 상태 테스트 8개와 기존 인트로 테스트 17개, 총 25개 통과. reduced motion/saveData/자동 재생 거부·미디어 실패 fallback은 단위 테스트로 검증했으며 OS 설정 변경이나 강제 네트워크 실패를 통한 실기기 검증은 수행하지 않았다.

코드·개발 의존성·원본 영상은 배포 자산과 분리된다. node_modules, snapshots, renders, .hyperframes는 프로젝트 .gitignore에서 제외한다.
