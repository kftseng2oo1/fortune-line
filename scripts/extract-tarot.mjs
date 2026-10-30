// 從塔羅秘境 App（kftseng2oo1/tarot 的 index.html）抽出 78 張牌義與牌位導讀，產生 worker/src/tarot-data.js
// 用法：node scripts/extract-tarot.mjs ../tarot/index.html
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) { console.error('用法：node scripts/extract-tarot.mjs <塔羅秘境 index.html>'); process.exit(1); }
const html = fs.readFileSync(src, 'utf8');
function grab(startMark, endMark) {
  const a = html.indexOf(startMark);
  const b = html.indexOf(endMark, a);
  if (a < 0 || b < 0) throw new Error('找不到 ' + startMark);
  return html.slice(a + startMark.length, b + endMark.length - 1);
}
const DB = vm.runInNewContext('(' + grab('const DB = ', '];') + ')');
const FRAMES = vm.runInNewContext('(' + grab('const QUESTION_CARD_FRAMES = ', '\n};') + ')');
if (DB.length !== 78) throw new Error('牌數不是 78：' + DB.length);

const cards = DB.map(c => {
  for (const k of ['id', 'name', 'type', 'num', 'art', 'kw', 'up', 'rev']) if (c[k] === undefined) throw new Error(c.name + ' 缺少 ' + k);
  return { id: c.id, name: c.name, en: c.en, type: c.type, num: c.num, art: c.art, kw: c.kw, el: c.el || '', pl: c.pl || '', up: c.up, rev: c.rev, sym: c.sym || '' };
});
/* 只取聖三角用得到的三個牌位 */
const hints = {};
for (const [cat, f] of Object.entries(FRAMES)) {
  const h = f.posHint || {};
  if (h['過去'] && h['現在'] && h['未來']) hints[cat] = { 過去: h['過去'], 現在: h['現在'], 未來: h['未來'] };
}

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '../worker/src/tarot-data.js');
fs.writeFileSync(out,
  '/* 由 scripts/extract-tarot.mjs 從塔羅秘境 App 自動產生，勿手改 */\n' +
  'export const CARDS = ' + JSON.stringify(cards) + ';\n' +
  '/* 各類問題在 過去／現在／未來 牌位的導讀 */\n' +
  'export const POS_HINT = ' + JSON.stringify(hints) + ';\n');
console.log('寫入', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB，78 張牌；牌位導讀類別：' + Object.keys(hints).join('、'));
