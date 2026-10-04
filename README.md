# Pingdom landing page

한국의 장소를 발견하고 방문하는 핑덤의 서비스와 플랫폼을 소개하는 정적 랜딩페이지입니다. `dist` 자체가 배포 결과물이므로 컴파일 빌드나 패키지 설치 과정은 없습니다.

2026-09-30의 화면 코멘트와 추가 AI·컨설팅 전면 수정 요청을 반영했습니다. 새 장면은 너비 1000px 이상·높이 701px 이상 PC에 적용합니다. 팀 소개와 팀 메뉴는 전체 문서에서 제거했습니다.

## 현재 화면 흐름

- 기존 야경·인트로·하프톤 로고를 유지합니다. 인트로 아래로 일반 문서 스크롤을 하면 본문이 이어집니다. 입자 출구 전환과 180svh 전환 공간은 제거했습니다.
- 실제 앱은 비스듬한 원근·측면 두께·그림자를 적용했습니다. 장소·커뮤니티·방문 검증·예약·여행 기록의 5개 화면을 같은 위치와 크기로 전환합니다. 설명은 한 번에 하나만 표시합니다.
- 플랫폼은 하나의 넓은 사진에서 세 사진의 폭이 펼쳐지는 구도입니다. 역할 번호와 부가 라벨을 제거했습니다.
- 상점주는 왼쪽 핵심 문장과 오른쪽 원본 웹으로 소개합니다. 전체 등록 화면에서 장소 검색·위치 영역으로 시선이 이동하고, 원본 이벤트 화면으로 연결됩니다. 별도 입력 시뮬레이션은 없습니다.
- AI와 상권 상담은 중앙 타이포와 큰 서비스 원리 그림으로 소개합니다. 여행 AI는 어두운 장소 발견 장면, 컨설팅은 밝은 가게·동네 장면입니다. 사용자 제공 우주 사진은 제한된 배경으로 사용합니다. 두 새 그림은 가상의 브랜드 그림이며 실제 제품·장소·분석 결과가 아닙니다. 짧은 등장 뒤에는 읽을 수 있는 구도를 유지합니다. 컨설팅 소개 다음에는 핀 줌인과 도시 야경 영상이 이어집니다.
- PC의 앱 소개·장소·커뮤니티·방문 검증·예약·여행 기록·플랫폼·상점주 3장면·AI 소개·Consulting 소개/네트워크/최종 구도는 앞으로 스크롤할 때 각각 250ms 한 번 멈춥니다. 초과 입력을 쌓지 않으며 역스크롤은 즉시 풀립니다. 메뉴·앵커·동작 줄이기·좁은 화면은 정지 대상에서 제외합니다. 같은 장면보다 한 화면 이상 위로 돌아가면 재정지할 수 있습니다.
- AI 앵커 직접 진입과 새로고침에서 늦게 준비되는 히어로 높이를 반영합니다. 같은 URL·PC 크기의 새로고침은 앵커 기준으로 읽던 위치를 복원하며, 사용자가 입력하거나 앵커를 바꾸면 보정을 즉시 종료합니다.

생성 사진은 브랜드 분위기 이미지입니다. 실제 등록 장소·이용자·업체를 촬영한 사진이라는 의미가 아닙니다. 제품 UI의 문구·수치·색·내용은 재생성하지 않습니다. 장소 상세의 지정된 다섯 개인정보 영역만 PC 표시 레이어로 흐립니다.

