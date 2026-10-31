# 產生功能說明頁（guide.html）用的插圖與 LINE 分享預覽圖，輸出到 assets/guide/
# 用法：python3 scripts/make-guide-images.py（雷達圖另由 worker/src/radar.js 產生 assets/guide/radar.png）
from PIL import Image, ImageDraw, ImageFont
import math, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
P = lambda *a: os.path.join(root, *a)
OUT = P('assets', 'guide')
serif = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
sans = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
ACC, CREAM, LINEC, INK, SUB, NAVY, PURPLE, GOLD = '#8E6B2F', '#FBF6EC', '#E3D7BE', '#3A2E1F', '#8C7B5E', '#23304A', '#2A2140', '#E3C77A'
fT = ImageFont.truetype(serif, 46, index=3); fS = ImageFont.truetype(sans, 28, index=3)

def sun(d, cx, cy, s=1):
    d.ellipse([cx-50*s, cy-50*s, cx+50*s, cy+50*s], fill=ACC)
    for j in range(12):
        a = j*math.pi/6
        d.line([cx+70*s*math.cos(a), cy+70*s*math.sin(a), cx+98*s*math.cos(a), cy+98*s*math.sin(a)], fill=ACC, width=int(11*s))
def star(d, cx, cy, col, bg, s=1):
    pts = [(cx+(95 if j % 2 == 0 else 38)*s*math.cos(-math.pi/2+j*math.pi/8), cy+(95 if j % 2 == 0 else 38)*s*math.sin(-math.pi/2+j*math.pi/8)) for j in range(16)]
    d.polygon(pts, fill=col); d.ellipse([cx-16*s, cy-16*s, cx+16*s, cy+16*s], fill=bg)
def hexagram(d, cx, cy, s=1):
    for j, yang in enumerate([1, 0, 1, 1, 0, 1]):
        y = cy-125*s+j*50*s; col = '#B03A2E' if j == 3 else ACC
        if yang: d.rounded_rectangle([cx-120*s, y-13*s, cx+120*s, y+13*s], radius=6, fill=col)
        else:
            d.rounded_rectangle([cx-120*s, y-13*s, cx-20*s, y+13*s], radius=6, fill=col)
            d.rounded_rectangle([cx+20*s, y-13*s, cx+120*s, y+13*s], radius=6, fill=col)
def card(im, d, f, x, y, w, h):
    im.paste(Image.open(P('tarot-cards', f)).convert('RGB').resize((w, h), Image.LANCZOS), (x, y))
def ctext(d, t, cx, y, f, c):
    d.text((cx-d.textlength(t, font=f)/2, y), t, font=f, fill=c)

# 今日運勢：三張卡
W, H = 1200, 520; im = Image.new('RGB', (W, H), CREAM); d = ImageDraw.Draw(im)
panels = [('紫微運勢', '流日命宮・四化・星等', '#FFFDF8'), ('西洋星座', '分項運勢・心靈小語', '#EEF2F8'), ('今日塔羅', '每天一張專屬牌', PURPLE)]
pw = 360; gap = (W-3*pw)//4
for k, (t, s, bg) in enumerate(panels):
    x0 = gap+k*(pw+gap); y0 = 30; cx, cy = x0+pw//2, y0+150
    d.rounded_rectangle([x0, y0, x0+pw, H-30], radius=28, fill=bg, outline=LINEC, width=3)
    if k == 0: sun(d, cx, cy)
    elif k == 1: star(d, cx, cy, '#4A6FA5', '#EEF2F8')
    else:
        card(im, d, '17.jpg', cx-63, cy-110, 126, 210)
        d.rounded_rectangle([cx-66, cy-113, cx+66, cy+103], radius=6, outline=GOLD, width=3)
    ctext(d, t, cx, y0+290, fT, '#FFFFFF' if k == 2 else INK)
    ctext(d, s, cx, y0+370, fS, '#C9BEDF' if k == 2 else SUB)
im.save(os.path.join(OUT, 'today.jpg'), quality=86, optimize=True)

# 問事占卜：易經＋塔羅
im = Image.new('RGB', (W, H), CREAM); d = ImageDraw.Draw(im)
d.rounded_rectangle([40, 30, 470, H-30], radius=28, fill='#FFFDF8', outline=LINEC, width=3)
hexagram(d, 255, 190); ctext(d, '易經卜卦', 255, 350, fT, INK); ctext(d, '三個數字起卦・爻辭指引', 255, 425, fS, SUB)
x1 = 510; d.rounded_rectangle([x1, 30, W-40, H-30], radius=28, fill=PURPLE, outline=LINEC, width=3)
cw, ch = 150, 250; sx = x1+((W-40-x1)-(3*cw+60))//2
for j, (f, lab) in enumerate([('00.jpg', '過去'), ('40r.jpg', '現在'), ('77.jpg', '未來')]):
    xx = sx+j*(cw+30); card(im, d, f, xx, 70, cw, ch); ctext(d, lab, xx+cw/2, 335, fS, GOLD)
ctext(d, '塔羅三張牌', (x1+W-40)/2, 395, fT, '#FFFFFF')
im.save(os.path.join(OUT, 'divine.jpg'), quality=86, optimize=True)

# 六格選單
m = Image.open(P('scripts', 'richmenu.png')).convert('RGB'); m.thumbnail((1000, 1000)); m.save(os.path.join(OUT, 'menu.jpg'), quality=86, optimize=True)

# LINE 分享預覽圖 1200×630
im = Image.new('RGB', (1200, 630), NAVY); d = ImageDraw.Draw(im)
icon = Image.open(P('assets', 'icon-512.png')).convert('RGB').resize((210, 210), Image.LANCZOS); im.paste(icon, (90, 110))
fBig = ImageFont.truetype(serif, 78, index=3); fMid = ImageFont.truetype(sans, 34, index=3)
d.text((340, 120), '每日命盤運勢', font=fBig, fill='#FFFFFF')
d.text((344, 230), '紫微運勢・西洋星座・今日塔羅・易經卜卦', font=fMid, fill='#E9D9B4')
d.text((344, 285), 'LINE 免費使用，輸入一次生辰就好', font=fMid, fill='#C9D2E3')
for j, f in enumerate(['00.jpg', '17.jpg', '19.jpg', '21.jpg']):
    card(im, d, f, 340+j*150, 370, 120, 200)
im.save(os.path.join(OUT, 'og.jpg'), quality=86, optimize=True)
print('ok')
