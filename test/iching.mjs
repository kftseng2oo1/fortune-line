// 易經起卦檢查：上下卦方向、動爻、變卦、1000 組數字都有資料、抽牌機率公平
import assert from 'node:assert/strict';
import { cast, drawCards, parseDigits, looksLikeDigits, TRI } from '../worker/src/iching.js';
import { HEX } from '../worker/src/iching-data.js';

// 1. 第一個數字是上卦：1,0,2 → 上乾、下兌 = 天澤履（第 10 卦），三數和 3 → 六三動，變卦 乾為天
let r = cast([1, 0, 2], 'love');
assert.equal(r.name, '天澤履'); assert.equal(r.id, 10);
assert.equal(r.upper.n, '乾'); assert.equal(r.lower.n, '兌');
assert.equal(r.moving, 3); assert.equal(r.yao.name, '六三');
assert.equal(r.changed.name, '乾為天');
assert.deepEqual(r.lines, [1, 1, 0, 1, 1, 1]);

// 2. 餘 0 當 8 / 6：8,4,4 → 上坤、下坤，和 16 → 16%6=4 → 六四
r = cast([8, 4, 4], 'career');
assert.equal(r.name, '坤為地'); assert.equal(r.moving, 4); assert.equal(r.changed.name, '雷地豫');
// 3. 6,0,0 → 上坎 下坤 = 水地比，和 6 → 上爻動，變卦 風地觀
r = cast([6, 0, 0], 'wealth');
assert.equal(r.name, '水地比'); assert.equal(r.moving, 6); assert.equal(r.yao.name, '上六'); assert.equal(r.changed.name, '風地觀');

// 4. 卦名與上下卦一致（卦名第一字是上卦之象）
for (const id in HEX) {
  const h = HEX[id];
  const n = h.n.includes('為') ? h.n.at(-1) + h.n.at(-1) : h.n.slice(0, 2);
  assert.equal(TRI[h.u].img + TRI[h.l].img, n, h.n);
}

// 5. 所有 900 組合法數字都能起卦，64 卦全部出現，每類別都有解讀
const seen = new Set();
for (let a = 1; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) {
  for (const cat of ['career', 'health', 'love', 'wealth', 'investment', 'marriage', 'lawsuit', 'property']) {
    const x = cast([a, b, c], cat);
    assert.ok(x.yao.text && x.guide && x.changed.name && x.id !== x.changed.id);
    seen.add(x.id);
  }
}
assert.equal(seen.size, 64);

// 6. 輸入解析
assert.deepEqual(parseDigits('528'), [5, 2, 8]);
assert.deepEqual(parseDigits('５ ２ ８'), [5, 2, 8]);
assert.deepEqual(parseDigits('5,2,8'), [5, 2, 8]);
assert.equal(parseDigits('028'), null);
assert.equal(parseDigits('52'), null);
assert.equal(parseDigits('5288'), null);
assert.ok(looksLikeDigits('52')); assert.ok(!looksLikeDigits('今日運勢')); assert.ok(!looksLikeDigits(' '));

// 7. 抽牌：百位 1–8，十位個位 0–9，分布大致均等
const N = 80000, c1 = Array(10).fill(0), c2 = Array(10).fill(0);
for (let i = 0; i < N; i++) { const d = drawCards(); c1[d[0].digit]++; c2[d[1].digit]++; assert.match(d[2].label, /^[♠♥♦♣](A|[2-9]|10)$/); }
assert.equal(c1[0] + c1[9], 0);
for (let k = 1; k <= 8; k++) assert.ok(Math.abs(c1[k] / N - 1 / 8) < 0.01, '百位 ' + k);
for (let k = 0; k <= 9; k++) assert.ok(Math.abs(c2[k] / N - 1 / 10) < 0.01, '十位 ' + k);

console.log('iching: all checks passed（範例：' + cast([5, 2, 8], 'love').name + '）');
