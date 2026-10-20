# 從 Astro（星座 × 血型性格帖）的 index.html 抽出星座運勢與每日一句，產生 worker/src/astro-engine.js
# Astro 更新後重跑：python3 scripts/extract-astro.py <astro 的 index.html>
# 只搬運原始碼、不改寫邏輯，確保 LINE 與 Astro 看到同樣的分數與句子。
import sys, os

html = open(sys.argv[1], encoding='utf-8').read()
# 取主程式那段 <script>（跳過 service worker 註冊的小段）
js = None
pos = 0
while True:
    i = html.find('<script', pos)
    if i < 0:
        break
    body = html[html.index('>', i) + 1:html.index('</script>', i)]
    if 'function dayScore' in body:
        js = body
        break
    pos = i + 1
if js is None:
    sys.exit('抽取失敗：找不到 dayScore')

def cut(a, b):
    i = js.index(a)
    j = js.index(b, i)
    return js[i:j]

parts = [
    cut('const EL=', 'const $='),                 # 星座、血型、元素表
    cut('function signOf', 'function buildPickers'),
    cut('// ===== 運勢 =====', 'function periodDays'),
    cut('const QUOTES=', 'function quoteHTML'),
]
for need in ['const SIGNS', 'function signOf', 'function dayScore', 'function moonIdx', 'const POOL', 'const CATS', 'function dailyQuote']:
    if not any(need in p for p in parts):
        sys.exit('抽取失敗：找不到 ' + need)

out = '\n'.join([
    '/* 自動產生，請勿手動修改。來源：kftseng2oo1/astro index.html（星座 × 血型性格帖）',
    ' * 重新產生：python3 scripts/extract-astro.py <astro 的 index.html> */',
    *parts,
    'export { SIGNS, EL, BLOODS, signOf, hash, rng, moonIdx, elRel, ymd, dayScore, lvl, POOL, CATS, BFT, WD, stars, dailyQuote };',
    ''
])
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'worker', 'src', 'astro-engine.js')
open(dst, 'w', encoding='utf-8').write(out)
print('wrote', os.path.normpath(dst), len(out), 'chars')
