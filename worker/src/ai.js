/* AI 解讀：經 arcar 代理呼叫（Messages API 格式），結果依「日期＋盤型 hash」快取在 KV */
import { featureHash, fallbackReading } from './daily.js';
import { astroQuote } from './astro.js';

const SYSTEM = [
  '你是台灣的紫微斗數老師，替 LINE 用戶寫「今日運勢」短評。',
  '規則：',
  '1. 繁體中文、台灣用語，語氣溫和實用，不恐嚇、不宿命。',
  '2. 60 到 90 個字，一段話，不用標題、條列、表情符號或 Markdown。',
  '3. 依據流日命宮落入的本命宮位與星曜、流日化祿與化忌的落點，說明今天適合把力氣放在哪個生活面向、要留意什麼。',
  '4. 結尾給一個今天就能做的具體小建議。',
  '5. 不給醫療、投資、法律方面的具體建議；不要提到 AI 或資料來源；不要重複宜忌、幸運色與四化清單（畫面另有顯示）。',
  '6. 只把短評本身放在 <r> 與 </r> 之間，例如 <r>今天…</r>。標籤外不要寫任何文字，不要寫思考過程或規劃。'
].join('\n');

function describe(f) {
  const lines = [
    '流日干支：' + f.dayGz,
    '流日命宮落在本命' + f.dayMing + '，星曜：' + f.dayMingStars + (f.hasSha ? '（同宮有煞星）' : ''),
    '流日化祿：' + f.lu,
    '流日化忌：' + f.ji,
    '整體星等：' + f.stars + ' / 5'
  ];
  return lines.join('\n');
}

/* 快取版本：AI 輸出格式改變時換版本，舊快取自動失效 */
const CACHE_V = 'v2:';

/* 呼叫 AI，回傳原始文字（保留換行，由呼叫端整理）
 * max_tokens 給足：若 arcar 或模型啟用了「思考」，太小的上限會在寫出正文前就用完 */
async function callAI(env, user, system = SYSTEM, maxTokens = 1024) {
  const body = JSON.stringify({
    model: env.AI_MODEL || 'claude-haiku-5-5',
    max_tokens: Math.max(maxTokens, Number(env.AI_MAX_TOKENS || 0)),
    system,
    messages: [{ role: 'user', content: user }]
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Number(env.AI_TIMEOUT_MS || 20000));
  try {
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctrl.signal };
    /* 同帳號 Worker 互叫用 Service Binding，避免 workers.dev 同區域請求被擋 */
    const r = env.ARCAR ? await env.ARCAR.fetch('https://arcar/', init) : await fetch(env.AI_URL || 'https://arcar.kftseng2oo1.workers.dev', init);
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !Array.isArray(j.content)) throw new Error('AI HTTP ' + r.status + ' ' + JSON.stringify(j && j.error || j).slice(0, 200));
    const txt = j.content.filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    if (!txt) {
      throw new Error('AI 回傳空白｜model=' + (j.model || '?') + '｜stop_reason=' + (j.stop_reason || '?')
        + '｜內容種類=' + (j.content.map(c => c.type).join(',') || '無') + '｜usage=' + JSON.stringify(j.usage || {}));
    }
    return txt;
  } finally {
    clearTimeout(timer);
  }
}

