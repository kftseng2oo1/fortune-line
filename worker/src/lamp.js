/* 🪔 阿拉燈・佛法心靈導師（移植自 kftseng2oo1/buddha）
 * 在 LINE 裡變成「對話模式」：只有阿拉燈導師一位（其他上師用按鈕連到 App），使用者打的文字都交給阿拉燈回答，按「結束對話」或 30 分鐘沒說話就離開。
 * - 典籍檢索：沿用 twinklehub Worker 的 /rag/query（智慧庫，wisdom-indexer 建檔）
 * - AI：經 arcar 代理（和今日運勢同一條路）
 * - 只暫存最近 3 輪對話（KV，30 分鐘自動刪除），不做長期記憶、不存姓名生日
 * - 偵測到自傷／輕生訊號時，固定附上專線資訊，且不受每日次數限制 */
import { callAI } from './ai.js';

export const LAMP = id => 'lamp:' + id;                       /* 對話中：{ m: 導師, h: 最近對話, at } */
export const LAMP_COUNT = (date, id) => 'lampn:' + date + ':' + id;  /* 今日已問次數 */
const SESSION_TTL = 1800;
const MAX_TURNS = 3;          /* 保留最近 3 輪（6 則）給 AI 參考 */
const MAX_INPUT = 500;        /* 單則提問上限字數 */

const COMMON = '你是 LINE 官方帳號「每日命盤運勢」裡的佛法心靈導師「阿拉燈」。';

/* 只保留阿拉燈導師（App 的 general）；其他上師請到 App 問 */
export const MASTERS = {
  general: {
    name: '阿拉燈導師', emoji: '🪔',
    system: '你是一位慈悲博學的佛法導師，精通三藏（經律論），以釋迦牟尼佛的教導為根本，融貫南傳、北傳與藏傳佛教智慧。' +
      '先以慈悲心聆聽並確認對方的困境與感受，再以佛法智慧引導；有適切的經典依據就自然引用（「據《…》」或「如佛陀所說」），最後給一個具體可實行的修行建議或觀修方法。' +
      '典籍優先：阿含經、法句經、心經、金剛經、維摩詰經、六祖壇經、楞嚴經。不評判其他宗教，不聲稱自己是佛陀或菩薩。語氣溫和如春風，但智慧犀利如劍。'
  }
};
export const MASTER_KEYS = Object.keys(MASTERS);

/* LINE 純文字顯示：不支援 Markdown，手機一屏大約 250 字 */
const LINE_RULES = '【回覆格式】這是 LINE 聊天：繁體中文、台灣用語；不要用 Markdown（不要 #、*、表格、條列符號），' +
  '分 2 到 4 個短段落，段落間空一行；全文 150 到 300 個字。最後一行固定寫「（此為依法理解，請以原典與真實師父指導為準 🙏）」。' +
  '只回答佛法、修行、人生煩惱與心靈相關的問題；若對方問的是運勢、算命，溫和地把話題帶回當下的心與修行，並提醒可以點選單的「今日運勢」。';

const SAFETY_PROMPT = '【安全原則】你是修行陪伴者，不是醫師或心理師。若對方談到想傷害自己、不想活或極度絕望，' +
  '請先以溫和、不評斷的語氣接住他的感受，不要說教，也不要用「業力」「因果」解釋他的痛苦；' +
  '鼓勵他聯繫身邊可信任的人與專業協助。對於疾病、藥物、法律、投資等專業問題，請說明這超出你的角色，建議諮詢專業人員。';
const CRISIS_PROMPT = '【本次對話偵測到可能的自傷或輕生訊號】請只做三件事：' +
  '(1) 用簡短、溫暖的話回應他的感受，讓他知道你在聽；(2) 輕輕詢問他現在是否安全、身邊有沒有可以陪伴的人；' +
  '(3) 鼓勵他現在就聯絡專業協助（專線資訊會由系統附在回覆後，你不必重複寫電話）。' +
  '回應要短，不要引用經文、不要講大道理、不要給修行功課，也不要寫最後那行固定結語。';
const CITE_RULE = '【引文規則】只能以引號引用下方「智慧庫」的典籍段落，或你確定出處與原文無誤的經文；' +
  '不確定出處就不要加引號與來源，改用自己的話說明。絕對不要編造法師語錄或經文。';

const CRISIS_RE = /(想死|不想活|活不下去|不想再活|自殺|輕生|尋死|結束(自己的)?生命|了結(自己|生命)|想消失|消失就好|傷害自己|自殘|割腕|跳樓|上吊|吞藥|撐不下去|活著(好)?(沒|沒有)意思|活著好累)/;
export const detectCrisis = t => CRISIS_RE.test(t || '');

export const CRISIS_FOOTER = '\n\n🤍 如果你現在很痛苦，請不要一個人撐著：\n' +
  '・安心專線 1925（24 小時，免費）\n' +
  '・生命線 1995\n' +
  '・張老師 1980\n' +
  '・有立即危險請撥 119 或 110，或請身邊的人陪你去急診。\n' +
  '我只是陪伴修行的小幫手，無法取代真人的協助。';
const CRISIS_FALLBACK = '我聽到了，你現在一定很辛苦。謝謝你願意說出來。\n\n你現在安全嗎？身邊有沒有一個可以陪你的人？可以的話，請現在就打給他，或打下面的專線，有人會好好聽你說。';

