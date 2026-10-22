/* LINE Messaging API：簽章驗證、回覆、Flex 卡片 */
const API = 'https://api.line.me/v2/bot';

function b64(buf) {
  let s = '';
  const a = new Uint8Array(buf);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
}

/* x-line-signature = base64(HMAC-SHA256(channelSecret, body)) */
export async function verifySignature(secret, body, signature) {
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = b64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  if (mac.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

/* Reply API 不計入訊息則數；免費版只用這個 */
export async function reply(env, replyToken, messages) {
  const r = await fetch(API + '/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + String(env.LINE_CHANNEL_ACCESS_TOKEN || '').trim() },
    body: JSON.stringify({ replyToken, messages: messages.slice(0, 5) })
  });
  if (!r.ok) console.error('reply failed', r.status, await r.text());
  else console.log('已回覆 ' + messages.length + ' 則訊息');
  return r.ok;
}

export const liffUrl = env => 'https://liff.line.me/' + env.LIFF_ID;

/* 長輩友善：Flex 卡片無法用手指縮放（LINE 的限制），所以
 * 1. 卡片用最寬的 giga 尺寸
 * 2. 所有字級往上調一級
 * 3. 開啟 scaling：文字會跟著 LINE「設定 → 聊天 → 字型大小」一起放大 */
const SIZE_UP = { xxs: 'xs', xs: 'sm', sm: 'md', md: 'lg', lg: 'xl', xl: 'xxl', xxl: '3xl' };
export function largePrint(node) {
  if (Array.isArray(node)) { node.forEach(largePrint); return node; }
  if (!node || typeof node !== 'object') return node;
  if (node.type === 'bubble') node.size = 'giga';
  if (node.type === 'text' || node.type === 'button') {
    node.scaling = true;
    if (node.type === 'text') node.size = SIZE_UP[node.size || 'md'] || node.size;
  }
  for (const k of ['contents', 'header', 'body', 'footer', 'hero']) if (node[k]) largePrint(node[k]);
  return node;
}

export function text(t, quick) {
  const m = { type: 'text', text: t };
  if (quick) m.quickReply = { items: quick };
  return m;
}
export const qr = (label, data, displayText) => ({ type: 'action', action: { type: 'postback', label, data, displayText: displayText || label } });
export const qrUri = (label, uri) => ({ type: 'action', action: { type: 'uri', label, uri } });

export function menuQuick(env) {
  return [qr('今日運勢', 'action=today'), qr('我的命盤', 'action=chart'), qrUri('設定生日', liffUrl(env)), qr('資料與隱私', 'action=privacy')];
}

const STAR_COLOR = { 5: '#C0392B', 4: '#D35400', 3: '#8E7A3E', 2: '#5D6D7E', 1: '#4A5568' };
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function row(label, value) {
  return {
    type: 'box', layout: 'baseline', spacing: 'md', contents: [
      { type: 'text', text: label, size: 'sm', color: '#8C8C8C', flex: 2 },
      { type: 'text', text: value || '—', size: 'sm', color: '#333333', flex: 7, wrap: true }
    ]
  };
}

/* 今日運勢卡片 */
export function fortuneFlex(env, { daily, features, reading, colors, hua, astro, quote }) {
  const huaOne = k => k + ' ' + hua[k].star + (hua[k].palace ? '→' + hua[k].palace.replace('宮', '') : '');
  const huaText = huaOne('祿') + '　' + huaOne('權') + '\n' + huaOne('科') + '　' + huaOne('忌');   /* 固定兩行，字放大後不會斷在中間 */
  const [y, m, d] = daily.date.split('-').map(Number);
  const wd = WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const s = features.stars;
  const starText = '★'.repeat(s) + '☆'.repeat(5 - s);
  const ziweiBubble = {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#FBF6EC', paddingAll: '16px', contents: [
          { type: 'text', text: '紫微斗數', size: 'xxs', color: '#8E6B2F', weight: 'bold' },
          { type: 'text', text: m + '/' + d + '（' + wd + '）今日運勢', weight: 'bold', size: 'lg', color: '#3A2E1F' },
          { type: 'text', text: '流日 ' + daily.dayGz + '・農曆' + daily.lunar, size: 'xs', color: '#8C7B5E', margin: 'sm' },
          { type: 'text', text: '流日命宮在你的' + features.dayMing + '（' + features.dayMingStars + '）', size: 'xs', color: '#8C7B5E', wrap: true }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', paddingAll: '16px', contents: [
          { type: 'text', text: starText, size: 'xl', color: STAR_COLOR[s] },
          { type: 'text', text: reading, wrap: true, size: 'md', color: '#333333', lineSpacing: '6px' },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box', layout: 'vertical', spacing: 'sm', margin: 'lg', contents: [
              row('四化', huaText),
              ...(luckyCats(astro).length ? [{
                type: 'box', layout: 'baseline', spacing: 'md', contents: [
                  { type: 'text', text: '星座加分', size: 'sm', color: '#4A6FA5', weight: 'bold', flex: 2 },
                  { type: 'text', text: '今日幸運：' + luckyCats(astro).map(c => c.n).join('、'), size: 'sm', color: '#4A6FA5', weight: 'bold', flex: 7, wrap: true }
                ]
              }] : []),
              row('宜', daily.yi.join('、')),
              row('忌', daily.ji.join('、')),
              row('幸運色', colors.join('、')),
              row('喜神', daily.xiPos)
            ]
          },
          { type: 'text', text: '僅供參考，重要決定請依實際情況判斷', size: 'xxs', color: '#AAAAAA', margin: 'lg' }
        ]
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
          { type: 'button', style: 'secondary', height: 'sm', action: { type: 'postback', label: '我的命盤', data: 'action=chart', displayText: '我的命盤' } },
          { type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: '完整排盤', uri: env.ZIWEI_APP_URL || 'https://kftseng2oo1.github.io/z1/' } }
        ]
      }
  };
  const altText = m + '/' + d + ' 今日運勢 ' + starText + '：' + reading.slice(0, 40);
  if (!astro) return { type: 'flex', altText, contents: largePrint(ziweiBubble) };
  return { type: 'flex', altText, contents: largePrint({ type: 'carousel', contents: [ziweiBubble, astroBubble(env, astro, quote)] }) };
}

