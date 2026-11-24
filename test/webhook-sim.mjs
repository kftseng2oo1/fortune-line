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
const lampCalls = [], ragCalls = [], loadings = [];
env.TWINKLE = {
  fetch: async (url, init) => {
    ragCalls.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ matches: [{ source: '法句經', chapter: '雙品', text: '諸法意先導，意主意造作。', tradition: 'theravada' }] }), { status: 200 });
  }
};
const replies = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('/oauth2/v2.1/verify')) {
    const p = new URLSearchParams(init.body);
    return p.get('id_token') === 'good-token'
      ? new Response(JSON.stringify({ sub: 'U_test_user' }), { status: 200 })
      : new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  }
  if (String(url).includes('/chat/loading/start')) { loadings.push(JSON.parse(init.body)); return new Response('{}', { status: 202 }); }
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
assert.match(saved.j.persona.headline, /・/); assert.match(saved.j.persona.radar, /\/radar\/.+\.png$/);
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
assert.equal(card.contents.contents.length, 3);
const tarotCard = JSON.stringify(card.contents.contents[2]);
assert.match(tarotCard, /今日塔羅/); assert.match(tarotCard, /[正逆]位/);
assert.match(tarotCard, /tarot-cards\/\d\dr?\.jpg/, '今日塔羅附牌面圖');
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
const pc = lastReply()[0];
assert.equal(pc.type, 'flex'); assert.equal(pc.contents.contents.length, 2);
const pcs = JSON.stringify(pc);
assert.match(pcs, /紫微人格特質/); assert.match(pcs, /格局基調/); assert.match(pcs, /優勢/); assert.match(pcs, /盲點/);
assert.match(pcs, /生年四化/); assert.match(pcs, /♊ 雙子座・O 型/); assert.match(pcs, /三層人格/);
const radar = pc.contents.contents[0].hero.url;
assert.match(radar, /^https:\/\/.+\/radar\/\d+-\d+-\d+-\d+-\d+-\d+\.png$/);
// 雷達圖：第一次畫好存 KV，第二次直接取；網址不合法回 404
const rp = new URL(radar).pathname;
const img = await worker.fetch(new Request('https://w' + rp), env, ctx);
assert.equal(img.headers.get('Content-Type'), 'image/png');
const bytes = new Uint8Array(await img.arrayBuffer());
assert.deepEqual([...bytes.slice(0, 4)], [137, 80, 78, 71]);
assert.ok(kv.has('radar:v1:' + rp.slice(7, -4)));
assert.equal((await worker.fetch(new Request('https://w/radar/1-2-3.png'), env, ctx)).status, 404);
assert.equal((await worker.fetch(new Request('https://w/radar/1-2-3-4-5-500.png'), env, ctx)).status, 404);
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

// 14. 問事占卜 → 塔羅聖三角；今日塔羅同一天固定
await webhook([ev('message', { message: { type: 'text', text: '占卜' } })]);
assert.deepEqual(lastReply()[0].quickReply.items.map(i => i.action.data), ['action=iching', 'action=tarot', 'action=lamp']);
await webhook([ev('message', { message: { type: 'text', text: '我想抽塔羅' } })]);
assert.equal(lastReply()[0].quickReply.items.length, 5);
await webhook([ev('postback', { postback: { data: 'action=tarot_cat&cat=love' } })]);
assert.equal(lastReply()[0].quickReply.items[0].action.data, 'action=tarot_draw&cat=love');
await webhook([ev('postback', { postback: { data: 'action=tarot_draw&cat=love' } })]);
const tri = lastReply()[0];
assert.match(tri.altText, /塔羅聖三角・感情/);
const triS = JSON.stringify(tri);
assert.match(triS, /過去/); assert.match(triS, /現在/); assert.match(triS, /未來/); assert.match(triS, /整體提示/);
assert.match(triS, /感情可能的走向/, '使用 App 的感情牌位導讀');
assert.equal((triS.match(/tarot-cards\/\d\dr?\.jpg/g) || []).length, 3, '三張牌面圖');
await webhook([ev('postback', { postback: { data: 'action=tarot_draw&cat=bogus' } })]);
assert.equal(lastReply()[0].quickReply.items.length, 5, '不明類別回到選類別');
assert.equal(aiCalls, ai0, '塔羅不呼叫 AI');


