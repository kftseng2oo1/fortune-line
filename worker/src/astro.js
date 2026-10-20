/* 西洋星座參考卡：沿用 Astro 的「今日運勢」算法（astro-engine.js 由 Astro 原始碼自動抽出）
 * 只取 Astro 在隨機排序之前就決定的內容（分項星等與說明、月亮星座），
 * 因為 Astro 之後用 sort(() => r() - .5) 挑宜忌與總評，結果會隨瀏覽器的排序實作不同。 */
import { SIGNS, EL, signOf, hash, rng, moonIdx, elRel, ymd, dayScore, lvl, POOL, CATS, BFT, WD, dailyQuote } from './astro-engine.js';

const BLOOD_KEYS = ['A', 'B', 'O', 'AB'];

/* Worker 跑在 UTC，用當天 12:00 UTC 的 Date，本地取值即為該日期（與台灣瀏覽器 setHours(12) 的結果相同） */
export function astroDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function signFor(solar) { return SIGNS.find(s => s.k === signOf(solar.m, solar.d)); }

/* 與 Astro fortuneHTML 的「今日」相同的計算順序；blood 為空字串代表不知道血型 */
export function astroToday(sign, blood, date) {
  const dt = astroDate(date);
  const ov = blood
    ? dayScore(sign, blood, dt)
    : Math.round(BLOOD_KEYS.reduce((a, b) => a + dayScore(sign, b, dt), 0) / BLOOD_KEYS.length); /* 不知道血型：四種平均 */
  const r = rng(hash(sign.k + blood + 'd' + ymd(dt) + 'f'));
  const pick = a => a[Math.floor(r() * a.length)];
  const cats = CATS.map(([k, n]) => {
    const v = Math.max(30, Math.min(99, Math.round(ov + (r() - 0.5) * 34)));
    return { k, n, v, st: Math.max(1, Math.min(5, Math.round(v / 20))), t: pick(POOL[k][lvl(v)]) };
  });
  const m = SIGNS[moonIdx(dt)], rel = elRel(sign.el, m.el);
  const moonNote = m.k === sign.k ? '正好在你的星座，情緒與直覺都特別敏銳。'
    : rel === 'same' || rel === 'good' ? '與你同屬或相生的' + EL[m.el].n + '，氣場順。'
    : rel === 'bad' ? EL[m.el].n + '與你的' + EL[sign.el].n + '相沖，步調容易被打亂。'
    : '影響中性，照自己的節奏走就好。';
  return {
    sign: { k: sign.k, n: sign.n, g: sign.g, el: sign.el, elName: EL[sign.el].n },
    blood,
    ov,
    cats,
    moon: '月亮行經' + m.n + '，' + moonNote,
    bloodTip: blood ? BFT[blood] : '',
    weekday: WD[dt.getDay()]
  };
}

/* Astro 句庫的當日一句（AI 失敗時的備用） */
export function astroQuote(sign, date) { return dailyQuote(sign, astroDate(date)); }
