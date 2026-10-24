# 產生圖文選單圖片 2500x1686（2 列 × 3 格，每格與舊版四格一樣大）
# 上排：今日運勢／易經卜卦／我的命盤　下排：設定生日／推薦好友／資料與隱私
from PIL import Image, ImageDraw, ImageFont
import math, sys
W, H, COLS, ROWS = 2500, 1686, 3, 2
CW, RH = W // COLS, H // ROWS
BG, TILE, INK, SUB, ACC, LINE = '#FBF6EC', '#FFFDF8', '#3A2E1F', '#8C7B5E', '#8E6B2F', '#E3D7BE'
serif = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
sans = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
fT = ImageFont.truetype(serif, 92, index=3)
fS = ImageFont.truetype(sans, 46, index=3)
im = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(im)
items = [('今日運勢', '每天一張專屬卡片'), ('易經卜卦', '心中有事問一卦'), ('我的命盤', '命宮・四化・大限'),
         ('設定生日', '輸入或修改生辰'), ('推薦好友', '分享給家人朋友'), ('資料與隱私', '查看或刪除資料')]
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
def hexagram(cx, cy):
    # 六爻：由上往下 陽陰陽陽陰陽（火澤睽），第三爻用紅色當動爻
    pattern = [1, 0, 1, 1, 0, 1]
    w, h, gap, step = 230, 24, 40, 42
    for k, yang in enumerate(pattern):
        y = cy - 2.5*step + k*step
        col = '#B03A2E' if k == 3 else ACC
        if yang:
            d.rounded_rectangle([cx-w/2, y-h/2, cx+w/2, y+h/2], radius=6, fill=col)
        else:
            d.rounded_rectangle([cx-w/2, y-h/2, cx-gap/2, y+h/2], radius=6, fill=col)
            d.rounded_rectangle([cx+gap/2, y-h/2, cx+w/2, y+h/2], radius=6, fill=col)
def share(cx, cy):
    # 兩個對話框加一顆心
    d.rounded_rectangle([cx-125, cy-100, cx+45, cy+20], radius=36, outline=ACC, width=14)
    d.polygon([(cx-90, cy+12), (cx-55, cy+12), (cx-100, cy+55)], fill=ACC)
    d.rounded_rectangle([cx-35, cy-35, cx+125, cy+85], radius=36, fill=ACC)
    d.polygon([(cx+70, cy+80), (cx+100, cy+80), (cx+110, cy+120)], fill=ACC)
    hx, hy, r = cx+45, cy+20, 20
    d.ellipse([hx-2*r, hy-r-12, hx, hy+r-12], fill=TILE); d.ellipse([hx, hy-r-12, hx+2*r, hy+r-12], fill=TILE)
    d.polygon([(hx-2*r+2, hy-4), (hx+2*r-2, hy-4), (hx, hy+2*r+4)], fill=TILE)
icons = [sun, hexagram, pillars, calendar, share, shield]
for i, (title, sub) in enumerate(items):
    x0, y0 = (i % COLS) * CW, (i // COLS) * RH
    d.rounded_rectangle([x0+18, y0+18, x0+CW-18, y0+RH-18], radius=36, fill=TILE, outline=LINE, width=4)
    icons[i](x0 + CW//2, y0 + 285)
    tw = d.textlength(title, font=fT); d.text((x0 + (CW - tw)/2, y0 + 485), title, font=fT, fill=INK)
    sw = d.textlength(sub, font=fS); d.text((x0 + (CW - sw)/2, y0 + 635), sub, font=fS, fill=SUB)
out = sys.argv[1] if len(sys.argv) > 1 else 'richmenu.png'
im.save(out, optimize=True)
print(out, im.size)
