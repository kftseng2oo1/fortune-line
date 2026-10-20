// 建立圖文選單、上傳圖片、設為所有用戶的預設選單
// 用法（Node 18+）：
//   LINE_CHANNEL_ACCESS_TOKEN=xxx LIFF_ID=2001234567-AbCdEfGh node setup-richmenu.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_ID = process.env.LIFF_ID;
if (!TOKEN || !LIFF_ID) {
  console.error('請設定環境變數 LINE_CHANNEL_ACCESS_TOKEN 與 LIFF_ID');
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