/* 星座 4 顆星以上的分項 = 今日幸運面向，用來替紫微「加分」，而不是互相矛盾 */
export function luckyCats(astro) {
  if (!astro) return [];
  /* 只標 5 顆星、最多兩項：約三分之一的日子會出現，保持「幸運」的稀有感 */
  return astro.cats.filter(c => c.st >= 5).slice().sort((x, y) => y.v - x.v).slice(0, 2)
    .sort((x, y) => astro.cats.indexOf(x) - astro.cats.indexOf(y));
}

/* 第二張：西洋星座參考（沿用 Astro 算法，只給分項、不給總分，讓紫微當主角）＋心靈小語 */
function astroBubble(env, a, quote) {
  const lucky = luckyCats(a);
  const catRow = c => ({
    type: 'box', layout: 'vertical', spacing: 'xs', contents: [
      {
        type: 'box', layout: 'baseline', contents: [
          { type: 'text', text: c.n, size: 'sm', weight: 'bold', color: '#3A2E1F', flex: 0 },
          ...(lucky.indexOf(c) >= 0 ? [{ type: 'text', text: '今日幸運', size: 'xxs', color: '#4A6FA5', weight: 'bold', flex: 0, margin: 'md' }] : []),
          { type: 'text', text: '★'.repeat(c.st) + '☆'.repeat(5 - c.st), size: 'sm', color: '#8E6B2F', align: 'end' }
        ]
      },
      { type: 'text', text: c.t, size: 'xs', color: '#555555', wrap: true }
    ]
  });
  return {
    type: 'bubble',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: '#EEF2F8', paddingAll: '16px', contents: [
        { type: 'text', text: '西洋星座參考', size: 'xxs', color: '#4A6FA5', weight: 'bold' },
        { type: 'text', text: a.sign.g + ' ' + a.sign.n + (a.blood ? '・' + a.blood + ' 型' : ''), weight: 'bold', size: 'lg', color: '#2A3550' },
        { type: 'text', text: a.moon, size: 'xs', color: '#5D6D7E', wrap: true, margin: 'sm' }
      ]
    },
    body: {
      type: 'box', layout: 'vertical', spacing: 'md', paddingAll: '16px', contents: [
        ...a.cats.map(catRow),
        ...(a.bloodTip ? [{ type: 'text', text: a.bloodTip, size: 'xs', color: '#4A6FA5', wrap: true }] : []),
        { type: 'separator', margin: 'lg' },
        {
          type: 'box', layout: 'vertical', margin: 'lg', paddingAll: '12px', backgroundColor: '#FBF6EC', cornerRadius: '10px', contents: [
            { type: 'text', text: '今日心靈小語', size: 'xxs', color: '#8E6B2F', weight: 'bold' },
            { type: 'text', text: quote, size: 'md', color: '#3A2E1F', wrap: true, margin: 'sm', lineSpacing: '6px' }
          ]
        }
      ]
    },
    footer: {
      type: 'box', layout: 'horizontal', contents: [
        { type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: '星座完整運勢', uri: env.ASTRO_APP_URL || 'https://kftseng2oo1.github.io/astro/' } }
      ]
    }
  };
}

export function setupFlex(env, title, body) {
  return {
    type: 'flex',
    altText: title,
    contents: largePrint({
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', paddingAll: '20px', contents: [
          { type: 'text', text: title, weight: 'bold', size: 'lg', wrap: true },
          { type: 'text', text: body, size: 'sm', color: '#555555', wrap: true }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical', contents: [
          { type: 'button', style: 'primary', color: '#8E6B2F', action: { type: 'uri', label: '輸入生辰', uri: liffUrl(env) } }
        ]
      }
    })
  };
}

export function confirmDelete() {
  return {
    type: 'template',
    altText: '確定要刪除你的生辰資料嗎？',
    template: {
      type: 'confirm',
      text: '確定要刪除你的生辰與命盤資料嗎？刪除後無法復原。',
      actions: [
        { type: 'postback', label: '確定刪除', data: 'action=delete_yes', displayText: '確定刪除' },
        { type: 'postback', label: '取消', data: 'action=delete_no', displayText: '取消' }
      ]
    }
  };
}
