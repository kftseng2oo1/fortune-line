# 產生 LINE 塔羅卡用的牌面圖：tarot-cards/{編號}.jpg（正位）與 {編號}r.jpg（逆位，旋轉 180°）
# 來源：Wikimedia Commons「Rider-Waite-Smith tarot deck (TaionWC)」Pam-A 掃描（Pamela Colman Smith，1910，公有領域）
# 用法：python3 scripts/make-tarot-cards.py <含 major-00.webp… 與 assets-sources.json 的資料夾>
# 編號與塔羅秘境 App 相同：0–21 大阿爾克那、22 權杖、36 聖杯、50 寶劍、64 星幣（各 14 張：王牌…10、侍者、騎士、王后、國王）
import json, os, re, subprocess, sys
from PIL import Image

src = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(here, '..')
out = os.path.join(root, 'tarot-cards')
os.makedirs(out, exist_ok=True)

manifest = {c['id']: c for c in json.load(open(os.path.join(src, 'assets-sources.json'), encoding='utf-8'))['cards']}
cards = json.loads(subprocess.check_output(['node', '-e', 'import("./worker/src/tarot-data.js").then(m=>console.log(JSON.stringify(m.CARDS.map(c=>[c.id,c.name,c.en]))))'], cwd=root))

SUITS = [('wands', 22), ('cups', 36), ('swords', 50), ('pentacles', 64)]
def file_id(i):
    if i < 22: return 'major-%02d' % i
    for suit, start in SUITS:
        if start <= i < start + 14: return '%s-%02d' % (suit, i - start + 1)

norm = lambda s: re.sub(r'^the ', '', s.lower().replace('—', ' ').strip())
W, H = 300, 500
lines = ['# 塔羅牌面圖來源', '',
         'Pamela Colman Smith 繪，Rider–Waite–Smith「Pam-A」版（1910），Wikimedia Commons 標示為公有領域（PD-old-80-expired）。',
         '掃描來源分類：https://commons.wikimedia.org/wiki/Category:Rider-Waite-Smith_tarot_deck_(TaionWC)', '',
         '| 檔案 | 牌 | Commons 原圖頁 |', '| --- | --- | --- |']
for cid, name, en in cards:
    fid = file_id(cid)
    m = manifest[fid]
    desc = m['source']['description'].split('—')[0]
    if norm(desc) != norm(en):
        sys.exit('對應錯誤：%d %s（%s）≠ %s' % (cid, name, en, desc))
    if m['license']['code'] != 'pd':
        sys.exit(fid + ' 不是公有領域')
    im = Image.open(os.path.join(src, fid + '.webp')).convert('RGB').resize((W, H), Image.LANCZOS)
    im.save(os.path.join(out, '%02d.jpg' % cid), quality=82, optimize=True, progressive=True)
    im.rotate(180).save(os.path.join(out, '%02dr.jpg' % cid), quality=82, optimize=True, progressive=True)
    lines.append('| %02d.jpg | %s %s | %s |' % (cid, name, en, m['source']['descriptionURL']))
open(os.path.join(out, 'SOURCES.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
total = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
print('完成：78 張 × 正逆位，共 %.1f MB' % (total / 1048576))
