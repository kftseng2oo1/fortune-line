# 產生圖文選單圖片 2500x843（四格）：今日運勢／我的命盤／設定生日／資料與隱私
from PIL import Image, ImageDraw, ImageFont
import math, sys
W, H, N = 2500, 843, 4
CW = W // N
BG, TILE, INK, SUB, ACC, LINE = '#FBF6EC', '#FFFDF8', '#3A2E1F', '#8C7B5E', '#8E6B2F', '#E3D7BE'
serif = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
sans = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
fT = ImageFont.truetype(serif, 92, index=3)
fS = ImageFont.truetype(sans, 46, index=3)
im = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(im)
items = [('今日運勢', '每天一張專屬卡片'), ('我的命盤', '命宮・四化・大限'), ('設定生日', '輸入或修改生辰'), ('資料與隱私', '查看或刪除資料')]
def sun(cx, cy):
    d.ellipse([cx-62, cy-62, cx+62, cy+62], fill=ACC)
    for k in range(12):
        a = k * math.pi / 6
        d.line([cx + 88*math.cos(a), cy + 88*math.sin(a), cx + 122*math.cos(a), cy + 122*math.sin(a)], fill=ACC, width=14)
def pillars(cx, cy):
    # 紫微命盤的十二宮：4x4 外圈、中間留空
    cell, gap = 50, 8
    x0, y0 = cx - 2*cell - 1.5*gap, cy - 2*cell - 1.5*gap
    for r in range(4):
        for c in range(4):
            if r in (1, 2) and c in (1, 2):
                continue
            x, y = x0 + c*(cell+gap), y0 + r*(cell+gap)
            d.rounded_rectangle([x, y, x+cell, y+cell], radius=8, outline=ACC, width=9)
    d.ellipse([cx-22, cy-22, cx+22, cy+22], fill=ACC)
def calendar(cx, cy):
    d.rounded_rectangle([cx-115, cy-95, cx+115, cy+105], radius=22, outline=ACC, width=14)
    d.rectangle([cx-108, cy-88, cx+108, cy-40], fill=ACC)
    for x in (cx-60, cx+60): d.line([x, cy-125, x, cy-70], fill=ACC, width=16)
    for r in range(2):
        for c in range(3):
            x, y = cx - 70 + c*70, cy + 5 + r*55
            d.ellipse([x-13, y-13, x+13, y+13], fill=ACC)
def shield(cx, cy):
    pts = [(cx, cy-120), (cx+105, cy-80), (cx+95, cy+20), (cx, cy+120), (cx-95, cy+20), (cx-105, cy-80)]
    d.line(pts + [pts[0]], fill=ACC, width=14, joint='curve')
    d.line([(cx-45, cy), (cx-10, cy+38), (cx+52, cy-40)], fill=ACC, width=18, joint='curve')
icons = [sun, pillars, calendar, shield]
for i, (title, sub) in enumerate(items):
    x0 = i * CW
    d.rounded_rectangle([x0+18, 18, x0+CW-18, H-18], radius=36, fill=TILE, outline=LINE, width=4)
    icons[i](x0 + CW//2, 285)
    tw = d.textlength(title, font=fT); d.text((x0 + (CW - tw)/2, 485), title, font=fT, fill=INK)
    sw = d.textlength(sub, font=fS); d.text((x0 + (CW - sw)/2, 635), sub, font=fS, fill=SUB)
out = sys.argv[1] if len(sys.argv) > 1 else 'richmenu.png'
im.save(out, optimize=True)
print(out, im.size)
