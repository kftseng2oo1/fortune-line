/* 每日命盤運勢 LINE Bot（階段一：免費版 MVP）
 * 路由：
 *   POST /webhook        LINE Messaging API webhook
 *   POST /api/profile    LIFF 送出生辰 → 排盤並存檔
 *   POST /api/me         LIFF 讀回已存的生辰（修改用）
 *   POST /api/delete     LIFF 刪除資料
 *   GET  /               健康檢查
 * 易經卜卦：選類別 → 輸入三個數字或抽三張牌 → 回覆卦卡（資料取自數位易經 App，不呼叫 AI）
 * 免費版所有回覆都走 Reply API，不消耗官方帳號的推播額度。 */
import { normalizeBirth, computeChart, chartSummary, toSolar } from './ziwei.js';
import { astroToday, signFor } from './astro.js';
import { taipeiDate, dailyInfo, dayFeatures } from './daily.js';
import { getReading, getQuote } from './ai.js';
import { cast, drawCards, parseDigits, looksLikeDigits, CAT_NAME } from './iching.js';
import { verifySignature, reply, text, qr, qrUri, menuQuick, liffUrl, fortuneFlex, setupFlex, confirmDelete, ichingFlex, ichingCatQuick } from './line.js';

const USER = id => 'user:' + id;
const ICHING = id => 'iching:' + id;   /* 選好類別、等使用者輸入數字（10 分鐘內有效） */
const ENGINE_VERSION = 2; // 2 = 紫微（z1 引擎）

/* ---------- 共用 ---------- */
function cors(env, req) {
  const origin = req.headers.get('Origin') || '';
  const allow = (env.ALLOWED_ORIGINS || 'https://kftseng2oo1.github.io').split(',').map(s => s.trim());
  return {
    'Access-Control-Allow-Origin': allow.indexOf(origin) >= 0 ? origin : allow[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}
function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers || {}) });
}
async function loadUser(env, id) {
  const raw = await env.FORTUNE_KV.get(USER(id));
  return raw ? JSON.parse(raw) : null;
}

/* LIFF 的 ID token 交給 LINE 驗證，取得可信的 userId（不信任前端傳來的 ID） */
async function verifyIdToken(env, idToken) {
  if (!idToken || typeof idToken !== 'string') throw new Error('未登入 LINE');
  const r = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: env.LINE_LOGIN_CHANNEL_ID })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.sub) throw new Error('LINE 登入驗證失敗，請重新開啟頁面');
  return j.sub;
}

function fullSummary(user) {
  const sign = signFor(toSolar(user.birth));
  return chartSummary(user.chart) + '\n\n西洋星座：' + sign.g + ' ' + sign.n + (user.birth.blood ? '・' + user.birth.blood + ' 型' : '（血型未填）');
}

/* ---------- 今日運勢 ---------- */
export async function buildToday(env, user, date) {
  const daily = dailyInfo(date);
  const x = dayFeatures(user.chart, daily);
  const sign = signFor(toSolar(user.birth));
  const astro = astroToday(sign, user.birth.blood || '', date);
  const [r, q] = await Promise.all([getReading(env, date, x.f), getQuote(env, date, astro.sign)]);
  return fortuneFlex(env, { daily, features: x.f, reading: r.text, colors: x.color, hua: x.hua, astro, quote: q.text });
}

