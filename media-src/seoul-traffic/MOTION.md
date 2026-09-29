# 장노출 교차로 모션

8초·1920×1080·30fps 단일 고정 장면. 사용자 참고의 긴 곡선 노출을 따라 NW↔SE, NE↔SW 주흐름과 두 회전 경로를 만든다. 원거리 폭·간격은 줄이고 가까운 도로의 좁은 흰 코어와 금빛 halo를 강조한다.

`long exposure curved traffic light trails` catalog 검색에는 도로 사진에 정합하는 항목이 없었다. cubic 경로를 arc length로 샘플링하고 연속 ribbon polygon으로 직접 합성한다. 짧은 막대·분리된 선분 stroke는 사용하지 않는다. 저노출 바탕에 850–1550px 감쇠 잔광과 밝기 덩어리가 이동한다. 일부 반대 방향은 warm red이며 왼쪽 수목은 광원만 가린다.

단일 GSAP paused timeline, seed 29092026, `ease: none`. 각 흐름이 8초에 3·4·5회 정수 순환하여 t=0과 t=8이 같다. 1750px off-path guard가 잔광보다 길어 wrap은 화면 밖에서 발생한다. 모바일은 중앙 720×1080 crop.

검증: HyperFrames check의 실제 Chromium snapshot·motion, H.264 출력 ffprobe, 인코딩 프레임의 일반 변화량과 루프 이음새 비교. 외부 게시 없이 로컬 렌더만 수행한다.