## 실행과 관련 검사

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
node scripts/check-static-site.mjs
node --test tests/scroll-stops.test.mjs
```

이번 스크롤 정지 변경의 직접 관련 상태·입력·수명주기 검사 18개가 통과했습니다. 이전 AI·컨설팅 수정의 검사 25개는 해당 변경 단계에서 통과한 결과입니다. 기존 앱20·플랫폼/상점주30·히어로 전환13·기존 입자17개는 해당 변경 단계에서 통과한 결과를 유지합니다. 변경 범위에 맞춰 따로 검사했으며 전체 테스트 모음을 반복하지 않았습니다. 배포 전 활성 참조·모듈 구문·접근성 ID와 `git diff --check`도 확인했습니다.

## 구현 책임

| 파일 | 책임 |
| --- | --- |
| `dist/index.html`, `dist/app.js` | 본문·모듈 연결·앵커·초기 딥링크·BFCache 정리/복귀 |
| `dist/hero-preserved.*`, `dist/halftone-renderer.mjs` | 기존 첫 화면·일반 문서 흐름·로고 점 |
| `dist/desktop-motion.mjs`, `dist/visit-v2.css` | 완성 단말기의 고정 크기·원근·한 문장 전환 |
| `dist/desktop-polish.*`, `dist/commercial-v2.css` | native 품질·개인정보 표시·사진 펼침·상점주 카메라 |
| `dist/ai-pages.*` | 두 AI 브랜드 지면·등장과 읽기 상태·컨설팅 영상의 스크롤 시간 매핑·자산 실패/수명주기 복구 |
| `dist/scroll-stops.mjs` | 완성 구도 정지·관성 입력·명시적 이동 우회·수명주기 정리 |
| `dist/story.*` | 기존 좁은 화면과 정적 fallback |
| `scripts/check-static-site.mjs`, `scripts/check-native-assets.mjs` | 활성 참조와 원본 자산 검증 |

`platform-triptych.html`, `merchant-v2.html`, `ai-pages.html`은 `index.html`과 일치하는 편집용 fragment입니다. 실행 중 fragment fetch는 없습니다. 이전 팀 파일과 이전 시안 자산은 보관하지만 활성 페이지에서 연결하지 않습니다.

## 검증 범위

이전 단계에서 실제 브라우저 1445×982·1280×720의 입자 확산·사진 연결·앱 크기·플랫폼·등록/이벤트·역스크롤을 확인했습니다. 이번 단계는 일반 인트로·완성 장면 정지를 같은 PC 크기에서 검증했고, 공개 1446×982에서도 연속 빠른 입력·앱 세 장면·메뉴 이동을 확인했습니다. 추가 AI·컨설팅 수정은 같은 두 PC 크기의 제품 배치와 가독성을 별도로 확인했습니다. AI 새로고침 위치 보정은 실제 브라우저의 앵커·중간 읽기 위치로 확인했습니다. 동작 줄이기·이미지 실패·숨김/복귀·관찰자 정리는 AI 상태 및 lifecycle 검사로 확인했습니다.

모바일 제작/브라우저 검증, Safari, 실측 FPS·Core Web Vitals는 수행하지 않았습니다. 원본 제품 화면은 이전 native 픽셀 검증 결과를 유지하며 이번에 재생성하지 않았습니다.

공개 주소: [Pingdom](https://pingdom-landing.vercel.app/). 추가 AI 전면 수정의 배포·공개 자산 비교·브라우저 갱신 증거는 `review/ai-refresh-6/QA.md`, 새 실제 레퍼런스 조사와 적용 기준은 `review/ai-refresh-6/REFERENCE.md`, 자산 출처는 [ASSETS.md](ASSETS.md)에 기록합니다. 현재 일반 인트로·완성 장면 정지 검증과 배포 기록은 `review/scroll-stops/QA.md`에 기록합니다. 직전 AI 구도의 기록은 `review/ai-product-revision/QA.md`, 이전 전체 코멘트의 기록은 `review/revision-v3/QA.md`에 보관합니다.

2026-09-30의 추가 코멘트로 AI 원본 보기 버튼과 연결된 두 dialog, 상단 문의 메뉴를 제거했습니다. 남은 메뉴는 기존 flex 정렬로 우측에 모입니다. 하단 연락처는 유지합니다. 이 변경은 정적 참조 검사와 공개 PC 화면으로 검증합니다.

추가 시각 수정은 공식 로고의 흰 배경을 SVG 마스크로 제거하고, 기록 목업의 하단 마스크를 PC에서도 적용합니다. 상점주 장소·지도 확대는 이미지를 최종 표시 크기로 렌더링해 축소 레이어 재확대를 피합니다. 원본 UI 픽셀과 카메라 구도는 보존합니다. 컨설팅 라벨은 `Pingdom Consulting`으로 바꿉니다. 관련 검사와 1203×870 PC 화면·배포 기록은 `review/visual-fixes-8/QA.md`에 기록합니다.

Consulting 소개 다음에는 가게 핀으로 줌인하고 도시 야경 위를 옆방향으로 비행하며 여러 핀이 등장합니다. 사용자가 제공한 900×600 야경을 AI로 복원·가로 확장한 2103×748 이미지를 바탕으로 만든 9초·FullHD·60fps 무음 MP4입니다. `assets/consulting-flight/seoul-night-flight.mp4`의 영상 시간을 스크롤 진행도에 맞추므로 앞으로 스크롤하면 다음 프레임으로, 역스크롤하면 앞 프레임으로 돌아갑니다. `assets/consulting-flight/seoul-night-poster.webp`를 영상 포스터로 사용합니다.

준비된 비행 장면은 .78 구간에서 전환과 읽기를 포함해 1100ms 한 번 정지하며 기존 10개 750ms 정지는 유지합니다. 동작 줄이기와 자산 실패에서는 원래 소개를 읽을 수 있습니다. FullHD 출력은 원본의 촬영 정보가 늘었다는 뜻이 아니며, 핀은 실제 업체·분석 결과를 표시하는 데이터가 아닙니다. 출처와 원본 파일은 [ASSETS.md](ASSETS.md), 최종 연출은 `review/consulting-flight-9/REFERENCE.md`, 검증 기록은 `review/consulting-flight-9/QA.md`에 기록합니다.

## Consulting 글로벌 전환: v10 제작 기록

새 16초 영상은 가게 핀 줌인에서 더 긴 도시 야경 비행으로 이어지고, 마지막에는 지구와 여러 핀을 보여줍니다. 제작 composition은 `review/consulting-flight-10/global-flight-video`입니다. 새 야경은 실제 2172×724 파노라마와 각각 1536×1024인 왼쪽·중앙·오른쪽 중첩 생성 이미지로 구성합니다. 지구는 Three.js를 사용해 영상에 렌더링하며 웹에는 별도 Three.js 실행 코드를 연결하지 않습니다.

웹은 450svh Consulting stage의 .58~.95 진행도를 영상 시간 0~16초에 대응시킵니다. 도시 구도 .78은 영상 약 8.6486초, 지구 완성 구도 .95는 16초에 대응하며 두 구도에서 각각 1100ms 한 번 정지합니다. 기존 10개 750ms 정지와 역스크롤 복원·동작 줄이기·자산 실패 복구는 유지합니다.

렌더와 웹 인코딩을 완료했으며 두 영상 모두 16초·60fps·960프레임·무음 H.264 High·yuv420p입니다. 보관용 master는 `review/consulting-flight-10/global-flight-video/renders/global-flight-master.mp4`(3840×2160·179,397,004 bytes), 웹 영상은 `assets/consulting-flight/seoul-global-flight.mp4`(2560×1440·61,980,621 bytes)입니다. 포스터 `seoul-global-poster.webp`는 2560×1440·839,558 bytes이며 `global-manifest.json`에 실제 출력 정보와 SHA256을 기록했습니다.

로컬 파일 감사에서 원본·master·웹 영상·포스터의 실제 치수·바이트·해시가 manifest와 일치했습니다. 웹 영상의 GOP15·키프레임 64개·무B프레임·무음·faststart를 확인했습니다. 공개 배포와 실제 브라우저 검증 결과는 별도로 기록하며, 앞의 9초 영상 설명과 `review/consulting-flight-9/QA.md`는 이전 단계의 기록으로 보존합니다.

도시 이미지의 보완 디테일은 AI 생성 결과입니다. 지구 텍스처는 [NASA Earth Observatory의 Blue Marble: Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/) June 2004 합성 지표(5400×2700)이며 제작자는 Reto Stöckli, NASA Goddard Space Flight Center입니다. 현재 위성 화면을 뜻하지 않습니다. 도시와 지구의 핀은 개념 연출이며 실제 업체 위치, 글로벌 운영 범위나 실시간 분석 결과를 뜻하지 않습니다. 원본 치수·NASA 출처·재사용 기준은 [ASSETS.md](ASSETS.md), 상세 제작 기록은 composition의 `MEDIA.md`와 `BRIEF.md`를 기준으로 기록합니다.

공개 프로덕션의 v10 자산 감사가 통과했습니다. 루트·index·app·AI CSS/모듈·scroll-stops·영상·포스터·manifest의 익명 응답 9개가 모두 HTTP 200이고 전체 바이트 수·SHA256·MIME이 로컬 파일과 일치합니다. revision-10 연결과 영상 첫·마지막 1024바이트의 HTTP 206 Range 응답도 확인했습니다. 상세 증거는 [public-assets-audit.json](review/consulting-flight-10/public-assets-audit.json)이며 실제 브라우저 동작 검증과 구분합니다.

## Consulting 공식 핀 교체: v11 제작 기록

도시·지구·웹 사진 fallback의 핀을 사용자 첨부 공식 로고를 참조한 하나의 투명 자산으로 교체했습니다. 생성 PNG와 lossless WebP는 실제 1254×1254이며 디코딩 RGBA가 정확히 일치합니다. 원형 중심은 alpha 0이고 정사각형 비율·하단 tip anchor를 유지합니다. 기존 흰 중심과 자체 SVG/CanvasShape, 채워진 도시 바닥 장식을 제거했습니다. 첨부 원본은 `review/consulting-flight-11/official-pin-reference.png`에 보존하며, 원본과 생성 파생의 픽셀·색 완전 일치를 주장하지 않습니다.

제작 composition은 `review/consulting-flight-11/brand-pin-video`입니다. v10의 도시 패널·NASA 지구·카메라·등장 시점·16초 흐름과 웹 스크롤 매핑·정지는 유지합니다. 두 새 영상은 16초·60fps·960프레임·무음 H.264 High·yuv420p·BT.709입니다. 보관용 `brand-pin-master.mp4`는 3840×2160·178,848,303 bytes, 배포용 `assets/consulting-flight/seoul-global-flight-brand.mp4`는 2560×1440·61,840,413 bytes입니다. 새 포스터 `seoul-global-poster-brand.webp`는 2560×1440·836,954 bytes, 웹 로고 `pingdom-pin-clean.webp`는 1254×1254·342,672 bytes입니다.

`assets/consulting-flight/brand-manifest.json`과 실제 원본·composition·master·웹 영상·포스터·로고의 치수·바이트 수·SHA256이 일치합니다. 웹 영상의 GOP15·키프레임 64개·무B프레임·무음·PTS/DTS 일치·faststart와 PNG/WebP alpha·RGBA 검증도 통과했습니다. 증거는 [local-assets-audit.json](review/consulting-flight-11/local-assets-audit.json)에 기록했습니다. 이번 파일 감사에는 공개 배포·브라우저 재생·스크롤·실측 FPS가 포함되지 않습니다.

공식 로고 참조·파생 방식과 실제 크기는 [ASSETS.md](ASSETS.md), 이미지 요청은 `review/consulting-flight-11/IMAGE-PROMPT.md`에 기록합니다. 도시의 AI 재구성 범위·NASA June 2004 지표 출처·개념 핀의 의미는 앞의 v10 기록을 유지하며 이전 자산과 QA 결과는 보존합니다.

공개 v11 자산 감사가 통과했습니다. 공개 alias의 루트·index·app·AI CSS/모듈·scroll-stops·새 영상·포스터·로고·manifest 응답 10개가 모두 익명 HTTP 200·정상 MIME이고 전체 바이트 수·SHA256이 로컬과 일치합니다. revision-11 참조와 원격 manifest, 영상 앞·뒤 1024바이트 HTTP 206 Range 응답도 확인했습니다. 쿠키·인증·보호 우회 없이 공개 alias만 사용했습니다. 상세 결과는 [public-assets-audit.json](review/consulting-flight-11/public-assets-audit.json)이며 실제 브라우저 동작·실측 FPS 검증과 구분합니다.

## Consulting 지구 네트워크: v12 제작 기록

새 22초 composition은 `review/consulting-flight-12/network-flight-video`입니다. 사용자 참조의 큰 하단 돔·남색·흰 지리점·얇은 격자를 적용하고, 중앙 허브에서 경로가 차례로 자라며 신호가 흐르는 구성입니다. manifest 시간 구간은 0–8.5초 도시 비행, 8.5–12초 돔 연결, 12–20초 네트워크 확장, 20–22초 완성 구도 유지입니다. 현재 운영 국가나 판매 실적을 표현하지 않습니다.

기존 야경 패널·공식 핀 PNG를 그대로 재사용하며 지리점은 NASA June 2004 Blue Marble 원본에서 구성한 `nasa-land-points.json`을 사용합니다. 이 데이터의 파일 해시·NASA 출처 해시·27,563점×3개 좌표·유한값 검사는 통과했습니다. 실제 투영·샘플링 정확도와 경로 기하를 검증한 결과는 아닙니다. 사용자 디자인 참조는 실제 1727×739이며 출처·NASA credit·로고 파생 범위는 [ASSETS.md](ASSETS.md)와 composition의 `MEDIA.md`에 기록합니다.

두 새 영상은 22초·60fps·1320프레임·무음 H.264 High·yuv420p·BT.709입니다. 보관용 `network-flight-master.mp4`는 3840×2160·162,697,502 bytes, 배포용 `assets/consulting-flight/seoul-network-flight.mp4`는 2560×1440·65,363,141 bytes입니다. `seoul-network-poster.webp`는 2560×1440·861,870 bytes입니다.

로컬 감사에서 `network-manifest.json`과 15개 관련 파일의 실제 규격·바이트 수·SHA256이 일치했습니다. 웹 영상의 GOP15·키프레임 88개·무B프레임·무음·PTS/DTS 일치·faststart와 공식 PNG/WebP RGBA·alpha 검증이 통과했습니다. 증거는 [local-assets-audit.json](review/consulting-flight-12/local-assets-audit.json)에 기록했습니다. 공개 배포와 실제 브라우저 재생·스크롤·실측 FPS는 이 파일 감사에 포함하지 않으며 앞의 v9·v10·v11 제작·QA 기록은 보존합니다.

공개 v12 자산 전달 감사가 통과했습니다. 공개 alias의 루트·index·app·AI CSS/모듈·scroll-stops·새 영상·포스터·공식 로고·network-manifest 응답 10개 모두 익명 HTTP 200·정상 MIME이고 전체 바이트 수·SHA256이 로컬과 일치합니다. revision-12 연결과 원격 manifest, 영상 앞·뒤 1024바이트의 정확한 HTTP 206 Range 응답도 확인했습니다. 인증·쿠키·보호 우회·개별 배포 URL·redirect는 사용하지 않았습니다. 증거는 [public-assets-audit.json](review/consulting-flight-12/public-assets-audit.json)이며 실제 브라우저 동작·실측 FPS·지리 정확도 검증과 구분합니다.

### revision-12a 재배포 기록

v12 실제 브라우저에서 발견한 지구 완성 구도 정지 누락에 대응해 `ai-pages.mjs`·`scroll-stops.mjs`와 모듈 cache 참조를 보완했습니다. 영상 자산과 manifest는 유지합니다. 배포 `dpl_24Wqu52YiRJP4c2Gq9C27shCpf3e`의 READY 이후 공개 alias에서 revision-12a 응답 10개의 HTTP 200·MIME·전체 바이트 수·SHA256, 수정 모듈 참조와 원격 manifest 일치를 확인했습니다. 영상 앞·뒤 1024바이트의 HTTP 206 Range도 통과했습니다. 인증·쿠키·보호 우회·개별 배포 URL·redirect는 사용하지 않았습니다. 새 증거는 [public-assets-audit-12a.json](review/consulting-flight-12/public-assets-audit-12a.json)에 저장하고 기존 v12 보고서는 보존합니다. 파일 전달 감사와 완성 구도 정지의 실제 브라우저 검증은 구분합니다.

## Consulting 먼 항공뷰·지구 간소화: v13 생성 원본 기록

v13은 더 높은 시점의 연속 도시 야경 한 장과 간결한 점 지구 구도로 수정하는 단계입니다. 새 야경은 기존 v12 AI 생성 중앙 패널을 참조해 만든 실제 2172×724 PNG RGB입니다. 소개 일러스트의 기존 핀을 제거한 베이스는 1536×1024 PNG RGBA이며 실제 투명도를 확인했습니다. 두 파일 모두 도구 반환 원본과 전체 바이트·SHA256이 일치합니다.

요청한 3840×1280과 실제 생성 해상도를 구분하고, 이후 4K master 렌더 크기를 이미지 native 해상도로 표현하지 않습니다. 생성 도시의 세부·촬영 고도와 핀·연결망은 연출이며 실제 지리 정보·글로벌 운영 범위·실시간 분석 결과가 아닙니다. [Toss 공식 홈페이지](https://toss.im/)의 마지막 글로벌 섹션은 시각 참고이며 Toss의 점 데이터·이미지·영상·코드를 제작 자산에 복사하지 않습니다. 기존 NASA 지표와 공식 핀 출처는 유지합니다.

생성 prompt 원문·입력 경로·실제 크기·alpha·SHA256은 [imagegen-prompts.md](review/consulting-flight-13/imagegen-prompts.md)와 [ASSETS.md](ASSETS.md)에 기록합니다. 현재 감사는 이미지 원본과 복사 일치에 한정합니다. 최종 composition freeze·영상 출력·manifest·익명 공개 HTTP/Range 결과는 완료 후 별도 실제 파일로 기록하며 이전 v12·revision-12a 검증 증거는 보존합니다.

### v13 최종 출력·로컬 감사

최종 v13 소스는 `review/consulting-flight-13/network-flight-video`이며 freeze된 11개 파일의 SHA256이 모두 일치합니다. 두 영상은 실제 22초·60fps·1320프레임·무음 H.264 High·yuv420p·BT.709입니다. 보관용 `network-flight-master.mp4`는 3840×2160·197,715,537 bytes, 웹 `assets/consulting-flight/seoul-global-flight-v13.mp4`는 2560×1440·83,800,740 bytes입니다. `seoul-global-poster-v13.webp`는 웹 영상 0초 프레임의 순수 형식 변환이며 2560×1440·1,085,054 bytes입니다. 4K는 master 렌더 출력이며 야경 생성 원본은 실제 2172×724입니다.

도시 비행 0–7.8초 이후 full-bleed 전환과 지구 등장 9.5–11.15초, 32개 연결 경로의 순차 확장 11.5–20초, 16–20초 추가 카메라 후퇴, 20–22초 완성 구도 유지로 구성합니다. 지리점은 기존 NASA 지표를 참조하는 실제 34,735점 JSON입니다. 점의 SHA·출처 hash·개수×3·유한값·선언된 jitter 파라미터는 검사했으며 투영·샘플링·경로 기하 정확도 검증과 구분합니다.

새 `network-manifest-v13.json`과 [local-assets-audit.json](review/consulting-flight-13/local-assets-audit.json)에 실제 metadata·해시를 기록했습니다. 관련 파일 20개와 별도 source freeze 11개, 웹 GOP15·키프레임 88개·무B프레임·무음·PTS/DTS 일치·faststart, 공식 PNG/WebP RGBA 및 새 노핀 alpha 감사가 통과했습니다. v12 영상·manifest·검증 기록은 그대로 보존합니다. 이 로컬 파일 감사에는 장면 품질·브라우저 동작·실측 FPS·공개 배포 검증이 포함되지 않습니다.

### v13 공개 전달 검증

배포 `dpl_CrNHfJDj7q5rrfcJQrGtdkE4Wb4M`의 READY 후 [공개 Pingdom alias](https://pingdom-landing.vercel.app/)에서 응답 11개를 익명 감사했습니다. HTML·app·AI CSS/모듈·scroll-stops·영상·포스터·로고·노핀 PNG·manifest 모두 HTTP 200·MIME·전체 바이트 수·SHA256이 로컬과 일치합니다. revision-13 참조와 원격 manifest 전체 내용·version13, 영상 앞·뒤 1024바이트의 정확한 HTTP 206 Range도 통과했습니다.

상세 증거는 [public-assets-audit.json](review/consulting-flight-13/public-assets-audit.json)에 기록합니다. 인증·쿠키·보호 우회·개별 deployment URL·redirect 없이 공개 alias만 사용했으며 기존 v12 증거는 보존합니다. 이번 감사는 파일 전달 결과이며 실제 브라우저 재생·빠른 스크롤 정지·역방향 복원·실측 FPS 검증과 구분합니다.


## v14 바로 지구로·제품 표시 가독성

Consulting은 도시 사진과 건물 모델을 제거하고 첫 프레임부터 점 지구가 보이는 12초 구성으로 바꿨습니다. 지구 드러남 0–1.8초, 32개 경로 순차 연결 1.8–7.18초, 카메라 후퇴 7.2–10.5초, 완성 구도 유지 10.5–12초입니다. 기존 NASA June 2004 지표와 34,735개 지리점·공식 핀을 재사용하며 Toss 자산은 복사하지 않습니다. 120,000은 표본 수이고 34,735는 실제 육지·빙하 점 수입니다. 경로는 확장 목표의 개념 표현이며 현재 글로벌 운영 국가·실적을 표시하지 않습니다. 기존 v13 자산과 검증 증거는 보존합니다.

새 웹 파일은 `assets/consulting-flight/seoul-globe-flight-v14.mp4`, `seoul-globe-poster-v14.webp`, `network-manifest-v14.json`입니다. master는 3840×2160·65,430,843 bytes, 웹은 2560×1440·25,437,581 bytes이며 둘 다 실제 12초·60fps·720프레임·무음 H.264 High·yuv420p·BT.709입니다. 웹 GOP15·키프레임 48개·무B프레임·PTS/DTS 일치·faststart가 통과했습니다. 포스터는 master의 11초 frame660을 Lanczos로 2560×1440에 변환한 lossless WebP로 1,152,698 bytes이며 변환 픽셀 일치를 확인했습니다.

기기 화면은 기존 1800×3680 native 제품을 유지하고 두 기기 전체가 겹치지 않는 exclusive fade와 단일 원본 프레임으로 표시합니다. 장소명·주소·연락처의 지정 블러는 유지하며 사진 두 영역은 기존 소개용 생성 카페·골목 사진을 DOM overlay로 담습니다. 소개 사진은 실제 등록 장소 사진이 아니고, 원본 제품 UI 파일은 수정하지 않습니다.

상점주 등록·이벤트는 실제 PNG 원본의 no-resize lossless crop 1100×596·1100×634를 직접 표시합니다. 최대 1100px frame·등록 이미지의 위아래 19px 흰 여백·정착 이후 transform 제거·outline으로 원래 비율과 DPR 1 native 내부 폭을 유지합니다. 중간 카메라 확대와 두 UI의 중첩을 제거했습니다. 더 높은 DPR에서 원본에 없는 상세를 복구했다는 의미는 아닙니다. 두 crop는 WebP 디코딩 RGBA가 원본 crop와 전 픽셀 일치합니다.

출처·실제 bytes/SHA256·표시 방식은 [ASSETS.md](ASSETS.md), [product-native-audit.md](review/consulting-flight-14/product-native-audit.md), [merchant-focus-assets-audit.json](review/consulting-flight-14/merchant-focus-assets-audit.json)에 기록합니다. 최종 source freeze 10개와 [local-assets-audit.json](review/consulting-flight-14/local-assets-audit.json)의 관련 파일 35개 감사가 통과했으며 새 manifest는 15,434 bytes입니다. 이 감사는 로컬 metadata·해시·manifest·영상 packet·native crop/포스터 픽셀·지리점 JSON 구조에 한정하고 실제 브라우저 재생/스크롤·실측 FPS·공개 HTTP 결과와 구분합니다. 공개 READY 이후 파일 전달 감사는 별도로 추가합니다.


### v14 공개 전달 검증

배포 `dpl_AvjdQKxNCR5jgkkWKbs8CDQWRWqs`의 READY 후 [공개 Pingdom](https://pingdom-landing.vercel.app/)에서 19개 응답을 익명 감사했습니다. HTML·변경 CSS/모듈·새 영상/포스터/manifest·제품 crop/native·소개 사진·공식 로고의 HTTP 200·MIME·전체 bytes/SHA256이 로컬과 일치합니다. revision-14와 새 활성 참조 22개·원격 manifest JSON 전체가 일치하며 Consulting에서 이전 도시 영상·건물 베이스 참조가 제거됐습니다. 영상 앞뒤 1024바이트의 HTTP 206·정확한 Content-Range·로컬 본문도 일치합니다.

증거는 [public-assets-audit.json](review/consulting-flight-14/public-assets-audit.json)에 기록합니다. 인증·쿠키·보호 우회·보호된 개별 배포 URL·redirect 없이 공개 alias만 사용했고 원격 미디어를 저장하지 않았습니다. 이 결과는 파일 전달 검증이며 실제 브라우저 재생/스크롤·실측 FPS·지리 정확도와 구분합니다. 이전 기록은 덮어쓰지 않았습니다.


### revision-14.1 최종 전달 검증

상점주 첫 정지의 실제 진행도 약 0.19997에서 미세 transform이 남는 경계를 해결하기 위해 정착 기준을 `p>=.19`로 보완했습니다. app·desktop-polish cache만 `revision-14.1`로 바꾸고 다른 모듈·CSS·영상·포스터·제품 crop는 v14 그대로 유지합니다. 이전 manifest 본문과 초기 로컬/공개 증거를 보존한 뒤 현재 manifest의 runtime snapshot·혼합 cache graph만 갱신했습니다. 현재 manifest는 16,360 bytes이며 [local-assets-audit-14-1.json](review/consulting-flight-14/local-assets-audit-14-1.json)의 관련 파일 35개 감사가 통과했습니다.

최종 배포 `dpl_3nKbxCCP93Kqv3vkN9XncTfxrTrf`의 READY 후 공개 alias의 19개 응답에서 HTTP 200·MIME·전체 bytes/SHA256·활성 참조 22개·원격 manifest 전체 내용이 일치했습니다. 영상 앞뒤 1024바이트의 HTTP 206·Content-Range·로컬 본문도 일치합니다. 새 증거는 [public-assets-audit-14-1.json](review/consulting-flight-14/public-assets-audit-14-1.json)입니다. 인증·보호 우회 없이 공개 alias만 요청했고 초기 v14 보고서는 보존했습니다. 이 결과는 파일 전달 감사이며 실제 브라우저의 정지/재생·실측 FPS와 구분합니다.


### revision-14.1 실제 공개 브라우저 확인

공개 alias를 1766×982·DPR 1에서 재확인했습니다. 첫 상점주 정지는 `merchantSettled=true`·`transform:none`·1100×634 frame이며 등록 opacity 1·이벤트 0·가로 overflow 0입니다. Consulting 건물 모델은 없고 영상은 2560×1440·readyState 4로 준비됐습니다. 빠른 스크롤에서 network·global 정지를 확인했으며 영상 시간은 7.178741초→11.898053초, 역방향은 9.385062초로 복원됐습니다. 담당 브라우저 검증에서 warning/error console은 빈 배열이었습니다. 증거는 [merchant-first-stop-final.json](review/consulting-flight-14/merchant-first-stop-final.json), [browser-states.json](review/consulting-flight-14/browser-states.json) 및 같은 디렉터리의 공개 화면 PNG입니다. 이 결과는 해당 PC viewport의 실제 동작 확인이며 실측 FPS 검증을 포함하지 않습니다.

## v15 전체 제품 UI 재제작·소개 흐름 복원

앱 UI 3개와 상점주 웹 UI 2개를 코드-native 그래픽으로 새로 제작했습니다. 앱은 2250×4600의 SVG/path 글자·PNG·lossless WebP와 단일 기기 프레임을 사용하고, 상점주는 전체 UI를 7456×4016 lossless WebP와 편집 가능한 SVG로 제공합니다. 저해상도 screenshot의 확대나 사진만 바꾼 결과가 아닙니다. 기존 화면의 기능과 필드 구성을 참고한 소개용 재제작 자산이며 원본 캡처와 픽셀 완전 일치를 주장하지 않습니다.

사진 재료는 내장 imagegen으로 만든 1536×1024 카페·골목·공연장·팝업 사진 4개입니다. 앱 UI 안에서만 소개 사진으로 사용하며 실제 장소·행사·방문자 촬영 증거가 아닙니다. UI의 글자·아이콘·선·프레임은 사진과 분리해 코드로 그렸습니다. 활성 제품 자산은 `assets/product-hq-v15/`에 있고 제작 코드·editable 원본·감사는 `review/consulting-flight-15/phone-ui-src/`와 `merchant-ui-src/`에 보존합니다.

상점주는 전체 등록 → 등록 상세 확대 → 전체 이벤트 화면의 원래 흐름을 복원했습니다. 기존 `.20/.50/.86` 읽기 지점과 카피 전환을 유지하며, 상세 패널은 원래 좌표를 기준으로 약 1.6945배 확대합니다. 고밀도 자산을 확대된 레이아웃 크기에서 표시하여 글자 선명도를 확보합니다.

Consulting은 기존 3D 동네 모델과 공식 핀을 복원했습니다. 모델과 핀을 함께 최대 1.4배만 확대하고 도시 사진 없이 v14 지구로 바로 전환합니다. 기존 12초 지구 영상·32개 개념 연결선·추가 줌아웃을 재사용하며 새 영상은 렌더하지 않았습니다. 지구의 출처와 개념 핀/경로의 의미는 기존 기록을 유지합니다.

상점주 관련 검사 30개와 Consulting 관련 검사 13개 통과 기록은 각 담당 QA에 있습니다. 자산 실제 크기·생성 방식·원본과의 구분은 [ASSETS.md](ASSETS.md)에 추가할 v15 기록과 제작 감사 JSON을 기준으로 확인합니다. **1331×982 실제 로컬/공개 화면 검증과 배포 READY, 공개 HTTP/SHA/Range 검증을 완료했습니다.** 실제 스크롤로 앱3개·웹3개·Consulting 모델/지구 구도와 역스크롤을 확인했으며 기록 구도 overflow0·console warning/error0입니다. [최종 QA](review/consulting-flight-15/QA.md)에 증거를 보존합니다. 모바일·다른 브라우저·실기기 성능은 이번 검증 범위에 포함하지 않습니다. 이전 v14·revision-14.1 기록은 보존합니다.

## 애니메이션 장면별 250ms 정지: v16

모든 PC 애니메이션의 12개 읽기 구도를 각각 250ms로 통일했습니다. 빠른 연속 입력도 가까운 미소비 구도부터 한 번씩 정지하고, 관성 입력은 시간을 늘리거나 초과 이동을 쌓지 않습니다. Consulting은 정지 중에만 목표 구도에 빠르게 수렴해 네트워크와 최종 화면을 놓치지 않도록 보완했습니다. 관련 검사 33개, 정적 검사, 로컬·공개 PC 1331×982 native 스크롤, 공개 변경 파일 4개의 익명 바이트/해시 비교를 확인했습니다. 상세 범위와 증거는 [v16 QA](review/scroll-stops-16/QA.md)에 기록합니다. 이전 단계의 시간 표기는 제작 이력으로 보존합니다.

## 앱 기능 소개 5개 화면과 원본 해상도: v17

앱 소개를 장소 정보 → 커뮤니티 → 방문 검증 → 예약 → 여행 기록의 다섯 장면으로 확장했습니다. 사용자가 제공한 P1/P2/P3/ㅖ4/P5의 전체 UI를 비율 그대로 단일 기기 프레임에 배치하며, 한 번에 화면 하나와 해당 설명만 표시합니다. 모든 장면에 동일한 프레임·크기·위치를 사용합니다.

첨부 원본은 1608×3496이며 검증 화면만 1608×3512입니다. 출력은 2250×4600 PNG/lossless WebP이고, 원본 이미지 바이트를 SVG에 그대로 포함했습니다. 현재 최대 기기 폭 340 CSS px에서 원본 UI 자체가 화면 폭의 최소 5.29배입니다. 2250px 출력 크기만으로 화질을 주장하지 않으며, 원본의 글자·사진·내용을 재생성하지 않았습니다. 제작 코드·원본·픽셀 감사는 [앱 제작 기록](review/app-features-17/phone-ui-src/README.md)과 [manifest](dist/assets/product-hq-v17/manifest.json)에 보존합니다.

앱 정지는 `.06/.28/.50/.72/.94`이며 기존 250ms를 유지합니다. 전체 PC 읽기 구도는 14개입니다. 직접 관련 검사 85개와 정적 배포 검사를 통과했고, 로컬 1331×982에서 다섯 화면·전체 14개 정지·역방향 복원·가로 overflow 0을 확인했습니다. 공개 전달 및 브라우저 검증의 최종 증거는 [v17 QA](review/app-features-17/QA.md)에 기록합니다. 모바일·다른 브라우저·실기기 성능은 이번 검증 범위에 포함하지 않습니다.

배포 `dpl_GnGqCEXsNZFdUqaFgdhGex6qSReg`의 READY 이후 공개 alias에서 변경 파일14개 HTTP200·MIME·전체bytes/SHA256과 manifest/활성 참조가 로컬과 일치했습니다. 공개 PC1331×982에서 앱5개와 전체14개 정지·공통 프레임 비율·원본 해상도·overflow0·console warning/error0을 확인했습니다. [파일 전달 감사](review/app-features-17/public-assets-audit.md)와 [브라우저 감사](review/app-features-17/browser-audit.json)에 결과를 보존합니다.

## 앱 글자 선명도 수정: revision18

정착 구도에 남아 있던 원근·Y/Z 회전과 전체 이미지 drop-shadow 필터 때문에 정면 표시보다 글자와 아이콘이 흐렸습니다. 동일한 v17 목업의 정면 비교에서 선명도를 확인한 뒤 다섯 앱을 `transform:none`·`filter:none`으로 표시하고 그림자는 외곽 box-shadow로 분리했습니다. 2250×4600 자산·설명·다섯 장면 순서·250ms 정지는 보존하며 visit CSS만 revision18로 갱신했습니다. 원본 PNG의 402px 중간 축소는 자산 감사에서 재현되지 않았습니다.

CSS와 참조만 수정해 JS 단위테스트는 재실행하지 않았습니다. 정적 검사와 실제 브라우저 확인은 [revision18 QA](review/app-quality-18/QA.md), 동일 크기 비교는 [비교 화면](review/app-quality-18/comparison.png)에 보존합니다. 이전 v17의 해상도 수치와 픽셀 일치는 실제 3D 렌더의 선명도를 보증하지 않습니다.

### 앱 소개 다음의 강점 카드: revision19

다섯 앱 기능 소개 바로 뒤, 플랫폼 앞에 `#strengths`를 배치했습니다. 취향 추천·방문 전 정보·사진과 추천 이유·예약·커뮤니티·상점주 소식의 여섯 강점을 HTML/SVG 예시 UI로 설명합니다. 기존 사진 두 장만 재사용하며 UI 글자는 이미지로 굽지 않습니다.

