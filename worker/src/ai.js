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
  '5. 不給醫療、投資、法律方面的具體建議；不要提到 AI 或資料來源；不要重複宜忌、幸運色與四化清單（畫面另有顯示）。'
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

async function callAI(env, user, system = SYSTEM, maxTokens = 300) {
  const body = JSON.stringify({
    model: env.AI_MODEL || 'claude-haiku-5-5',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }]
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Number(env.AI_TIMEOUT_MS || 12000));
  try {
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctrl.signal };
    /* 同帳號 Worker 互叫用 Service Binding，避免 workers.dev 同區域請求被擋 */
    const r = env.ARCAR ? await env.ARCAR.fetch('https://arcar/', init) : await fetch(env.AI_URL || 'https://arcar.kftseng2oo1.workers.dev', init);
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !Array.isArray(j.content)) throw new Error('AI HTTP ' + r.status + ' ' + JSON.stringify(j && j.error || j).slice(0, 200));
    const txt = j.content.filter(c => c.type === 'text').map(c => c.text).join('').trim();
    if (!txt) throw new Error('AI 回傳空白');
    return txt.replace(/[#*`>]/g, '').replace(/\s*\n+\s*/g, '');
  } finally {
    clearTimeout(timer);
  }
}

export async function getReading(env, date, features) {
  const key = 'reading:' + date + ':' + await featureHash(features);
  const cached = await env.FORTUNE_KV.get(key);
  if (cached) return { text: cached, cached: true };
  try {
    const text = await callAI(env, describe(features));
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
  '貼近星座的元素特質但不要寫出星座名稱；不提宗教、不提 AI；不用引號、表情符號或 Markdown；只輸出那一句。'
].join('\n');

function prevDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

export async function getQuote(env, date, sign) {
  const key = 'quote:' + date + ':' + sign.k;
  const cached = await env.FORTUNE_KV.get(key);
  if (cached) return { text: cached, cached: true };
  try {
    const yesterday = await env.FORTUNE_KV.get('quote:' + prevDate(date) + ':' + sign.k);
    const user = '日期：' + date + '\n對象：' + sign.n + '（' + sign.elName + '）' + (yesterday ? '\n昨天的句子（請換不同角度）：' + yesterday : '');
    const text = (await callAI(env, user, QUOTE_SYSTEM, 120)).replace(/^[「『"]|[」』"]$/g, '');
    if (text.length > 60) throw new Error('心靈小語太長');
    await env.FORTUNE_KV.put(key, text, { expirationTtl: 172800 });
    return { text, cached: false };
  } catch (e) {
    console.error('quote AI failed', e && e.message);
    return { text: astroQuote(sign, date), cached: false, fallback: true };
  }
}

export { describe as describeFeatures, SYSTEM };
