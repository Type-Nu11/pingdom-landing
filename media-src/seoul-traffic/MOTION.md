# 모션 계획

단일 장면, 8초, 1920×1080, 30fps. 시작과 끝에 전환 없이 동일한 흐름을 이어 간다.

catalog 검색 `moving vehicle traffic light trails timelapse highway` 결과는 light transition·echo trail이며 실제 사진의 도로 곡률과 양방향 차선 흐름에 맞는 항목은 없었다. 도로에 정합하는 SVG 차량 라이트 그룹을 직접 작성한다.

참조 규칙: hyperframes-animation `svg-path-draw`의 선 기반 광원 구조와 constant-speed `ease: none`, hyperframes-keyframes의 path travel 및 deterministic seek. 각 차량은 정해진 seed로 길이·차선·주기·위상을 갖고, 밝은 코어·halo·도로 반사 묶음 전체가 동일한 좌표를 따른다. 화면 밖 520px 여유 구간에서만 wrap한다. 8초마다 정수 회전을 마쳐 t=0과 t=8이 동일하다.

검증: HyperFrames check와 실제 browser snapshot, 0/4/7.967/8초 위치와 pixel loop 검증, 최종 MP4 ffprobe의 해상도·30fps·8초·audio 없음 확인. 모바일은 중앙 720×1080 crop.

## 금빛 고밀도 수정

6차선 각각 20대로 총 120대(이전 42대의 2.86배). 8초당 3회 또는 6회 순환으로 이전 1회·2회 대비 정확히 3배 속도. 모든 차선에 금빛·샴페인색 리본과 밝은 코어를 적용한다. plate와 도로 방정식 및 차선 y 좌표는 변경하지 않는다. 길이는 약 150–385px이며 기존 화면 밖 wrap 여유 520px 안에 들어간다. 새 파일명 -gold로 기존 출력과 분리한다.