/* 現代法師語料是意旨摘要，不當逐字原文 */
const PARAPHRASE = ['shengyen', 'hsuan', 'tibetan'];   /* 智慧庫各傳承的段落都可能被檢索到 */

/* 智慧庫檢索：失敗或逾時就略過，不影響回答 */
export async function queryWisdom(env, q) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Number(env.WISDOM_TIMEOUT_MS || 5000));
  try {
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, top_k: 3 }), signal: ctrl.signal };
    /* 同帳號 Worker 互叫用 Service Binding，避免 workers.dev 互打被擋 */
    const r = env.TWINKLE ? await env.TWINKLE.fetch('https://twinklehub/rag/query', init)
      : await fetch((env.WISDOM_URL || 'https://twinklehub.kftseng2oo1.workers.dev') + '/rag/query', init);
    if (!r.ok) return [];
    const j = await r.json().catch(() => null);
    return (j && Array.isArray(j.matches)) ? j.matches.slice(0, 3) : [];
  } catch (e) {
    console.warn('wisdom query failed', e && e.message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function wisdomContext(matches) {
  if (!matches.length) return '\n\n本次沒有檢索到相關典籍，請直接以自己的話回應。';
  return '\n\n【智慧庫・相關典籍段落】以下是與問題語意相關的典籍，請自然引用（「據《來源》」），不要逐字背誦：\n' +
    matches.map(m => '《' + (m.source || '') + '》' + (m.chapter ? '・' + m.chapter : '') +
      (PARAPHRASE.indexOf(m.tradition) >= 0 ? '（意旨摘要，非逐字原文，引用時說「大意是…」，不要加引號）' : '') +
      '\n' + String(m.text || '').slice(0, 400) + (m.translation ? '\n白話：' + String(m.translation).slice(0, 200) : '')
    ).join('\n\n');
}

export function buildSystem(master, matches, crisis) {
  const m = MASTERS[master] || MASTERS.general;
  return COMMON + '\n' + m.system + '\n\n' + LINE_RULES + '\n\n' + SAFETY_PROMPT + '\n\n' + CITE_RULE + wisdomContext(matches) +
    (crisis ? '\n\n' + CRISIS_PROMPT : '');
}

/* LINE 純文字：去掉 Markdown 記號、多餘空行，太長就在句號處截斷 */
export function cleanLamp(raw) {
  let t = String(raw || '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*[-*•]\s+/gm, '・')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (t.length > 900) {
    const cut = t.lastIndexOf('。', 860);
    t = (cut > 200 ? t.slice(0, cut + 1) : t.slice(0, 860) + '…');
  }
  return t;
}

/* 截到最後一個句號／問號／驚嘆號（含後面的引號括號）；找不到就加刪節號 */
export function toLastSentence(t) {
  t = String(t || '').trimEnd();
  const m = t.match(/^[\s\S]*[。！？!?][」』）)]*/);
  return m && m[0].length >= 40 ? m[0] : t + '…';
}

export async function loadSession(env, userId) {
  const raw = await env.FORTUNE_KV.get(LAMP(userId));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
export async function saveSession(env, userId, s) {
  s.at = Date.now();
  await env.FORTUNE_KV.put(LAMP(userId), JSON.stringify(s), { expirationTtl: SESSION_TTL });
}

export const dailyLimit = env => Math.max(1, Number(env.LAMP_DAILY_LIMIT || 10));

/* 問一題：回傳 { text, limited, crisis, fallback } */
export async function askLamp(env, userId, session, question, date) {
  const q = String(question || '').trim().slice(0, MAX_INPUT);
  const crisis = detectCrisis(q);
  const countKey = LAMP_COUNT(date, userId);
  const used = Number(await env.FORTUNE_KV.get(countKey) || 0);
  if (!crisis && used >= dailyLimit(env)) return { limited: true, text: '' };

  const matches = crisis ? [] : await queryWisdom(env, q);
  const history = (session.h || []).slice(-MAX_TURNS * 2);
  const messages = history.concat([{ role: 'user', content: q }]);
  let text, fallback = false;
  try {
    const out = await callAI(env, messages, buildSystem(session.m, matches, crisis), 3000,
      { model: env.LAMP_MODEL, timeoutMs: Number(env.LAMP_TIMEOUT_MS || 25000), withStop: true });
    /* 字數用完被截斷時，退回最後一個完整句子，不要停在半句 */
    text = cleanLamp(out.stop === 'max_tokens' ? toLastSentence(out.text) : out.text);
    if (!text) throw new Error('阿拉燈回覆整理後為空白');
  } catch (e) {
    console.error('lamp AI failed', e && e.message);
    fallback = true;
    text = crisis ? CRISIS_FALLBACK : '';
  }
  if (crisis) text += CRISIS_FOOTER;
  if (fallback && !crisis) return { fallback: true, text: '' };

  /* 成功才記錄：歷史只存純文字、各自截短，30 分鐘後自動刪除 */
  session.h = messages.concat([{ role: 'assistant', content: text.slice(0, 700) }])
    .map(x => ({ role: x.role, content: String(x.content).slice(0, 700) })).slice(-MAX_TURNS * 2);
  await Promise.all([
    saveSession(env, userId, session),
    crisis ? null : env.FORTUNE_KV.put(countKey, String(used + 1), { expirationTtl: 172800 })
  ]);
  return { text, crisis, left: crisis ? null : dailyLimit(env) - used - 1 };
}
