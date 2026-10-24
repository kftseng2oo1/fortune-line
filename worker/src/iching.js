/* 易經卜卦：三數起卦（與數位易經 App 同法）
 *   第一個數字 ÷8 取餘 → 上卦；第二、三個數字相加 ÷8 取餘 → 下卦；三數相加 ÷6 取餘 → 動爻（餘 0 當 8 或 6）
 *   八卦用先天數：1乾 2兌 3離 4震 5巽 6坎 7艮 8坤
 * 爻辭與各類別解讀直接取自 App 的資料庫，不呼叫 AI。 */
import { HEX, YAO, CATS } from './iching-data.js';

export const CAT_NAME = { career: '事業', health: '健康', love: '愛情', wealth: '財運', investment: '投資', marriage: '婚姻', lawsuit: '官司', property: '購屋' };
export const TRI = {
  1: { n: '乾', img: '天', lines: [1, 1, 1] }, 2: { n: '兌', img: '澤', lines: [1, 1, 0] },
  3: { n: '離', img: '火', lines: [1, 0, 1] }, 4: { n: '震', img: '雷', lines: [1, 0, 0] },
  5: { n: '巽', img: '風', lines: [0, 1, 1] }, 6: { n: '坎', img: '水', lines: [0, 1, 0] },
  7: { n: '艮', img: '山', lines: [0, 0, 1] }, 8: { n: '坤', img: '地', lines: [0, 0, 0] }
};   /* lines 由下往上，1 = 陽爻 */
const LEVEL = {
  L1: ['元吉', 100], L2: ['吉', 90], L3: ['吉', 80], L4: ['平', 70],
  L5: ['悔', 60], L6: ['吝', 50], L7: ['厲', 40], L8: ['凶', 30], L9: ['大凶', 20]
};

const BY_TRI = {};
for (const id in HEX) BY_TRI[HEX[id].u + '-' + HEX[id].l] = Number(id);
const triOf = lines => Number(Object.keys(TRI).find(k => TRI[k].lines.join('') === lines.join('')));

/* 把「528」「5 2 8」「５２８」這類輸入轉成三個數字；第一個數字不能是 0 */
export function parseDigits(t) {
  const s = String(t || '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 48)).replace(/[\s,，、.]/g, '');
  if (!/^[1-9][0-9]{2}$/.test(s)) return null;
  return s.split('').map(Number);
}
export const looksLikeDigits = t => /^[\s0-9０-９,，、.]+$/.test(String(t || '')) && /[0-9０-９]/.test(t);

/* 公平亂數：crypto 亂數 + 拒絕取樣，沒有取餘偏差 */
function fairInt(n) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(4294967296 / n) * n;
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % n;
}
const SUITS = ['♠', '♥', '♦', '♣'];
const RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
/* 與 App 的撲克抽牌相同：百位牌 A–8（八個上卦各 1/8），十位、個位牌 A–10（10 代表 0） */
export function drawCards() {
  return [8, 10, 10].map(max => {
    const rank = fairInt(max) + 1;
    return { digit: rank % 10, label: SUITS[fairInt(4)] + RANK[rank] };
  });
}

export function cast(digits, cat) {
  const [a, b, c] = digits;
  const upper = a % 8 || 8;
  const lower = (b + c) % 8 || 8;
  const moving = (a + b + c) % 6 || 6;
  const id = BY_TRI[upper + '-' + lower];
  const lines = TRI[lower].lines.concat(TRI[upper].lines);           /* 由下往上六爻 */
  const changedLines = lines.slice(); changedLines[moving - 1] = 1 - changedLines[moving - 1];
  const changedId = BY_TRI[triOf(changedLines.slice(3)) + '-' + triOf(changedLines.slice(0, 3))];
  const y = YAO[id + '-' + moving];
  const ci = CATS.indexOf(cat);
  const [judge, score] = LEVEL[y.level] || LEVEL.L4;
  return {
    digits, cat, catName: CAT_NAME[cat] || '',
    id, name: HEX[id].n, upper: TRI[upper], lower: TRI[lower], lines, moving,
    changed: { id: changedId, name: HEX[changedId].n },
    yao: { name: y.name, text: y.text, keywords: y.kw },
    judge, score, tone: score >= 80 ? 'good' : score <= 40 ? 'bad' : 'neutral',
    guide: (ci >= 0 && y.i[ci]) || '這一爻沒有針對此事項的解讀，請參考爻辭的意思。'
  };
}
