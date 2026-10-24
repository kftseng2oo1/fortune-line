// 從數位易經 App（kftseng2oo1/-_-_v2-1 的 index.html）抽出 64 卦 × 6 爻資料，產生 worker/src/iching-data.js
// 用法：node scripts/extract-iching.mjs ../-_-_v2-1/index.html
// App 裡的 HEXAGRAM_MAP 鍵值實際上是「下卦-上卦」，這裡依卦名重新整理成明確的 上卦/下卦，不沿用鍵值順序。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) { console.error('用法：node scripts/extract-iching.mjs <數位易經 index.html>'); process.exit(1); }
const html = fs.readFileSync(src, 'utf8');

function grab(startMark, endMark) {
  const a = html.indexOf(startMark);
  const b = html.indexOf(endMark, a);
  if (a < 0 || b < 0) throw new Error('找不到 ' + startMark);
  return html.slice(a + startMark.length, b).trim().replace(/;\s*$/, '');
}
const MAP = vm.runInNewContext('(' + grab('const HEXAGRAM_MAP = ', '};') + '})');
const DB = vm.runInNewContext('(' + grab('const YAO_CI_DATABASE = ', '// 為確保程式可執行') + ')');

const IMG = { 天: 1, 澤: 2, 火: 3, 雷: 4, 風: 5, 水: 6, 山: 7, 地: 8 };
const hex = {};
for (const v of Object.values(MAP)) {
  const n = v.name;
  const up = n.includes('為') ? IMG[n.at(-1)] : IMG[n[0]];
  const lo = n.includes('為') ? IMG[n.at(-1)] : IMG[n[1]];
  if (!up || !lo) throw new Error('無法解析卦名 ' + n);
  hex[v.id] = { n, u: up, l: lo };
}
if (Object.keys(hex).length !== 64) throw new Error('卦數不是 64');

const CATS = ['career', 'health', 'love', 'wealth', 'investment', 'marriage', 'lawsuit', 'property'];
const yao = {};
for (let h = 1; h <= 64; h++) for (let y = 1; y <= 6; y++) {
  const e = DB[h + '-' + y];
  if (!e) throw new Error('缺少 ' + h + '-' + y);
  yao[h + '-' + y] = { name: e.name, text: e.text, level: e.level, kw: e.keywords || [], i: CATS.map(c => (e.interpretation || {})[c] || '') };
}

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '../worker/src/iching-data.js');
fs.writeFileSync(out,
  '/* 由 scripts/extract-iching.mjs 從數位易經 App 自動產生，勿手改 */\n' +
  '/* HEX[卦序] = { n: 卦名, u: 上卦, l: 下卦 }，八卦以先天數表示：1乾 2兌 3離 4震 5巽 6坎 7艮 8坤 */\n' +
  'export const HEX = ' + JSON.stringify(hex) + ';\n' +
  '/* YAO["卦序-爻位"]，i 依序為：' + CATS.join('、') + ' 的解讀 */\n' +
  'export const CATS = ' + JSON.stringify(CATS) + ';\n' +
  'export const YAO = ' + JSON.stringify(yao) + ';\n');
console.log('寫入', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB，64 卦 384 爻');