/* ---------- Webhook 事件 ---------- */
async function handleAction(env, userId, replyToken, action, p) {
  p = p || new URLSearchParams();
  if (action === 'iching') {
    await env.FORTUNE_KV.delete(ICHING(userId));
    return reply(env, replyToken, [text('🔮 易經卜卦\n先靜下心，在心中默念想問的事情，再選擇類別：', ichingCatQuick())]);
  }
  if (action === 'iching_cat') {
    const cat = p.get('cat');
    if (!CAT_NAME[cat]) return handleAction(env, userId, replyToken, 'iching');
    const digits = parseDigits(p.get('n'));
    if (digits) return reply(env, replyToken, [ichingFlex(cast(digits, cat))]);
    await env.FORTUNE_KV.put(ICHING(userId), cat, { expirationTtl: 600 });
    return reply(env, replyToken, [text(
      '問「' + CAT_NAME[cat] + '」。\n心中想著這件事，憑直覺打三個數字，例如 528（第一個數字不能是 0）。\n\n不想自己想數字，就按下方「幫我抽三張牌」。',
      [qr('🃏 幫我抽三張牌', 'action=iching_draw&cat=' + cat, '幫我抽三張牌'), qr('換類別', 'action=iching', '易經卜卦')]
    )]);
  }
  if (action === 'iching_draw') {
    const cat = p.get('cat');
    if (!CAT_NAME[cat]) return handleAction(env, userId, replyToken, 'iching');
    await env.FORTUNE_KV.delete(ICHING(userId));
    const cards = drawCards();
    return reply(env, replyToken, [ichingFlex(cast(cards.map(c => c.digit), cat), cards)]);
  }
  if (action === 'today') {
    const user = await loadUser(env, userId);
    if (!user) return reply(env, replyToken, [setupFlex(env, '先設定你的生辰', '輸入一次出生年月日與時辰，之後每天點「今日運勢」就能看到依你命盤算出的運勢。')]);
    return reply(env, replyToken, [await buildToday(env, user, taipeiDate())]);
  }
  if (action === 'chart') {
    const user = await loadUser(env, userId);
    if (!user) return reply(env, replyToken, [setupFlex(env, '還沒有你的命盤', '先輸入生辰，我就能幫你排出紫微命盤。')]);
    return reply(env, replyToken, [text(fullSummary(user), [qrUri('修改生日', liffUrl(env)), qr('今日運勢', 'action=today')])]);
  }
  if (action === 'privacy') {
    return reply(env, replyToken, [text(
      '我們只存放排盤需要的出生資料與命盤，不存姓名，也不會提供給第三方。\n隱私政策：' + (env.PRIVACY_URL || '') + '\n\n想移除資料，可以按下方「刪除我的資料」。',
      [qr('刪除我的資料', 'action=delete_ask'), qrUri('修改生日', liffUrl(env))]
    )]);
  }
  if (action === 'delete_ask') return reply(env, replyToken, [confirmDelete()]);
  if (action === 'delete_yes') {
    await env.FORTUNE_KV.delete(USER(userId));
    return reply(env, replyToken, [text('已刪除你的生辰與命盤資料。若想再使用，隨時可以重新輸入生辰。')]);
  }
  if (action === 'delete_no') return reply(env, replyToken, [text('好的，資料保留不變。')]);
  return reply(env, replyToken, [text('請從下方選單選擇想看的內容。', menuQuick(env))]);
}

const KEYWORDS = [
  [/易經|卜卦|占卜|問卦|起卦/, 'iching'],
  [/今日運勢|今天運勢|運勢/, 'today'],
  [/我的命盤|命盤|紫微/, 'chart'],
  [/刪除.*資料/, 'delete_ask'],
  [/隱私|個資/, 'privacy']
];

export async function handleEvent(env, ev) {
  if (ev.deliveryContext && ev.deliveryContext.isRedelivery) return; /* 重送事件的 reply token 已失效 */
  const userId = ev.source && ev.source.userId;
  if (!userId || ev.source.type !== 'user') return; /* 只服務一對一聊天 */

  if (ev.type === 'follow') {
    const user = await loadUser(env, userId);
    if (user) {
      user.blocked = false;
      await env.FORTUNE_KV.put(USER(userId), JSON.stringify(user));
      return reply(env, ev.replyToken, [text('歡迎回來！你的命盤還在，點「今日運勢」就能看今天的運勢。', menuQuick(env))]);
    }
    return reply(env, ev.replyToken, [setupFlex(env, '歡迎！每天一張你的專屬運勢', '輸入一次生辰，系統會排出你的紫微命盤，再依每天的流日四化寫出你的今日運勢、宜忌與幸運色。')]);
  }
  if (ev.type === 'unfollow') {
    const user = await loadUser(env, userId);
    if (user) { user.blocked = true; await env.FORTUNE_KV.put(USER(userId), JSON.stringify(user)); }
    return;
  }
  if (ev.type === 'postback') {
    const p = new URLSearchParams(ev.postback.data || '');
    return handleAction(env, userId, ev.replyToken, p.get('action'), p);
  }
  if (ev.type === 'message' && ev.message.type === 'text') {
    const t = ev.message.text.trim();
    if (looksLikeDigits(t)) return handleDigits(env, userId, ev.replyToken, t);
    if (/設定生日|修改生日|輸入生辰|生日/.test(t)) return reply(env, ev.replyToken, [setupFlex(env, '設定生辰', '點下方按鈕輸入或修改你的出生資料。')]);
    for (const [re, action] of KEYWORDS) if (re.test(t)) return handleAction(env, userId, ev.replyToken, action);
    return reply(env, ev.replyToken, [text('我是你的每日運勢小幫手，請從下方選擇：', menuQuick(env))]);
  }
}

