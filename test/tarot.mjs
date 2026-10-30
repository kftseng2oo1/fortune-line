// 塔羅檢查：今日一牌固定、不同人不同天會變、逆位約 1/4；聖三角三張不重複、牌位導讀齊全
import assert from 'node:assert/strict';
import { dailyTarot, drawTrinity, trinitySummary, TAROT_CATS } from '../worker/src/tarot.js';
import { CARDS } from '../worker/src/tarot-data.js';

assert.equal(CARDS.length, 78);
assert.ok(CARDS.every(c => c.name && c.up && c.rev && c.kw.length && c.art));

// 1. 同一人同一天固定；換天或換人會變
const a = await dailyTarot('U1', '2026-10-30');
assert.deepEqual(await dailyTarot('U1', '2026-10-30'), a);
const days = new Set();
for (let d = 1; d <= 30; d++) days.add((await dailyTarot('U1', '2026-11-' + String(d).padStart(2, '0'))).name);
assert.ok(days.size > 15, '一個月內應出現多種牌');

// 2. 分布：78 張都會出現，逆位約 25%
const seen = new Set(); let rev = 0; const N = 20000;
for (let i = 0; i < N; i++) { const c = await dailyTarot('U' + i, '2026-10-30'); seen.add(c.id); if (c.reversed) rev++; }
assert.equal(seen.size, 78);
assert.ok(Math.abs(rev / N - 0.25) < 0.02, '逆位比例 ' + rev / N);

// 3. 聖三角：三張不重複、牌位與導讀齊全、每類都可用
for (const cat of Object.keys(TAROT_CATS)) {
  for (let i = 0; i < 300; i++) {
    const r = drawTrinity(cat);
    assert.equal(new Set(r.cards.map(c => c.id)).size, 3);
    assert.deepEqual(r.cards.map(c => c.pos), ['過去', '現在', '未來']);
    assert.ok(r.cards.every(c => c.hint && c.text));
    assert.ok(r.summary.length >= 1);
  }
}
const mk = (major, reversed) => ({ major, reversed, name: 'X', kw: ['a', 'b'] });
assert.match(trinitySummary([mk(true, true), mk(true, true), mk(false, false)]).join(''), /大阿爾克那有 2 張.*逆位有 2 張/);
assert.match(trinitySummary([mk(false, false), mk(false, false), mk(false, false)]).join(''), /小阿爾克那.*正位/);

console.log('tarot: all checks passed（今日範例：' + a.name + (a.reversed ? '・逆位' : '・正位') + '）');
