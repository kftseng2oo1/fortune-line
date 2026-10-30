/* 塔羅：今日一牌（每人每天固定）與聖三角（過去・現在・未來）
 * 牌義與牌位導讀取自塔羅秘境 App（tarot-data.js），不呼叫 AI。逆位機率與 App 相同：1/4。 */
import { CARDS, POS_HINT } from './tarot-data.js';

export const TAROT_CATS = { love: '感情', career: '事業', invest: '財運', health: '健康', general: '整體運勢' };
const GENERAL_HINT = { 過去: '事情的起因與背景', 現在: '目前的狀況', 未來: '接下來可能的走向' };
export const POSITIONS = ['過去', '現在', '未來'];
const SUIT = { major: '大阿爾克那', wands: '權杖', cups: '聖杯', swords: '寶劍', pentacles: '星幣' };

const view = (c, reversed) => ({
  id: c.id, name: c.name, en: c.en, num: c.num, art: c.art, kw: c.kw, el: c.el, pl: c.pl,
  suit: SUIT[c.type] || '', major: c.type === 'major', reversed, text: reversed ? c.rev : c.up
});

/* 今日一牌：LINE userId＋日期做 SHA-256，同一人同一天永遠是同一張；不需要存 KV */
export async function dailyTarot(userId, date) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tarot|' + userId + '|' + date)));
  const n = ((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0;
  return view(CARDS[n % 78], h[4] < 64);
}

function fairInt(n) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(4294967296 / n) * n;
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % n;
}

/* 聖三角：從 78 張洗牌抽出不重複的三張 */
export function drawTrinity(cat) {
  const deck = CARDS.map((_, i) => i);
  const picked = [];
  for (let k = 0; k < 3; k++) {
    const j = k + fairInt(78 - k);
    [deck[k], deck[j]] = [deck[j], deck[k]];
    picked.push(deck[k]);
  }
  const hints = POS_HINT[cat] || GENERAL_HINT;
  const cards = picked.map((i, k) => Object.assign(view(CARDS[i], fairInt(4) === 0), { pos: POSITIONS[k], hint: hints[POSITIONS[k]] }));
  return { cat, catName: TAROT_CATS[cat] || '', cards, summary: trinitySummary(cards) };
}

/* 三張牌的整體提示（依大牌數與逆位數） */
export function trinitySummary(cards) {
  const majors = cards.filter(c => c.major).length, rev = cards.filter(c => c.reversed).length;
  const out = [];
  if (majors >= 2) out.push('大阿爾克那有 ' + majors + ' 張：這件事牽涉人生較大的轉折，值得認真看待。');
  else if (majors === 0) out.push('三張都是小阿爾克那：重點在日常的處理方式，按部就班就好。');
  if (rev >= 2) out.push('逆位有 ' + rev + ' 張：事情目前卡住或需要向內調整，先別急著行動。');
  else if (rev === 0) out.push('三張都是正位：能量順暢，可以照著心意往前走。');
  const f = cards[2];
  out.push('未來是「' + f.name + (f.reversed ? '（逆位）' : '') + '」：' + f.kw.slice(0, 3).join('、') + '。');
  return out;
}
