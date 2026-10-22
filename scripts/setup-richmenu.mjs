// 建立圖文選單、上傳圖片、設為所有用戶的預設選單
// 用法（Node 18+）：在 scripts 資料夾執行  node setup-richmenu.mjs
// 會詢問 Channel access token（每日命盤運勢 → Messaging API 分頁最下方）
// 也可以先設環境變數 LINE_CHANNEL_ACCESS_TOKEN、LIFF_ID 跳過詢問
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

async function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = await rl.question(q);
  rl.close();
  return a.trim();
}
let TOKEN = (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
if (!TOKEN) TOKEN = await ask('貼上 Channel access token 後按 Enter：');
const LIFF_ID = (process.env.LIFF_ID || '2012141348-mz11FXRB').trim();
if (!/^[A-Za-z0-9+/=._-]{100,}$/.test(TOKEN)) {
  console.error('這不像 access token：它應該是一長串英數字（約 170 字元），不含中文或空白。');
  console.error('請到 LINE Developers → 每日命盤運勢 → Messaging API 分頁最下方複製 Channel access token (long-lived)。');
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const auth = { Authorization: 'Bearer ' + TOKEN };
const W = 2500, H = 843, CW = W / 4;
const area = (i, action) => ({ bounds: { x: Math.round(i * CW), y: 0, width: Math.round(CW), height: H }, action });

const menu = {
  size: { width: W, height: H },
  selected: true,
  name: 'fortune-main-v1',
  chatBarText: '運勢選單',
  areas: [
    area(0, { type: 'postback', data: 'action=today', displayText: '今日運勢' }),
    area(1, { type: 'postback', data: 'action=chart', displayText: '我的命盤' }),
    area(2, { type: 'uri', uri: 'https://liff.line.me/' + LIFF_ID }),
    area(3, { type: 'postback', data: 'action=privacy', displayText: '資料與隱私' })
  ]
};

async function call(url, init) {
  const r = await fetch(url, init);
  const t = await r.text();
  if (!r.ok) throw new Error(url + ' → ' + r.status + ' ' + t);
  return t ? JSON.parse(t) : {};
}

const { richMenuId } = await call('https://api.line.me/v2/bot/richmenu', {
  method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(menu)
});
console.log('建立選單', richMenuId);

await call(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
  method: 'POST', headers: { ...auth, 'Content-Type': 'image/png' }, body: fs.readFileSync(path.join(here, 'richmenu.png'))
});
console.log('已上傳圖片');

await call(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, { method: 'POST', headers: auth });
console.log('已設為預設選單');

// 清掉舊版本的選單，避免越積越多
const { richmenus = [] } = await call('https://api.line.me/v2/bot/richmenu/list', { headers: auth });
for (const m of richmenus) {
  if (m.richMenuId !== richMenuId && m.name && m.name.startsWith('fortune-main')) {
    await call(`https://api.line.me/v2/bot/richmenu/${m.richMenuId}`, { method: 'DELETE', headers: auth });
    console.log('刪除舊選單', m.richMenuId);
  }
}
console.log('完成');
