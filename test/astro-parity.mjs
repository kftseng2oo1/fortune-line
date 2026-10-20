// 用 Astro index.html 的原始 fortuneHTML 算「今日」，與 Worker 的 astroToday 比對分項星等與說明、月亮星座、每日一句
// 用法：cd worker && node ../test/astro-parity.mjs <astro 的 index.html 路徑>
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { astroToday, astroQuote, signFor } from '../worker/src/astro.js';
import { SIGNS } from '../worker/src/astro-engine.js';

const html = fs.readFileSync(process.argv[2], 'utf8');
let js = null;
for (let p = 0; ;) {
  const i = html.indexOf('<script', p); if (i < 0) break;
  const body = html.slice(html.indexOf('>', i) + 1, html.indexOf('</script>', i));
  if (body.includes('function dayScore')) { js = body; break; }
  p = i + 1;
}
const cut = (a, b) => { const i = js.indexOf(a); return js.slice(i, js.indexOf(b, i)); };
const src = [
  cut('const EL=', 'const $='),
  'var st={per:"today"};',
  cut('function signOf', 'function buildPickers'),
  cut('// ===== 運勢 =====', '// ===== 每日一句'),
  cut('const QUOTES=', 'function bindQuote'),
  cut('function fortuneHTML', 'function render'),
  'this.__f=fortuneHTML; this.__q=dailyQuote; this.__S=SIGNS;'
].join('\n');

let FIXED = 0;
class FD extends Date { constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); } static now() { return FIXED; } }
const ctx = { Date: FD, Math, Array, Object, String, console };
vm.createContext(ctx);
vm.runInContext(src, ctx);

const strip = s => s.replace(/<[^>]+>/g, '');
let n = 0;
for (let i = 0; i < 120; i++) {
  const d = new Date(Date.UTC(2026, 0, 1 + i * 3));
  const date = d.toISOString().slice(0, 10);
  FIXED = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 4);
  for (const s of SIGNS) {
    for (const blood of ['A', 'B', 'O', 'AB']) {
      const h = ctx.__f(ctx.__S.find(x => x.k === s.k), blood);
      const ov = Number(h.match(/<b>(\d+)<\/b><small>綜合<\/small>/)[1]);
      const cats = [...h.matchAll(/<div class="cat"><div class="ch"><b>(.+?)<\/b><span class="stars" aria-label="(\d) 顆星">.+?<\/span><\/div><p>(.+?)<\/p>/g)].map(m => [m[1], Number(m[2]), m[3]]);
      const sky = strip(h.match(/<p class="sky">(.+?)<\/p>/)[1]);
      const mine = astroToday(s, blood, date);
      assert.equal(mine.ov, ov, `ov ${date} ${s.k} ${blood}`);
      assert.deepEqual(mine.cats.map(c => [c.n, c.st, c.t]), cats, `cats ${date} ${s.k} ${blood}`);
      assert.ok(sky.includes(mine.moon.replace('月亮行經', '').split('，')[0]), `moon ${date} ${s.k}`);
      n++;
    }
    assert.equal(astroQuote(s, date), ctx.__q(ctx.__S.find(x => x.k === s.k), new FD()), `quote ${date} ${s.k}`);
  }
}
// 生日 → 星座交界日
assert.equal(signFor({ m: 3, d: 20 }).k, 'pisces');
assert.equal(signFor({ m: 3, d: 21 }).k, 'aries');
assert.equal(signFor({ m: 12, d: 22 }).k, 'capricorn');
console.log(`${n}/${n} 星座卡與 Astro 一致（120 天 × 12 星座 × 4 血型，含每日一句）`);