/* 解讀：去掉 Markdown、合併成一段；太長就在句號處截斷 */
/* 取出最後一組 <tag>…</tag> 的內容（模型若先寫規劃，答案通常在最後） */
function tagged(raw, tag) {
  const all = [...String(raw || '').matchAll(new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>', 'g'))];
  return all.length ? all[all.length - 1][1].trim() : null;
}
/* 看起來像在複述指示或規劃的句子 */
const META = /(\d+\s*(到|-|～|~)\s*\d+\s*(個)?字|繁體|台灣用語|星座名稱|不要|不提|規則|要求|需要一句|輸出|標籤|思考|規劃|這句話|小語|短評|讀者|用戶|語氣)/;

export function cleanReading(raw) {
  const inTag = tagged(raw, 'r');
  let t = inTag !== null ? inTag : String(raw || '').split(/\n+/).filter(l => !META.test(l)).join('');
  t = t.replace(/<\/?[a-z]+>/g, '').replace(/[#*`>]/g, '').replace(/\s*\n+\s*/g, '').trim();
  if (META.test(t)) return '';
  if (t.length > 160) {
    const cut = t.lastIndexOf('。', 150);
    t = cut > 40 ? t.slice(0, cut + 1) : t.slice(0, 150) + '…';
  }
  return t;
}

/* 心靈小語：AI 偶爾會附上說明或多句，挑出真正那一句 */
export function pickQuote(raw) {
  const inTag = tagged(raw, 'q');
  if (inTag !== null) raw = inTag;
  const strip = l => l.replace(/^[\s\-*•>#\d.、)）]+/, '').replace(/[*`#]/g, '').trim().replace(/^[「『"“]+|[」』"”]+$/g, '').trim();
  const lines = String(raw || '').split(/\n+/).map(strip).filter(Boolean);
  const ok = l => l.length >= 8 && l.length <= 60 && /[\u4e00-\u9fff]/.test(l) && !/[:：]$/.test(l) && !/^(以下|這是|好的|今日心靈小語|心靈小語)/.test(l) && !META.test(l);
  /* 心靈小語只要一句：每行取到第一個句號為止（後面常是 AI 自己加的說明） */
  const first = l => { const m = l.match(/^.+?[。！？!?]/); return m ? m[0] : l; };
  for (const l of lines) {
    const q = first(l);
    if (ok(q)) return q;
  }
  return null;
}

export async function getReading(env, date, features) {
  const key = CACHE_V + 'reading:' + date + ':' + await featureHash(features);
  const cached = await env.FORTUNE_KV.get(key);
  if (cached) return { text: cached, cached: true };
  try {
    const text = cleanReading(await callAI(env, describe(features), SYSTEM, 1024));
    if (!text) throw new Error('AI 解讀整理後為空白');
    await env.FORTUNE_KV.put(key, text, { expirationTtl: 172800 });
    return { text, cached: false };
  } catch (e) {
    console.error('AI failed', e && e.message);
    return { text: fallbackReading(features), cached: false, fallback: true };
  }
}

/* ---------- 心靈小語：每天每個星座一句，所有同星座的人共用（一天最多 12 次 AI 呼叫） ---------- */
const QUOTE_SYSTEM = [
  '你替 LINE 用戶寫每天早上的「心靈小語」，對象多為中年以上的台灣讀者。',
  '規則：繁體中文、台灣用語；一句話，18 到 32 個字；溫暖、具體、不說教；',
  '貼近星座的元素特質但不要寫出星座名稱；不提宗教、不提 AI；不用引號、表情符號或 Markdown。',
  '只把那一句放在 <q> 與 </q> 之間，例如 <q>今天…。</q>。標籤外不要寫任何文字，不要寫思考過程或規劃。'
].join('\n');

function prevDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

export async function getQuote(env, date, sign) {
  const key = CACHE_V + 'quote:' + date + ':' + sign.k;
  const cached = await env.FORTUNE_KV.get(key);
  if (cached) return { text: cached, cached: true };
  try {
    const yesterday = await env.FORTUNE_KV.get(CACHE_V + 'quote:' + prevDate(date) + ':' + sign.k);
    const user = '日期：' + date + '\n對象：' + sign.n + '（' + sign.elName + '）' + (yesterday ? '\n昨天的句子（請換不同角度）：' + yesterday : '');
    const raw = await callAI(env, user, QUOTE_SYSTEM, 600);
    const text = pickQuote(raw);
    if (!text) throw new Error('心靈小語格式不符｜AI 原文：' + raw.replace(/\s+/g, ' ').slice(0, 120));
    await env.FORTUNE_KV.put(key, text, { expirationTtl: 172800 });
    return { text, cached: false };
  } catch (e) {
    console.error('quote AI failed', e && e.message);
    return { text: astroQuote(sign, date), cached: false, fallback: true };
  }
}

export { describe as describeFeatures, SYSTEM };
