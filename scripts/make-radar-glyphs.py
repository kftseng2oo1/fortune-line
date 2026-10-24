# 產生雷達圖用的字形點陣（六個維度名稱＋數字），讓 Worker 不需要字型檔就能畫出 PNG
# 用法：python3 scripts/make-radar-glyphs.py
from PIL import Image, ImageDraw, ImageFont
import base64, json, os
S = 4   # 與 radar.js 的 SCALE 相同（z1 的 SVG 座標 × 4）
bold = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 11 * S, index=0)
reg = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 9 * S, index=0)
out = {}
def glyph(ch, font, key):
    l, t, r, b = font.getbbox(ch)
    asc = font.getmetrics()[0]
    w = max(1, r - l)
    im = Image.new('L', (w, asc + font.getmetrics()[1]), 0)
    ImageDraw.Draw(im).text((-l, 0), ch, font=font, fill=255)
    out[key] = {'w': w, 'h': im.height, 'asc': asc, 'adv': round(font.getlength(ch)), 'l': l, 'a': base64.b64encode(im.tobytes()).decode()}
for ch in '領導智謀穩定人緣感性行動':
    glyph(ch, bold, 'b' + ch)
for ch in '0123456789':
    glyph(ch, reg, 'r' + ch)
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'worker', 'src', 'radar-glyphs.js')
open(dst, 'w', encoding='utf-8').write('/* 由 scripts/make-radar-glyphs.py 產生（Noto Sans CJK），勿手改 */\nexport const GLYPHS = ' + json.dumps(out, ensure_ascii=False) + ';\n')
print(dst, os.path.getsize(dst) // 1024, 'KB')