`strengths.mjs`는 세로 스크롤 위치에서 카드의 가로 이동과 내부 UI의 순차 정착 상태를 계산합니다. 준비된 PC 장면은 기존 250ms 컨트롤러의 여섯 정지점에 연결되며, 좁은 화면·동작 줄이기·JS 미작동에서는 정적 카드 목록을 표시합니다. 별도 라이브러리나 영상 파일은 추가하지 않습니다. 브라우저 및 공개 전달 증거는 `review/strengths-19/`에 보존합니다.

### 강점 카드 재디자인: revision20

앱 기능 소개 바로 다음의 강점 카드 여섯 개를 새로 구성했습니다. 각각 세로 사진 한 장이 카드 전체를 채우고 큰 제목·설명·단일 기능 표시가 그 장면 안에 이어집니다. 작은 썸네일과 파스텔 패널 안의 중첩된 작은 UI는 제거했습니다. 사진 여섯 장은 내장 imagegen으로 새로 제작했으며 글자와 핀은 native HTML/SVG로 표시합니다.

기존 `strengths.mjs`의 가로 이동·역방향 복원과 `scroll-stops.mjs`의 250ms 정지 여섯 개는 그대로 사용합니다. 새 라이브러리·동영상이나 앱 화면 재제작은 포함하지 않습니다. `strengths.css`의 공개 참조만 revision20으로 갱신했습니다. 변경 전 HTML/CSS, 생성 프롬프트·freeze·PC 브라우저/공개 자산 확인은 `review/strengths-20/`에 보존합니다. 실제 확인 범위는 [revision20 QA](review/strengths-20/QA.md)를 따릅니다.

