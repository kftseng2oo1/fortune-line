# 每日命盤運勢圖示：深藍夜空、金色十二宮環、中央紫微星
# 主體都在圓形安全區內（LINE 官方帳號大頭貼會裁成圓形）
from PIL import Image, ImageDraw, ImageFilter
import math, os
S = 2048
NAVY, NAVY2, GOLD, GOLD_HI, CREAM = (35, 48, 74), (52, 70, 104), (217, 180, 106), (245, 222, 160), (251, 246, 236)
im = Image.new('RGB', (S, S), NAVY)
d = ImageDraw.Draw(im)
c = S / 2
# 柔和的中心光暈
glow = Image.new('L', (S, S), 0)
ImageDraw.Draw(glow).ellipse([c - S*0.30, c - S*0.30, c + S*0.30, c + S*0.30], fill=110)
glow = glow.filter(ImageFilter.GaussianBlur(S * 0.08))
im = Image.composite(Image.new('RGB', (S, S), NAVY2), im, glow)
d = ImageDraw.Draw(im)
# 十二宮環：細圓環＋12 顆點，正上方（命宮）較大
R = S * 0.360
d.ellipse([c - R, c - R, c + R, c + R], outline=GOLD, width=int(S * 0.014))
for k in range(12):
    a = -math.pi / 2 + k * math.pi / 6
    x, y = c + R * math.cos(a), c + R * math.sin(a)
    r = S * (0.042 if k == 0 else 0.027)
    d.ellipse([x - r, y - r, x + r, y + r], fill=GOLD_HI if k == 0 else GOLD)
# 中央紫微星：八芒星（長四芒＋短四芒）
def star(cx, cy, ro, ri, n, rot, fill):
    pts = []
    for i in range(n * 2):
        rr = ro if i % 2 == 0 else ri
        a = rot + i * math.pi / n
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=fill)
star(c, c, S * 0.140, S * 0.050, 4, -math.pi / 4, GOLD)                                  # 斜向短芒
star(c, c, S * 0.235, S * 0.062, 4, -math.pi / 2, GOLD_HI)                               # 正向長芒
d.ellipse([c - S*0.034, c - S*0.034, c + S*0.034, c + S*0.034], fill=CREAM)
# 幾顆小星點綴
for (fx, fy, fr) in [(0.30, 0.31, 0.010), (0.72, 0.27, 0.008), (0.69, 0.71, 0.011), (0.27, 0.68, 0.007)]:
    star(S * fx, S * fy, S * fr * 2.4, S * fr * 0.7, 4, -math.pi / 2, GOLD)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
os.makedirs(out, exist_ok=True)
for size, name in [(1024, 'icon-1024.png'), (640, 'line-profile-640.png'), (512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png'), (32, 'favicon-32.png')]:
    im.resize((size, size), Image.LANCZOS).save(os.path.join(out, name), optimize=True)
print('ok')
