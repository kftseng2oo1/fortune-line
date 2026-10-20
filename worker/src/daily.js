/* 流日分析（紫微）：今天的干支 → 流日命宮落在本命哪一宮、流日四化飛入哪幾宮 */
import lunar from 'lunar-javascript';
import { SIHUA, SH_KEYS } from './ziwei-engine.js';
import { palaceAt, starPalace, mainStarsOf, goodMinors } from './ziwei.js';
const { Solar } = lunar;

/* 黃曆詞彙簡轉繁（lunar-javascript 只給簡體） */
const S2T = {
  进: '進', 殓: '殮', 谢: '謝', 启: '啟', 钻: '鑽', 坟: '墳', 斋: '齋', 动: '動', 马: '馬', 东: '東', 纳: '納', 订: '訂',
  车: '車', 庙: '廟', 归: '歸', 宁: '寧', 学: '學', 医: '醫', 竖: '豎', 盖: '蓋', 门: '門', 丧: '喪', 开: '開', 会: '會',
  亲: '親', 机: '機', 涂: '塗', 鸡: '雞', 产: '產', 桥: '橋', 绘: '繪', 猪: '豬', 种: '種', 坏: '壞', 诸: '諸', 猎: '獵',
  仓: '倉', 龙: '龍', 帐: '帳', 经: '經', 络: '絡', 扫: '掃', 无: '無', 挂: '掛', 补: '補', 渔: '漁', 饰: '飾', 墙: '牆',
  养: '養', 厕: '廁', 发: '髮', 针: '針', 货: '貨', 财: '財', 词: '詞', 讼: '訟', 结: '結', 网: '網', 佣: '傭', 寿: '壽',
  习: '習', 艺: '藝', 筑: '築', 断: '斷', 蚁: '蟻', 馀: '餘', 冲: '沖'
};
export function t2(s) { return Array.from(String(s || '')).map(c => S2T[c] || c).join(''); }

const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const GOOD_MAIN = ['紫微', '天府', '太陽', '太陰', '天同', '天梁', '天相', '武曲', '天機'];
const SHA = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];
const KEY_PALACES = ['命宮', '財帛宮', '官祿宮', '遷移宮', '福德宮'];
/* 主星五行 → 幸運色 */
const STAR_COLOR = {
  紫微: '黃色', 天府: '黃色', 天梁: '黃色', 天機: '綠色', 貪狼: '綠色', 太陽: '紅色', 廉貞: '紅色',
  武曲: '白色', 七殺: '白色', 天同: '藍色', 太陰: '藍色', 巨門: '藍色', 天相: '藍色', 破軍: '黑色'
};

/* 台灣時間的今天 YYYY-MM-DD */
export function taipeiDate(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}

/* 當日共用資料（所有人相同）：干支、宜忌、喜神方位 */
export function dailyInfo(date) {
  const [y, m, d] = date.split('-').map(Number);
  const l = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar();
  return {
    date,
    dayGz: l.getDayInGanZhi(),
    lunar: t2(l.getMonthInChinese() + '月' + l.getDayInChinese()),
    yi: l.getDayYi().slice(0, 4).map(t2),
    ji: l.getDayJi().slice(0, 4).map(t2),
    xiPos: t2(l.getDayPositionXiDesc())
  };
}

/* 個人流日特徵：同樣特徵的人共用同一篇 AI 解讀
 * 流日命宮採「以日支定流日命宮」，流日四化依日干。 */
export function dayFeatures(chart, daily) {
  const gan = daily.dayGz.charAt(0), zhi = ZHI.indexOf(daily.dayGz.charAt(1));
  const dp = palaceAt(chart, zhi);                     /* 流日命宮落在本命的這一宮 */
  const opp = palaceAt(chart, (zhi + 6) % 12);
  const ms = mainStarsOf(chart, dp);
  const sha = dp.b.filter(s => SHA.indexOf(s) >= 0);
  const helpers = goodMinors(dp);

  const hua = {};
  SH_KEYS.forEach(k => {
    const star = SIHUA[gan][k], p = starPalace(chart, star);
    hua[k] = { star, palace: p ? p.name : '', toDayMing: !!p && p.dz === zhi, toOpp: !!p && p.dz === opp.dz };
  });

  let score = 0;
  ms.stars.forEach(s => { if (GOOD_MAIN.indexOf(s) >= 0) score += ms.borrowed ? 0.25 : 0.5; });
  score += Math.min(helpers.length, 2) * 0.5;
  score -= sha.length * 1;
  const W = { 祿: 1.5, 權: 1, 科: 0.75 };
  ['祿', '權', '科'].forEach(k => {
    const h = hua[k];
    if (!h.palace) return;
    score += (h.toDayMing || KEY_PALACES.indexOf(h.palace) >= 0) ? W[k] : W[k] * 0.3;
  });
  const ji = hua['忌'];
  if (ji.palace) {
    if (ji.toDayMing) score -= 2.5;
    else if (ji.toOpp) score -= 2;                       /* 忌沖流日命宮 */
    else if (['命宮', '財帛宮', '官祿宮', '疾厄宮'].indexOf(ji.palace) >= 0) score -= 1.5;
    else score -= 0.5;
  }
  /* 門檻依 400 張命盤 × 120 天的分數分布校準：約 1★10%、2★20%、3★40%、4★20%、5★10% */
  const stars = score >= T[3] ? 5 : score >= T[2] ? 4 : score >= T[1] ? 3 : score >= T[0] ? 2 : 1;
  const _score = score;
  /* 只分三類，讓同類型的人共用解讀；確切宮位另外顯示在卡片上 */
  const where = h => h.toDayMing ? '流日命宮' : h.toOpp ? '流日遷移（對宮）' : KEY_PALACES.indexOf(h.palace) >= 0 ? '本命要宮' : '其他宮位';

  return {
    /* f 是 AI 解讀唯一的依據，也是快取 key：只放決定一段短評走向的要素 */
    f: {
      dayGz: daily.dayGz,
      dayMing: dp.name,
      dayMingStars: ms.stars.join('') || '空宮',
      hasSha: sha.length > 0,
      lu: hua['祿'].star + '入' + where(hua['祿']),
      ji: hua['忌'].star + '入' + where(hua['忌']),
      stars
    },
    sha, helpers,
    hua,
    color: [STAR_COLOR[ms.stars[0]], STAR_COLOR[hua['祿'].star]].filter((c, i, a) => c && a.indexOf(c) === i),
    _score
  };
}
export const T = [-0.45, 0.7, 2.05, 3.05];

export async function featureHash(f) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(f)));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* AI 失敗時的備用短評，確保一定回得出東西 */
export function fallbackReading(f) {
  const tone = { 5: '氣場順，適合主動出擊、推進重要的事。', 4: '整體順利，把握上午處理關鍵事務。', 3: '平穩的一天，按部就班最穩當。', 2: '節奏容易被打亂，重要決定可以緩一緩。', 1: '宜守不宜攻，多留餘裕、少逞強。' }[f.stars];
  return '今天流日命宮走到你的' + f.dayMing + '（' + f.dayMingStars + '），' + tone;
}