## 카드 간소화와 한국에서 세계로: revision21

카드 상단의 번호·영문·장식 핀, 첫 카드 중앙 핀, 하단 보조 설명·진행 표시와 섹션 우측 소개 문구를 삭제했습니다. 각 카드의 메인 제목과 기존 1024×1536 사진은 유지합니다. 섹션 라벨은 `핑덤만의 차이`로 바꾸고, AI에는 기존 공식 꽃 심볼을 사용하며 예약 패널은 완료·일시·인원으로 구성했습니다.

Consulting의 3D 모델 이후에는 한국을 확대해서 시작하는 새 지구 영상으로 연결됩니다. 한국에서 선이 펼쳐지며 세계로 후퇴하고, native 제목은 `발견의 범위를.` → `전 세계로.`로 바뀝니다. 기존 모델·네트워크·세계 읽기 구도에 한국 1.2초 구도를 추가해 총 21개의 PC 정지가 각각 250ms 유지됩니다. 제작 원본과 검증 범위는 [revision21 QA](review/revision-21/QA.md)에 보존합니다.

revision21 공개 배포 `dpl_F1npEMLPz3Q4EJQj8CTjhYVjeGMH`는 READY입니다. 공개 [Pingdom](https://pingdom-landing.vercel.app/#strengths)에서 카드 6개와 Consulting 모델·한국·네트워크·세계 정지 및 제목 전환을 PC 1331×982에서 확인했습니다. 공개 파일 20개 전체 바이트/SHA256과 MP4 앞/뒤 Range 응답이 일치합니다. 상세 범위와 화면 증거는 [revision21 QA](review/revision-21/QA.md)에 기록합니다.

## 지구의 선과 지도 밀도 개선: revision22

한국 확대에서 연결선과 이동점이 함께 굵어지는 문제를 해결했습니다. 경로를 화면 폭으로 계산하고 지도 점 수·격자·이동점의 밝기를 낮춰 한국 윤곽과 공식 핀이 먼저 보이도록 조정했습니다. 카메라 이동·32개 경로·제목 전환·250ms 정지는 유지하며 index와 AI fragment의 영상·포스터 참조 세 개만 교체했습니다.

새 웹 영상은 2560×1440·60fps·12초이며 33.50MB입니다. 기존 v21보다 54.85% 작아졌고 같은 CRF18·GOP12·무B프레임을 유지합니다. 이번 변경은 영상과 HTML 참조에 한정되어 JS 단위테스트는 다시 실행하지 않았습니다. 정적 검사와 실제 PC 브라우저/공개 전달 결과는 [revision22 QA](review/revision-22/QA.md)에 기록합니다.

revision22 production `dpl_DC43XrpbeQWCLPvwHvxiEVkFPJUA`는 READY입니다. 공개 [Pingdom AI](https://pingdom-landing.vercel.app/#ai)에서 1331×982 PC 화면의 한국·네트워크·세계 정지와 제목 전환을 확인했고 console warning/error와 가로 overflow는 없습니다. 공개 파일 12개 전체 bytes/SHA256 및 MP4 앞·뒤 Range 응답도 일치합니다.

## 선으로 표현한 지구와 브랜드 네트워크: revision24

입자 지도를 실제 해안선과 위도·경도선으로 교체했습니다. 한국 확대는 세밀한 동아시아 해안선을 사용하고, 네트워크 확장과 세계 줌아웃에서는 대륙 윤곽과 구면이 함께 보입니다. 연결선은 출력 기준 0.8px에서 1.7px로 높이고 브랜드 토큰 `#FF1956`을 적용했습니다. 카메라·32개 경로·3D 모델·제목 전환·250ms 장면 정지는 유지합니다.

새 영상은 2560×1440·60fps·12초, 18,171,668 bytes이며 4K 원본과 이전 자산을 보존합니다. production `dpl_Hid2sw6dSfzMJNbFJej1ku7a6b2L`는 READY이고 공개 파일 12개 전체 bytes/SHA256 및 영상 앞·뒤 Range 응답이 일치합니다. 이번 변경은 영상과 HTML 참조에 한정되어 JS 단위테스트를 재실행하지 않았습니다. 정적 검사·실제 PC 화면·검증 경계는 [revision24 QA](review/revision-24/QA.md)에 기록합니다.

## revision25 글로벌 비전 분리

컨설팅은 기존 3D 모델 소개로 종료하고, 바로 다음에 “좋은 장소의 발견에, 경계가 없도록.”라는 독립 글로벌 비전 섹션을 추가했습니다. 같은 배경과 핀 위치에서 한국 지도가 펼쳐진 뒤 기존 v24 지구의 브랜드 연결선·세계 줌아웃으로 이어집니다. 각 장면의 250ms 정지와 역방향 복원을 유지합니다.

production `dpl_ESTsgwWwLVvkos95XLPt4Ge3RSxo` READY. 관련 Node 테스트 113개와 정적 검사, 로컬·공개 PC 1331×982 전환 흐름 및 익명 공개 파일 12개 bytes/SHA256·MP4 앞뒤 Range 검사가 통과했습니다. 영상·두 포스터·manifest는 v24 원본을 유지합니다. [공개 글로벌 비전](https://pingdom-landing.vercel.app/#global-vision), [revision25 QA](review/revision-25/QA.md).

## revision26 강점 카드 8개

앱 기능 소개 다음의 강점 카드에 개인 여행 달력과 조건 기반 상권 상담을 추가했습니다. 기존 6개 사진·문구와 전체 사진 디자인을 유지하며, 8개 완성 구도에서 각각 250ms 정지합니다. 두 새 사진은 1024×1536으로 제작했고 중앙 UI는 HTML/CSS/SVG로 표시합니다.

production `dpl_39U7CK4giQ8YWhLxcoK4XAzjdJC6` READY. 관련 테스트 57개·정적 검사 및 공개 PC 1331×982의 1→8 정지와 역스크롤 복원을 확인했습니다. 새 사진은 표시 크기 대비 최소 2.56배이며 console warning/error와 가로 overflow는 없습니다. 공개 21파일 bytes/SHA256 및 영상 Range가 일치합니다. [공개 강점 카드](https://pingdom-landing.vercel.app/#strengths), [revision26 QA](review/revision-26/QA.md).

## revision27 상점주 웹 전환

사용자가 첨부한 토스 화면 녹화의 움직임을 기준으로 상점주 웹 프레임이 아래에서 올라와 오른쪽 정면에 정착하고, 왼쪽 설명이 위로 교체되며 내부 등록·이벤트 화면이 crossfade하도록 수정했습니다. 정착 이후에는 같은 프레임 위치·크기를 유지하고, 7456×4016 웹 원본을 원래 비율로 표시합니다. 세 완성 구도의 250ms 정지와 이벤트 이미지 준비 지연 시 등록 화면 유지, 역스크롤 복원은 유지합니다.

관련 테스트 80개와 정적 검사가 통과했습니다. 로컬 PC 1331×982에서 진입·세 정착 구도·전환 중간·역스크롤을, 1280×720에서 배치와 다음 섹션으로의 해제를 확인했습니다. 전체 회귀·모바일·실기기 성능 검증은 실행하지 않았습니다. 공개 전달 결과와 화면 증거는 [revision27 QA](review/revision-27/QA.md)에 기록합니다.

## revision28 글로벌 비전의 종료 구도

작은 핀·동심원 소개를 “한 동네에서, 더 넓은 세상으로.”와 큰 한국 지도 구도로 바꿨습니다. 지도에서 네트워크가 펼쳐진 뒤 첨부 참조의 큰 구면에서 “전 세계로.”로 끝납니다. 이후 추가 줌아웃은 제거했습니다. 소개·한국·세계 3개 정지는 각각 250ms를 유지합니다.

v24 4K master에서 첫 7.2초만 사용해 2560×1440·60fps clip과 종료 frame431의 무손실 poster를 제작했습니다. 로컬 PC 1331×982·1280×720에서 최종 프레임, 제목, 빠른 스크롤, 역방향과 배치를 확인했습니다. 검증 결과·공개 전달·제한은 [revision28 QA](review/revision-28/QA.md)에 기록합니다.

## revision29 카드 기본 상태와 글로벌 연결선

강점 카드 8개의 내부 UI를 처음부터 완성 상태로 표시하고 진입점부터 선형 가로 이동하도록 변경했습니다. 첫 정지점은 0이며 나머지 정지점과 250ms 정책을 유지합니다. 플랫폼 사진은 경계 밖 2px를 덮고 세 번째 사진의 창 크롭을 조정했습니다.

글로벌은 v29 영상과 시작·끝 포스터를 사용합니다. 최종 구면은 약 10.7% 작아졌고 연결선은 흰색, 공식 핀은 기존 핑크색입니다. 기존 구간에서 줌 범위를 바꾸며 7.184초의 “전 세계로.” 종료 이후 새 장면은 없습니다. 검증과 공개 전달은 [revision29 QA](review/revision-29/QA.md)에 기록합니다.

### revision30 — 강점 카드 연속 스크롤

강점 카드 구간의 250ms 정지 8개를 제거했습니다. 카드 UI와 가로 이동은 기존 구성을 유지하고 스크롤에 따라 연속 이동합니다. 다른 장면의 250ms 정지 정책은 유지합니다. 검증과 공개 반영 기록은 [revision30 QA](review/revision-30/QA.md)를 따릅니다.

production `dpl_BqMQJQyrP7YXZvoPLMEReesHMoVX` READY. 익명 공개 파일 10개 전체 bytes/SHA256·MIME와 최신 참조를 확인했고, 공개 PC1331×982에서 세 정지·고정 프레임·역스크롤 복원·console warning/error 0·가로 overflow 0을 확인했습니다. [공개 상점주 웹](https://pingdom-landing.vercel.app/#merchant).

### revision31 — 상점주 웹 원근 진입

상점주 웹 화면이 뒤로 기울어진 작은 구도에서 시작해 앞으로 다가오며 정면에 정착하도록 수정했습니다. 정착 시 3D 변환과 원근을 해제해 고해상도 원본을 선명하게 표시합니다. 등록·이벤트 화면 교체와 세 읽기 구도의 250ms 정지, 강점 카드의 연속 스크롤은 유지합니다.

관련 검사 79개와 정적 검사가 통과했고 PC1331×982·1280×720에서 진입·정착·역스크롤을 확인했습니다. 검증 범위와 공개 전달 증거는 [revision31 QA](review/revision-31/QA.md)에 기록합니다.

production `dpl_64FURMBdvFyUPsvKr6Tst2b7taQj` READY. 공개 런타임8파일의 bytes/SHA·MIME와 캐시 참조가 일치하며, 공개 PC1280×720의 기울기·확대·정착 및 등록·이벤트 교체를 확인했습니다. [공개 상점주 웹](https://pingdom-landing.vercel.app/?revision=31-final#merchant).

### revision32 — 글로벌 스크롤 동기화

천천히 스크롤한 뒤 빠르게 넘길 때 지구 영상이 뒤늦게 따라가던 글로벌 진행도 보간을 제거했습니다. 현재 스크롤 위치를 바로 표시하고 종료점에서는 같은 영상의 마지막 poster를 표시합니다. 역스크롤하면 영상을 복원하며 세 장면의250ms 정지와 카드 연속 스크롤은 유지합니다.

관련 검사119개와 정적 검사가 통과했습니다. 실제 PC 스크롤과 공개 반영 결과, 검증 경계는 [revision32 QA](review/revision-32/QA.md)에 기록합니다.

revision32는 production `dpl_HHjVWr7PXUpc1fF9rx5q5prseQg9`(READY)에 반영했습니다. 공개 자산 8개가 검증한 로컬 파일과 SHA256까지 일치하고, 새 PC 브라우저에서 느린 입력 뒤 빠른 이탈 시 진행도 동기화와 종료 프레임을 확인했습니다. 공개 검증 기록: `review/revision-32/QA.md`.

### revision33 — 모바일 화면과 터치 탐색

999px 이하에서 앱 기능5개·강점8개·플랫폼·상점주 웹·AI·글로벌·연락처까지 모바일/태블릿 화면을 구성했습니다. 고해상도 앱/웹 원본을 유지하고 전체 화면 확대·초점 복귀, native 카드 가로 이동과 44px 이상 터치 버튼을 제공합니다. 모바일 PC 고정 장면은 세로 흐름으로 풀고, 글로벌은 짧은 구간의 직접 seek와 최종 poster를 사용합니다. 높이가 낮은 화면에서는 정적 구도를 표시합니다.

관련 검사177개·정적 검사 및 IAB320/360/390/430/768px와 가로844px 화면을 확인했습니다. PC1331×982의 기존 원근 웹과 런타임을 유지합니다. 실기기 iOS/Android 성능 검증은 별도입니다. 공개 전달·구도 증거와 검증 경계는 [revision33 QA](review/revision-33/QA.md)에 기록합니다.

revision33 production `dpl_21wh3q53PDBwAiL4KL4unNBTHVDn` READY. 공개 자산23개 bytes/SHA256·MIME와 영상 Range를 확인했습니다. [공개 모바일 화면](https://pingdom-landing.vercel.app/?revision=33-final#strengths).
