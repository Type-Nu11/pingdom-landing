"""Regenerate display assets from preserved originals: pip install pillow 'fonttools[woff]'."""
from pathlib import Path
import json
from PIL import Image
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
assets = root / 'dist' / 'assets'
metrics = []

def webp(source, target, width=None):
    original = Image.open(assets / source).convert('RGBA')
    image = original
    if width and original.width > width:
        image = original.resize((width, round(original.height * width / original.width)), Image.Resampling.LANCZOS)
    output = assets / target
    image.save(output, format='WEBP', lossless=True, method=6, exact=True)
    with Image.open(output) as encoded:
        assert encoded.convert('RGBA').tobytes() == image.tobytes(), target
    metrics.append({'source': source, 'output': target, 'before': (assets/source).stat().st_size, 'after': output.stat().st_size, 'width': image.width, 'height': image.height})

for source in sorted(assets.glob('app-*-source.png')):
    webp(source.name, source.name.replace('-source.png', '-preview.webp'), width=960)
for name in ['pingdom-portal', 'ai-places-triptych']:
    webp(name + '.png', name + '-lossless.webp')

# Include every static/dynamic caption and canvas wordmark; keep all variable-font axes.
text = ''.join(path.read_text() for path in (root/'dist').iterdir() if path.suffix in {'.html', '.css', '.js', '.mjs'})
characters = set(map(ord, text)) | set(range(32, 127))
source = assets / 'pretendard-variable.woff2'
font = TTFont(source, recalcTimestamp=False)
original_cmap = font.getBestCmap()
axes = [(axis.axisTag, axis.minValue, axis.maxValue) for axis in font['fvar'].axes]
options = subset.Options()
options.flavor = 'woff2'
options.name_IDs = ['*']
options.name_languages = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=characters)
subsetter.subset(font)
# The source reserves its family name; preserve attribution and rename this subset.
identity_ids = {1, 3, 4, 6, 16, 18, 21, 25}
identity_ids.update(instance.postscriptNameID for instance in font['fvar'].instances if instance.postscriptNameID != 0xFFFF)
for record in font['name'].names:
    if record.nameID in identity_ids:
        name = record.toUnicode().replace('Pretendard', 'PingdomSans')
        font['name'].setName(name, record.nameID, record.platformID, record.platEncID, record.langID)
output = assets / 'pingdom-sans.woff2'
font.save(output)
result = TTFont(output)
assert characters.intersection(original_cmap) <= result.getBestCmap().keys()
assert axes == [(axis.axisTag, axis.minValue, axis.maxValue) for axis in result['fvar'].axes]
assert all('Pretendard' not in record.toUnicode() for record in result['name'].names if record.nameID in identity_ids)
metrics.append({'source': source.name, 'output': output.name, 'before': source.stat().st_size, 'after': output.stat().st_size, 'glyphs':len(result.getBestCmap())})
print(json.dumps(metrics, ensure_ascii=False, indent=2))
