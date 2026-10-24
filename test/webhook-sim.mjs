// 模擬 LINE webhook 與 LIFF 呼叫，驗證整條流程（不需要真的 LINE 帳號）
// 用法：cd worker && node ../test/webhook-sim.mjs
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.js';
import { luckyCats } from '../worker/src/line.js';

const SECRET = 'test-secret';
const kv = new Map();
const env = {
  LINE_CHANNEL_SECRET: SECRET,
  LINE_CHANNEL_ACCESS_TOKEN: 'tok',
  LINE_LOGIN_CHANNEL_ID: '2000000000',
  LIFF_ID: '2000000000-abc',
  PRIVACY_URL: 'https://example.github.io/privacy.html',
  FORTUNE_KV: {
    get: async k => (kv.has(k) ? kv.get(k) : null),
    put: async (k, v) => { kv.set(k, v); },
    delete: async k => { kv.delete(k); }
  },
  ARCAR: {
    fetch: async (url, init) => {
      aiCalls++;
      const b = JSON.parse(init.body);
      if (b.system.includes('心靈小語')) {
        assert.ok(!/1985|U_test_user/.test(b.messages[0].content), '心靈小語不可帶生日或 userId');
        return new Response(JSON.stringify({ content: [{ type: 'text', text: '「想法多是好事，今天挑一個最想做的，先完成它。」' }] }), { status: 200 });
      }
      assert.ok(b.system && b.messages[0].content.includes('流日干支'));
      return new Response(JSON.stringify({ content: [{ type: 'text', text: '今天流日走到交友宮，紫微天相坐守，人際上容易遇到願意幫忙的人；化忌入官祿，工作細節多核對一次，下午把待辦清單收尾。' }] }), { status: 200 });
    }
  }
};
let aiCalls = 0;
const replies = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('/oauth2/v2.1/verify')) {
    const p = new URLSearchParams(init.body);
    return p.get('id_token') === 'good-token'
      ? new Response(JSON.stringify({ sub: 'U_test_user' }), { status: 200 })
      : new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  }
  if (String(url).includes('/message/reply')) {
    replies.push(JSON.parse(init.body));
    return new Response('{}', { status: 200 });
  }
  throw new Error('unexpected fetch ' + url);
};

const pending = [];
const ctx = { waitUntil: p => pending.push(p) };
async function flush() { while (pending.length) await pending.shift(); }

async function webhook(events, { badSig } = {}) {
  const body = JSON.stringify({ destination: 'x', events });
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64');
  const res = await worker.fetch(new Request('https://w/webhook', { method: 'POST', headers: { 'x-line-signature': badSig ? 'nope' : sig }, body }), env, ctx);
  await flush();
  return res;
}
const ev = (type, extra) => Object.assign({ type, replyToken: 'rt-' + Math.random(), source: { type: 'user', userId: 'U_test_user' }, deliveryContext: { isRedelivery: false } }, extra);
const lastReply = () => replies.at(-1).messages;

