# 從 z1（紫微斗數AI大師）的 index.html 抽出安星引擎，產生 worker/src/ziwei-engine.js
# z1 更新後重跑：python3 scripts/extract-ziwei.py <z1 的 index.html>
# 只搬運原始碼、不改寫任何安星邏輯，確保 LINE 與 z1 排出同一張盤。
import sys, os, re

src = open(sys.argv[1], encoding='utf-8').read()

def between(start_marker, end_marker, from_pos=0):
    a = src.index(start_marker, from_pos)
    b = src.index(end_marker, a)
    return src[a:b]

# 1. 國曆轉農曆（LUNAR_INFO … solarToLunar）
lunar = between('const LUNAR_INFO', '// ================================================================\n//  ZIWEI DOUSHU FULL CALCULATION ENGINE')
# 2. 基本表：天干地支、宮名、四化表
base = between('const TIAN_GAN', '// ================================================================\n//  ★ OOP ARCHITECTURE')
# 3. Palace 類別
p0 = src.index('class Palace')
palace = src[p0:src.index('// ──────────────────────────────────────────────\n//  2. Star', p0)]
# 4. 安星主流程（年干支 … calculateChart）
e0 = src.rfind('// ====', 0, src.index('function getYearGanZhi'))
e1 = src.rfind('// ====', 0, src.index('//  GRID LAYOUT'))
engine = src[e0:e1]

for name, part in [('lunar', lunar), ('base', base), ('palace', palace), ('engine', engine)]:
    if len(part) < 500:
        sys.exit('抽取失敗：' + name + ' 區段太短，z1 的結構可能改了')
for fn in ['function solarToLunar', 'const SIHUA', 'class Palace', 'function calculateChart']:
    if fn not in lunar + base + palace + engine:
        sys.exit('抽取失敗：找不到 ' + fn)

out = '\n'.join([
    '/* 自動產生，請勿手動修改。來源：kftseng2oo1/z1 index.html（紫微斗數AI大師）',
    ' * 重新產生：python3 scripts/extract-ziwei.py <z1 的 index.html> */',
    lunar, base, palace, engine,
    'export { solarToLunar, leapMonth, lunarMonthDays, leapDays, calculateChart, getYearGanZhi, TIAN_GAN, DI_ZHI, PALACE_NAMES, SIHUA, SH_KEYS, JU_NAMES_CORRECT };',
    ''
])
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'worker', 'src', 'ziwei-engine.js')
open(dst, 'w', encoding='utf-8').write(out)
print('wrote', os.path.normpath(dst), len(out), 'chars')
