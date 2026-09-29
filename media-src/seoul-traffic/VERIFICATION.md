# 검증 결과

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

## 웹 통합 검증

- 실제 IAB 데스크톱에서 1920×1080 영상 디코딩과 8초 무음 반복 재생, 인트로 완료 상태를 확인했다. 배경 구도를 12% 확장해 차량 궤적이 하단 문구 아래에 보이게 조정했다.
- 인트로 중 scrollY=1234로 첫 화면 밖에 이동해도 intro-playing과 영상 재생이 유지됐다. 인트로 완료 뒤에는 영상이 일시정지하고, 첫 화면 복귀 시 기존 위치에서 다시 재생됐다.
- 390×844 모바일에서 720×1080 전용 영상 선택, 실제 재생, 가로 넘침 없음, 기존 모델 폭 351px 유지를 확인했다.
- 해당 데스크톱·모바일 확인 중 브라우저 경고·오류는 없었다. 검증 화면은 저장소의 review/traffic-mobile.png와 review/traffic-production.png에 보관한다.
- 배경 재생 상태 테스트 8개와 기존 인트로 테스트 17개, 총 25개 통과. reduced motion/saveData/자동 재생 거부·미디어 실패 fallback은 단위 테스트로 검증했으며 OS 설정 변경이나 강제 네트워크 실패를 통한 실기기 검증은 수행하지 않았다.

코드·개발 의존성·원본 영상은 배포 자산과 분리된다. node_modules, snapshots, renders, .hyperframes는 프로젝트 .gitignore에서 제외한다.
