// 今日法語：資料格式、每日輪替、相鄰兩天不同經
import assert from 'node:assert/strict';
import { DHARMA, dailyDharma } from '../worker/src/dharma.js';

const book = x => x.s.split('・')[0];
const texts = new Set();
for (const x of DHARMA) {
  assert.ok(x.t && x.s && x.b && x.p, '每句都要有經文、出處、白話、練習：' + x.t);
  assert.ok(x.t.length <= 80 && x.b.length <= 90 && x.p.length <= 40, '長度適合卡片：' + x.t);
  assert.ok(!texts.has(x.t), '經文重複：' + x.t);
  texts.add(x.t);
}
const n = DHARMA.length;
for (let i = 0; i < n; i++) assert.notEqual(book(DHARMA[i]), book(DHARMA[(i + 1) % n]), '相鄰兩句同一部經：第 ' + i + ' 句');

const day = k => new Date(Date.UTC(2026, 0, 1 + k)).toISOString().slice(0, 10);
const seen = new Set();
for (let k = 0; k < n; k++) seen.add(dailyDharma(day(k)).t);
assert.equal(seen.size, n, '一輪內每天都不同');
assert.equal(dailyDharma(day(0)), dailyDharma(day(n)), '整輪後循環');
console.log('dharma: all checks passed（共 ' + n + ' 句，今天：' + dailyDharma(new Date().toISOString().slice(0, 10)).t + '）');
