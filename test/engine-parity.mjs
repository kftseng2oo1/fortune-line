// 用 z1（紫微斗數AI大師）index.html 的原始碼排盤，與 Worker 的 computeChart 逐宮比對
// 用法：cd worker && node ../test/engine-parity.mjs <z1 的 index.html 路徑>
// z1 更新後跑這個；不一致就重跑 scripts/extract-ziwei.py
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { computeChart, normalizeBirth } from '../worker/src/ziwei.js';
const require = createRequire(import.meta.url);
const L = require('../worker/node_modules/lunar-javascript');

const s = fs.readFileSync(process.argv[2], 'utf8');
const cut = (a, b, from = 0) => { const i = s.indexOf(a, from); return s.slice(i, s.indexOf(b, i)); };
const lunarSeg = cut('const LUNAR_INFO', '// ================================================================\n//  ZIWEI DOUSHU FULL CALCULATION ENGINE');
const baseSeg = cut('const TIAN_GAN', '// ================================================================\n//  ★ OOP ARCHITECTURE');
const p0 = s.indexOf('class Palace');
const palaceSeg = s.slice(p0, s.indexOf('// ──────────────────────────────────────────────\n//  2. Star', p0));
const e0 = s.lastIndexOf('// ====', s.indexOf('function getYearGanZhi'));
const engineSeg = s.slice(e0, s.lastIndexOf('// ====', s.indexOf('//  GRID LAYOUT')));

const ctx = { Math, Date, Object, Array, console };
vm.createContext(ctx);
vm.runInContext([lunarSeg, baseSeg, palaceSeg, engineSeg,
  // 與 z1 runChart 相同的晚子時處理
  `this.__z1 = function(y, m, d, hrSel, gd){
     var isLateZi = hrSel === 12, hr = isLateZi ? 0 : hrSel, lunar;
     if (isLateZi){ var nd = new Date(Date.UTC(y, m - 1, d + 1)); lunar = solarToLunar(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate()); }
     else lunar = solarToLunar(y, m, d);
     var c = calculateChart(lunar.year, lunar.month, lunar.day, hr, gd, lunar.isLeap ? 1 : 0);
     return c.palaces.map(function(p){ return p.name + p.gan + p.dz + ':' + p.stars.m.join('') + '/' + p.stars.a.join('') + '/' + p.stars.b.join('') + '@' + p.daxianStart; }).join('|');
   };`].join('\n'), ctx);

let seed = 9; const r = n => (seed = (seed * 9301 + 49297) % 233280, Math.floor(seed / 233280 * n));
const DZ = '子丑寅卯辰巳午未申酉戌亥';
const mine = c => c.palaces.map(p => p.name + p.gan + DZ[p.dz] + ':' + p.m.join('') + '/' + p.a.join('') + '/' + p.b.join('') + '@' + p.dx[0]).join('|');
let bad = 0, N = 600;
for (let i = 0; i < N; i++) {
  const y = 1930 + r(90), m = 1 + r(12), d = 1 + r(28), hour = r(13), gender = r(2) ? 'M' : 'F';
  let b;
  if (i % 4 === 0) {
    // 農曆輸入：用該國曆日的農曆值送入，結果應與國曆輸入相同
    const lu = L.Solar.fromYmd(y, m, d).getLunar();
    b = normalizeBirth({ cal: 'lunar', y: lu.getYear(), m: Math.abs(lu.getMonth()), d: lu.getDay(), leap: lu.getMonth() < 0, hour, gender });
  } else {
    b = normalizeBirth({ cal: 'solar', y, m, d, hour, gender });
  }
  const a = ctx.__z1(y, m, d, hour, gender), c = mine(computeChart(b));
  if (a !== c) { bad++; if (bad <= 3) console.log('MISMATCH', { y, m, d, hour, gender, cal: b.cal }, '\n z1:', a, '\n me:', c); }
}
console.log(`${N - bad}/${N} charts identical to z1（含晚子時與農曆輸入）`);
process.exit(bad ? 1 : 0);
