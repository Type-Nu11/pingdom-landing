"""Extract exact source pixels for the Pingdom redesign without recreating UI.

Usage: python scripts/extract-product-assets.py [--neighborhood-source PATH]
Requires Pillow. Original files are read only; derived files go to dist/assets/redesign.
"""

from argparse import ArgumentParser
from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "dist" / "assets"
OUTPUT = ASSETS / "redesign"

# Pillow crop boxes use (left, top, right, bottom), with right/bottom excluded.
# All coordinates were checked against the unchanged source at its native size.
PRODUCTS = (
    ("official-wordmark.webp", "pingdom-wordmark-source.png", (27, 45, 398, 131), "공식 워드마크. 캡처 테두리와 바깥 흰 여백만 제외"),
    ("map-surface.webp", "app-map-source.png", (98, 750, 1704, 2045), "실제 지도와 장소 핀. 대구 구지면 캡처"),
    ("map-search.webp", "app-map-source.png", (126, 339, 1670, 749), "실제 검색창 및 카테고리 바"),
    ("map-recommendations.webp", "app-map-source.png", (120, 2045, 1680, 3245), "실제 추천 장소 bottom sheet. 하단 탐색 바 제외"),
    ("discover-cards.webp", "app-discover-source.png", (159, 2119, 1641, 3010), "실제 추천 장소 카드 2개. 사용자 화면에 포함된 반복 예시 유지"),
    ("place-details.webp", "app-place-source.png", (159, 574, 1704, 2918), "실제 장소명, 사진, 기본 정보 및 편의 정보"),
    ("booking-calendar.webp", "app-booking-source.png", (159, 1376, 1641, 3420), "실제 날짜 및 오전/오후 선택. 원본에서 기기 모서리에 가려진 시간 버튼은 제외"),
    ("coupon-list.webp", "app-coupons-source.png", (159, 725, 1641, 3115), "실제 쿠폰 4개. 화면 속 수량 및 예시 유효기간 유지"),
    ("review-tags.webp", "app-reviews-source.png", (159, 2111, 1641, 3400), "실제 방문 후기 태그. 원본의 참여 수와 태그 수 유지"),
    ("ai-traveler.webp", "ai-traveler-slide.png", (50, 217, 1489, 862), "발표자료의 실제 AI 응답 패널. 장식 배경과 질문 바 제외"),
    ("ai-consulting.webp", "web-report.webp", (456, 0, 945, 557), "실제 상권 컨설팅 상담 정보 확인 패널. 목업 합성 이미지를 사용하지 않음"),
)


def exact_crop(filename, source_name, box, description):
    source_path = ASSETS / source_name
    with Image.open(source_path) as source:
        assert 0 <= box[0] < box[2] <= source.width, (source_name, box)
        assert 0 <= box[1] < box[3] <= source.height, (source_name, box)
        crop = source.crop(box).convert("RGBA")
        metadata = {"icc_profile": source.info["icc_profile"]} if source.info.get("icc_profile") else {}
        destination = OUTPUT / filename
        crop.save(destination, "WEBP", lossless=True, exact=True, method=6, **metadata)
        with Image.open(destination) as encoded:
            assert encoded.convert("RGBA").tobytes() == crop.tobytes(), filename
            if metadata:
                assert encoded.info.get("icc_profile") == metadata["icc_profile"], filename
        return {
            "file": filename,
            "source": "dist/assets/" + source_name,
            "source_size": list(source.size),
            "crop": list(box),
            "size": list(crop.size),
            "bytes": destination.stat().st_size,
            "pixel_exact": True,
            "description": description,
        }


def neighborhood(source_path):
    # Generated brand scene. This is technical display derivation, not a real venue photo.
    with Image.open(source_path) as source:
        assert source.size == (1870, 841), source.size
        original = source.convert("RGB")
        desktop = original.resize((1870, round(original.height * 1870 / original.width)), Image.Resampling.LANCZOS)
        desktop_path = OUTPUT / "neighborhood-dusk.webp"
        desktop.save(desktop_path, "WEBP", quality=88, method=6)
        # Native 1870 x 841 source: right-hand cafe, its visitors and front planting.
        # An exact 630 x 840 crop derives a 900 x 1200 portrait display asset.
        box = (1170, 0, 1800, 840)
        mobile = original.crop(box).resize((900, 1200), Image.Resampling.LANCZOS)
        mobile_path = OUTPUT / "neighborhood-dusk-mobile.webp"
        mobile.save(mobile_path, "WEBP", quality=88, method=6)
        return [
            {"file": desktop_path.name, "source": str(source_path), "source_size": list(source.size), "size": list(desktop.size), "quality": 88, "bytes": desktop_path.stat().st_size, "description": "브랜드용 생성 동네 장면. 실제 장소 사진 아님"},
            {"file": mobile_path.name, "source": str(source_path), "source_size": list(source.size), "crop": list(box), "size": list(mobile.size), "quality": 88, "bytes": mobile_path.stat().st_size, "description": "생성 장면의 오른쪽 가게 중심 모바일 파생 이미지"},
        ]


def contact_sheet(manifest, destination):
    columns, cell_width, cell_height = 4, 400, 400
    rows = (len(manifest) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), "#e7e3df")
    draw = ImageDraw.Draw(sheet)
    for index, entry in enumerate(manifest):
        with Image.open(OUTPUT / entry["file"]) as image:
            preview = ImageOps.contain(image, (360, 322))
            x, y = index % columns * cell_width + 20, index // columns * cell_height + 22
            position = (x + (360 - preview.width) // 2, y)
            if preview.mode == "RGBA":
                sheet.paste(preview, position, preview)
            else:
                sheet.paste(preview.convert("RGB"), position)
            draw.text((x, y + 335), entry["file"], fill="black")
            draw.text((x, y + 355), f"{image.width} x {image.height}", fill="black")
    destination.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(destination, quality=95)


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--neighborhood-source", type=Path)
    parser.add_argument("--contact-sheet", type=Path)
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = [exact_crop(*item) for item in PRODUCTS]
    if args.neighborhood_source:
        manifest.extend(neighborhood(args.neighborhood_source.resolve()))
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    if args.contact_sheet:
        contact_sheet(manifest, args.contact_sheet.resolve())
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