/* 使用者打了數字：已選類別就直接起卦；還沒選就請他選類別（數字帶在按鈕裡，不必再打一次） */
async function handleDigits(env, userId, replyToken, t) {
  const digits = parseDigits(t);
  const cat = await env.FORTUNE_KV.get(ICHING(userId));
  if (!digits) {
    return reply(env, replyToken, [text('卜卦請打三個數字，例如 528，第一個數字不能是 0。', cat
      ? [qr('🃏 幫我抽三張牌', 'action=iching_draw&cat=' + cat, '幫我抽三張牌'), qr('換類別', 'action=iching', '易經卜卦')]
      : [qr('易經卜卦', 'action=iching')])]);
  }
  if (!cat) return reply(env, replyToken, [text('想用 ' + digits.join('') + ' 問哪一類的事？', ichingCatQuick(digits.join('')))]);
  await env.FORTUNE_KV.delete(ICHING(userId));
  return reply(env, replyToken, [ichingFlex(cast(digits, cat))]);
}

/* ---------- LIFF API ---------- */
async function apiProfile(env, body) {
  const userId = await verifyIdToken(env, body.idToken);
  if (body.consent !== true) throw new Error('需要同意隱私說明才能儲存');
  const birth = normalizeBirth(body.birth);
  let chart;
  try { chart = computeChart(birth); } catch (e) {
    throw new Error('日期無法排盤，請檢查後再試');
  }
  const prev = await loadUser(env, userId);
  const now = new Date().toISOString();
  const user = {
    v: ENGINE_VERSION, birth, chart,
    plan: prev ? prev.plan : 'free',
    blocked: false,
    consentAt: prev && prev.consentAt || now,
    createdAt: prev ? prev.createdAt : now,
    updatedAt: now
  };
  await env.FORTUNE_KV.put(USER(userId), JSON.stringify(user));
  return { ok: true, summary: fullSummary(user) };
}
async function apiMe(env, body) {
  const userId = await verifyIdToken(env, body.idToken);
  const user = await loadUser(env, userId);
  return { ok: true, birth: user ? user.birth : null };
}
async function apiDelete(env, body) {
  const userId = await verifyIdToken(env, body.idToken);
  await env.FORTUNE_KV.delete(USER(userId));
  return { ok: true };
}

/* ---------- 入口 ---------- */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === '/webhook' && req.method === 'POST') {
      const body = await req.text();
      const secret = String(env.LINE_CHANNEL_SECRET || '').trim();
      if (!(await verifySignature(secret, body, req.headers.get('x-line-signature')))) {
        let dest = '?';
        try { dest = JSON.parse(body).destination || '?'; } catch (e) {}
        console.warn('簽章驗證失敗：LINE_CHANNEL_SECRET 和送出訊息的官方帳號不符（請到該帳號的 Basic settings 複製 Channel secret 重新設定）'
          + '｜送出帳號 destination=' + dest + '｜目前 secret 長度 ' + secret.length + '（正確應為 32）');
        return new Response('bad signature', { status: 401 });
      }
      let events = [];
      try { events = JSON.parse(body).events || []; } catch (e) { return new Response('bad json', { status: 400 }); }
      /* 先回 200 給 LINE，事件在背景處理 */
      if (events.length) console.log('收到 ' + events.length + ' 個事件：' + events.map(e => e.type + (e.postback ? '(' + e.postback.data + ')' : e.message && e.message.type === 'text' ? '(' + e.message.text.slice(0, 20) + ')' : '')).join('、'));
      ctx.waitUntil(Promise.all(events.map(ev => handleEvent(env, ev).catch(e => console.error('event error', e && e.stack || e)))));
      return new Response('ok');
    }
    if (url.pathname.startsWith('/api/')) {
      const h = cors(env, req);
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
      if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405, h);
      let body;
      try { body = await req.json(); } catch (e) { return json({ ok: false, error: '格式錯誤' }, 400, h); }
      try {
        if (url.pathname === '/api/profile') return json(await apiProfile(env, body), 200, h);
        if (url.pathname === '/api/me') return json(await apiMe(env, body), 200, h);
        if (url.pathname === '/api/delete') return json(await apiDelete(env, body), 200, h);
        return json({ ok: false, error: 'not found' }, 404, h);
      } catch (e) {
        return json({ ok: false, error: e.message || String(e) }, 400, h);
      }
    }
    if (url.pathname === '/' && req.method === 'GET') return new Response('fortune bot ok');
    return new Response('not found', { status: 404 });
  }
};