// 15. 🪔 阿拉燈：進入對話模式 → 提問 → 換導師 → 危機訊號 → 次數上限 → 點其他功能離開
const say = t => webhook([ev('message', { message: { type: 'text', text: t } })]);
const kv1 = kv.size, ai1 = aiCalls;
env.ARCAR.fetch = async (url, init) => {
  aiCalls++;
  const b = JSON.parse(init.body);
  assert.match(b.system, /阿拉燈/);
  lampCalls.push(b);
  if (b.messages.at(-1).content.includes('故障')) return new Response('{"error":"boom"}', { status: 500 });
  if (b.messages.at(-1).content.includes('截斷')) return new Response(JSON.stringify({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '據《金剛經》：「凡所有相，皆是虛妄；若見諸相非相，即見如來。」這裡的相，是我們心裡替人事貼上的標籤。經文提醒我們，這' }] }), { status: 200 });
  return new Response(JSON.stringify({ content: [{ type: 'text', text: '## 開示\n**煩惱**來時，先覺察呼吸。\n- 據《法句經》，心是一切的前導。\n\n（此為依法理解，請以原典與真實師父指導為準 🙏）' }] }), { status: 200 });
};
await webhook([ev('postback', { postback: { data: 'action=lamp' } })]);
assert.match(lastReply()[0].text, /阿拉燈・佛法心靈導師/);
assert.equal(lastReply()[0].quickReply.items.length, 8, '7 位導師＋結束對話');
assert.equal(JSON.parse(kv.get('lamp:U_test_user')).m, 'general');
await say('528');   /* 對話中打數字也是提問，不會被當成卜卦 */
assert.equal(lampCalls.length, 1);
assert.equal(loadings.at(-1).chatId, 'U_test_user', '先顯示輸入中動畫');
let lr = lastReply()[0].text;
assert.ok(!/##|\*\*/.test(lr), 'LINE 不顯示 Markdown，要去掉');
assert.match(lr, /・據《法句經》/);
assert.match(lampCalls[0].system, /智慧庫/); assert.match(lampCalls[0].system, /諸法意先導/);
assert.equal(ragCalls.at(-1).query, '528');
await say('最近工作壓力很大，晚上睡不著');
assert.equal(lampCalls[1].messages.length, 3, '帶上一輪對話');
assert.ok(!JSON.stringify(lampCalls[1]).includes('1985') && !JSON.stringify(lampCalls[1]).includes('U_test_user'), '不送生日或 userId');
await webhook([ev('postback', { postback: { data: 'action=lamp_master&m=zen' } })]);
assert.match(lastReply()[0].text, /禪師在此/);
await say('什麼是放下');
assert.match(lampCalls.at(-1).system, /禪宗宗師/);
assert.equal(lampCalls.at(-1).messages.length, 1, '換導師後重新開始');
await say('我覺得活著好累，不想活了');
assert.match(lastReply()[0].text, /1925/); assert.match(lastReply()[0].text, /1995/);
assert.match(lampCalls.at(-1).system, /自傷或輕生訊號/);
assert.equal(ragCalls.at(-1).query, '什麼是放下', '危機訊號不做典籍檢索');
await say('截斷測試');
assert.match(lastReply()[0].text, /貼上的標籤。$/, '被截斷時退回最後一個完整句子');
assert.ok(!/提醒我們，這/.test(lastReply()[0].text));
await say('系統故障測試');
assert.match(lastReply()[0].text, /沒有回應/);
const day = Object.keys(Object.fromEntries(kv)).find(k => k.startsWith('lampn:'));
assert.equal(kv.get(day), '4', '危機與失敗不算次數');
kv.set(day, '10');
await say('還想再問');
assert.match(lastReply()[0].text, /今天已經請教阿拉燈 10 次/);
const nLamp = lampCalls.length;
await say('我想自殺');
assert.equal(lampCalls.length, nLamp + 1, '危機訊號不受次數限制');
assert.match(lastReply()[0].text, /安心專線 1925/);
await say('結束');
assert.match(lastReply()[0].text, /感恩這段對話/);
assert.ok(!kv.has('lamp:U_test_user'));
await say('阿拉燈');
assert.ok(kv.has('lamp:U_test_user'), '關鍵字進入');
await webhook([ev('postback', { postback: { data: 'action=divine' } })]);
assert.ok(!kv.has('lamp:U_test_user'), '點其他功能就離開對話');
await say('528');
assert.match(lastReply()[0].text, /想用 528 問哪一類/, '離開後數字恢復卜卦');
assert.equal(aiCalls - ai1, lampCalls.length, '只有阿拉燈呼叫 AI');
kv.delete(day); assert.equal(kv.size, kv1);

console.log('webhook simulation: all 15 checks passed');
