/* 紫微命盤：輸入驗證與排盤包裝。安星本身全部來自 ziwei-engine.js（由 z1 原始碼自動抽出）。 */
import lunar from 'lunar-javascript';
import { solarToLunar, leapMonth, lunarMonthDays, leapDays, calculateChart, SIHUA, SH_KEYS, JU_NAMES_CORRECT, DI_ZHI } from './ziwei-engine.js';
import { personalityOf, psKeyword } from './ziwei-personality.js';
const { Lunar } = lunar;

export const HOUR_NAMES = ['早子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '晚子'];
const MONTH_CN = ['', '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const DAY_CN = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

/* 驗證並正規化 LIFF 送來的生辰（與 z1 相同：日期＋十三時辰＋性別） */
export function normalizeBirth(b) {
  if (!b || typeof b !== 'object') throw new Error('缺少生辰資料');
  const int = (v, lo, hi, name) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(name + '不正確');
    return n;
  };
  const cal = b.cal === 'lunar' ? 'lunar' : 'solar';
  const out = {
    cal,
    leap: cal === 'lunar' && !!b.leap,
    y: int(b.y, 1901, 2099, '年'),
    m: int(b.m, 1, 12, '月'),
    d: int(b.d, 1, cal === 'lunar' ? 30 : 31, '日'),
    hour: int(b.hour, 0, 12, '時辰'),
    gender: b.gender === 'F' ? 'F' : 'M',
    blood: ['A', 'B', 'O', 'AB'].indexOf(b.blood) >= 0 ? b.blood : '' /* 星座卡用；空字串 = 不知道 */
  };
  if (cal === 'solar') {
    if (out.d > new Date(Date.UTC(out.y, out.m, 0)).getUTCDate()) throw new Error('日期不存在');
  } else {
    if (out.leap && leapMonth(out.y) !== out.m) throw new Error('這一年沒有閏' + MONTH_CN[out.m] + '月');
    const max = out.leap ? leapDays(out.y) : lunarMonthDays(out.y, out.m);
    if (out.d > max) throw new Error('農曆' + (out.leap ? '閏' : '') + MONTH_CN[out.m] + '月只有 ' + max + ' 天');
  }
  return out;
}

/* 農曆輸入先轉回國曆，之後完全走 z1 runChart 的流程 */
export function toSolar(b) {
  if (b.cal === 'solar') return { y: b.y, m: b.m, d: b.d };
  const s = Lunar.fromYmd(b.y, b.leap ? -b.m : b.m, b.d).getSolar();
  return { y: s.getYear(), m: s.getMonth(), d: s.getDay() };
}

const MINOR_GOOD = ['左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬'];

/* 與 z1 runChart 相同的排盤流程，回傳 calculateChart 的原始結果 */
function rawChart(b) {
  const s = toSolar(b);
  /* 與 z1 相同：晚子時（23–24 點）日期算到隔天、時辰為子時 */
  const isLateZi = b.hour === 12;
  const hr = isLateZi ? 0 : b.hour;
  let lu;
  if (isLateZi) {
    const nd = new Date(Date.UTC(s.y, s.m - 1, s.d + 1));
    lu = solarToLunar(nd.getUTCFullYear(), nd.getUTCMonth() + 1, nd.getUTCDate());
  } else {
    lu = solarToLunar(s.y, s.m, s.d);
  }
  return { lu, c: calculateChart(lu.year, lu.month, lu.day, hr, b.gender, lu.isLeap ? 1 : 0) };
}

export function computeChart(b) {
  const { lu, c } = rawChart(b);
  /* 依地支索引存（0=子）；index 0 是命宮 */
  const palaces = c.palaces.map(p => ({
    name: p.name, gan: p.gan, dz: p.dzIdx,
    m: p.stars.m.slice(), a: p.stars.a.slice(), b: p.stars.b.slice(),
    dx: [p.daxianStart, p.daxianEnd]
  }));
  const where = star => { const p = palaces.find(x => x.m.concat(x.a, x.b).indexOf(star) >= 0); return p ? p.name : ''; };
  const natalHua = {};
  SH_KEYS.forEach(k => { const star = SIHUA[c.yearGan][k]; natalHua[k] = { star, palace: where(star) }; });
  return {
    engine: 'z1',
    lunarYear: lu.year,
    lunarText: lu.year + ' 年' + (lu.isLeap ? '閏' : '') + MONTH_CN[lu.month] + '月' + DAY_CN[lu.day] + ' ' + HOUR_NAMES[b.hour] + '時',
    yearGz: c.yearGan + c.yearZhi,
    mingDz: c.mingDzIdx,
    shenDz: c.shenDzIdx,
    ju: JU_NAMES_CORRECT[c.juNum] || c.juNum + '局',
    palaces,
    natalHua
  };
}

/* 人格特質：六維雷達、格局基調、三層人格、優勢與盲點（演算法整段取自 z1 的「人格全方位分析」） */
export function personaOf(b) {
  const { c } = rawChart(b);
  const A = personalityOf(c);
  const P = c.palaces;
  const kw = p => psKeyword(P, p);
  return {
    headline: A.headline,
    dims: A.dims,
    pattern: A.pattern ? { key: A.pattern.key, name: A.pattern.name, t: A.pattern.t } : null,
    layers: [
      ['外顯', '命宮', kw(A.ming)],
      ['內心', '福德', kw(A.fu)],
      ['金錢觀', '財帛', kw(A.cai)],
      ['做事方式', '官祿', kw(A.guan)]
    ],
    later: A.sameShen ? '身命同宮，表裡一致，個性到中年後更鮮明' : '身宮在' + A.shen.name + '，中年後重心轉向這裡；' + kw(A.shen),
    good: A.good.slice(0, 4).map(x => x.t),
    flaw: A.flaw.slice(0, 3).map(x => x.t)
  };
}

export function palaceAt(chart, dz) { return chart.palaces.find(p => p.dz === dz); }
export function starPalace(chart, star) { return chart.palaces.find(p => p.m.concat(p.a, p.b).indexOf(star) >= 0) || null; }

/* 主星；空宮時借對宮主星 */
export function mainStarsOf(chart, p) {
  if (p.m.length) return { stars: p.m, borrowed: false };
  const opp = palaceAt(chart, (p.dz + 6) % 12);
  return { stars: opp ? opp.m : [], borrowed: true };
}

export function goodMinors(p) { return p.a.filter(s => MINOR_GOOD.indexOf(s) >= 0); }

/* 「我的命盤」第二張卡用的條列資料 */
export function chartFacts(chart, now = new Date()) {
  const ming = palaceAt(chart, chart.mingDz), shen = palaceAt(chart, chart.shenDz);
  const mm = mainStarsOf(chart, ming);
  const age = now.getUTCFullYear() - chart.lunarYear + 1;
  const dx = chart.palaces.find(p => age >= p.dx[0] && age <= p.dx[1]);
  const huaOne = k => k + ' ' + chart.natalHua[k].star + (chart.natalHua[k].palace ? '→' + chart.natalHua[k].palace.replace('宮', '') : '');
  return [
    ['生辰', '農曆 ' + chart.lunarText + '・' + chart.yearGz + '年'],
    ['命宮', DI_ZHI[ming.dz] + '宮・' + (mm.stars.join('、') || '空宮') + (mm.borrowed && mm.stars.length ? '（借對宮）' : '')],
    ['身宮', (shen.dz === ming.dz ? '身命同宮' : DI_ZHI[shen.dz] + '・' + shen.name) + '・' + chart.ju],
    ['生年四化', huaOne('祿') + '　' + huaOne('權') + '\n' + huaOne('科') + '　' + huaOne('忌')],
    ['目前大限', dx ? dx.name + '（' + dx.dx[0] + '–' + dx.dx[1] + ' 歲）' : '—']
  ];
}

export function chartSummary(chart, now = new Date()) {
  const ming = palaceAt(chart, chart.mingDz), shen = palaceAt(chart, chart.shenDz);
  const mm = mainStarsOf(chart, ming);
  const age = now.getUTCFullYear() - chart.lunarYear + 1; /* 與 z1 相同：虛歲 = 流年 − 出生農曆年 + 1 */
  const dx = chart.palaces.find(p => age >= p.dx[0] && age <= p.dx[1]);
  const hua = SH_KEYS.map(k => '化' + k + ' ' + chart.natalHua[k].star + (chart.natalHua[k].palace ? '（' + chart.natalHua[k].palace + '）' : '')).join('\n');
  return [
    '你的紫微命盤',
    '農曆 ' + chart.lunarText + '・' + chart.yearGz + '年',
    '命宮在' + DI_ZHI[ming.dz] + '：' + (mm.stars.join('、') || '空宮') + (mm.borrowed && mm.stars.length ? '（空宮借對宮）' : ''),
    (shen.dz === ming.dz ? '身命同宮' : '身宮在' + DI_ZHI[shen.dz] + '（' + shen.name + '）') + '・' + chart.ju,
    '',
    '生年四化',
    hua,
    dx ? '\n目前大限：' + dx.name + '（' + dx.dx[0] + '–' + dx.dx[1] + ' 歲）' : ''
  ].filter(x => x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