async function api(path, body) {
  const r = await worker.fetch(new Request('https://w' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://kftseng2oo1.github.io' }, body: JSON.stringify(body) }), env, ctx);
  return { status: r.status, j: await r.json(), cors: r.headers.get('Access-Control-Allow-Origin') };
}

// 1. 簽章錯誤要擋
assert.equal((await webhook([ev('follow')], { badSig: true })).status, 401);
assert.equal(replies.length, 0);

// 2. 新用戶加好友 → 引導輸入生辰
await webhook([ev('follow')]);
assert.equal(lastReply()[0].type, 'flex');
assert.match(JSON.stringify(lastReply()), /liff\.line\.me\/2000000000-abc/);

// 3. 沒有生辰就點今日運勢 → 引導設定
await webhook([ev('postback', { postback: { data: 'action=today' } })]);
assert.match(lastReply()[0].altText, /先設定/);

// 4. LIFF：未同意隱私、假 token、錯誤日期都要擋
const birth = { cal: 'solar', y: 1985, m: 6, d: 15, hour: 6, gender: 'M', blood: 'O' };
assert.equal((await api('/api/profile', { idToken: 'good-token', consent: false, birth })).status, 400);
assert.equal((await api('/api/profile', { idToken: 'bad', consent: true, birth })).status, 400);
assert.equal((await api('/api/profile', { idToken: 'good-token', consent: true, birth: { ...birth, m: 2, d: 30 } })).j.error, '日期不存在');

assert.match((await api('/api/profile', { idToken: 'good-token', consent: true, birth: { cal: 'lunar', y: 2026, m: 2, d: 30, hour: 6, gender: 'F' } })).j.error, /只有 29 天/);
assert.match((await api('/api/profile', { idToken: 'good-token', consent: true, birth: { cal: 'lunar', leap: true, y: 2026, m: 3, d: 5, hour: 6, gender: 'F' } })).j.error, /沒有閏三月/);

// 5. 正常存檔
const saved = await api('/api/profile', { idToken: 'good-token', consent: true, birth });
assert.equal(saved.status, 200);
assert.equal(saved.cors, 'https://kftseng2oo1.github.io');
assert.match(saved.j.summary, /你的紫微命盤/);
assert.match(saved.j.summary, /命宮在/);
const stored = JSON.parse(kv.get('user:U_test_user'));
assert.equal(stored.plan, 'free');
assert.equal(stored.chart.engine, 'z1');
assert.equal(stored.chart.palaces.length, 12);
assert.ok(!('name' in stored.birth));
console.log(saved.j.summary);

// 6. /api/me 讀回生辰
assert.equal((await api('/api/me', { idToken: 'good-token' })).j.birth.y, 1985);

// 7. 今日運勢：第一次叫 AI，第二次用快取
await webhook([ev('postback', { postback: { data: 'action=today' } })]);
const card = lastReply()[0];
assert.equal(card.type, 'flex');
assert.match(JSON.stringify(card), /今日運勢/);
assert.match(JSON.stringify(card), /流日命宮在你的/);
assert.match(JSON.stringify(card), /四化/);
assert.equal(card.contents.type, 'carousel');
assert.equal(card.contents.contents.length, 2);
const astroCard = JSON.stringify(card.contents.contents[1]);
assert.match(astroCard, /西洋星座參考/);
assert.match(astroCard, /雙子座・O 型/);
assert.match(astroCard, /今日心靈小語/);
assert.match(astroCard, /想法多是好事，今天挑一個最想做的，先完成它。/);
assert.ok(!/綜合/.test(astroCard), '星座卡不顯示總分');
assert.equal(aiCalls, 2, '紫微短評＋心靈小語各一次');
await webhook([ev('message', { message: { type: 'text', text: '今天運勢如何' } })]);
assert.equal(aiCalls, 2, '同盤型、同星座同一天應命中快取');
console.log('altText:', card.altText);

// 8. 我的命盤、隱私、刪除確認流程
await webhook([ev('postback', { postback: { data: 'action=chart' } })]);
assert.match(lastReply()[0].text, /生年四化/);
assert.match(lastReply()[0].text, /西洋星座：♊ 雙子座・O 型/);
await webhook([ev('postback', { postback: { data: 'action=privacy' } })]);
assert.match(lastReply()[0].text, /privacy\.html/);
await webhook([ev('message', { message: { type: 'text', text: '刪除我的資料' } })]);
assert.equal(lastReply()[0].type, 'template');
await webhook([ev('postback', { postback: { data: 'action=delete_yes' } })]);
assert.ok(!kv.has('user:U_test_user'));

// 9. 重送事件與群組事件不回覆
const n = replies.length;
await webhook([ev('postback', { postback: { data: 'action=today' }, deliveryContext: { isRedelivery: true } })]);
await webhook([ev('message', { message: { type: 'text', text: '運勢' }, source: { type: 'group', groupId: 'G', userId: 'U_test_user' } })]);
assert.equal(replies.length, n);

// 10. AI 失敗時用備用短評，不快取
await api('/api/profile', { idToken: 'good-token', consent: true, birth: { ...birth, y: 1990, m: 3, d: 25, blood: '' } });
env.ARCAR.fetch = async () => new Response('{"error":{"message":"down"}}', { status: 500 });
await webhook([ev('postback', { postback: { data: 'action=today' } })]);
assert.match(JSON.stringify(lastReply()[0]), /流日命宮走到你的/);
assert.match(JSON.stringify(lastReply()[0].contents.contents[1]), /牡羊座"/, '不知道血型時標題不顯示血型');
assert.match(JSON.stringify(lastReply()[0].contents.contents[1]), /今日心靈小語/, 'AI 失敗改用 Astro 句庫');

// 11. LIFF 刪除
assert.equal((await api('/api/delete', { idToken: 'good-token' })).j.ok, true);
assert.ok(!kv.has('user:U_test_user'));

// 12. 星座加分：只標 5 顆星、最多兩項、依原順序
const mk = sts => ({ cats: sts.map((st, i) => ({ n: ['愛情', '事業', '財運', '健康'][i], st, v: st * 19 + i })) });
assert.deepEqual(luckyCats(mk([5, 5, 4, 4])).map(c => c.n), ['愛情', '事業']);
assert.deepEqual(luckyCats(mk([5, 5, 5, 3])).map(c => c.n), ['事業', '財運']);
assert.deepEqual(luckyCats(mk([4, 4, 4, 4])), []);
assert.deepEqual(luckyCats(null), []);

// 13. 易經卜卦：選類別 → 打數字；抽牌；先打數字再選類別；不需要生辰、不呼叫 AI
const ai0 = aiCalls, kv0 = kv.size;
await webhook([ev('message', { message: { type: 'text', text: '我想卜卦' } })]);
assert.equal(lastReply()[0].quickReply.items.length, 8);
await webhook([ev('postback', { postback: { data: 'action=iching_cat&cat=love' } })]);
assert.equal(kv.get('iching:U_test_user'), 'love');
await webhook([ev('message', { message: { type: 'text', text: '102' } })]);
let ic = JSON.stringify(lastReply()[0]);
assert.match(ic, /天澤履/); assert.match(ic, /問愛情/); assert.match(ic, /乾為天/); assert.match(ic, /數字 1・0・2/);
assert.ok(!kv.has('iching:U_test_user'), '起卦後清掉待輸入狀態');
await webhook([ev('message', { message: { type: 'text', text: '528' } })]);
assert.match(lastReply()[0].text, /想用 528 問哪一類/);
await webhook([ev('postback', { postback: { data: lastReply()[0].quickReply.items[2].action.data } })]);
assert.match(lastReply()[0].altText, /易經卜卦・財運/);
await webhook([ev('postback', { postback: { data: 'action=iching_draw&cat=career' } })]);
assert.match(JSON.stringify(lastReply()[0]), /抽牌 [♠♥♦♣]/);
await webhook([ev('postback', { postback: { data: 'action=iching_cat&cat=health' } })]);
await webhook([ev('message', { message: { type: 'text', text: '028' } })]);
assert.match(lastReply()[0].text, /第一個數字不能是 0/);
assert.equal(aiCalls, ai0, '卜卦不呼叫 AI');
assert.ok(!kv.has('user:U_test_user'));
kv.delete('iching:U_test_user'); assert.equal(kv.size, kv0);

console.log('webhook simulation: all 13 checks passed');
