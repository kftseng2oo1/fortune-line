// 測試 AI 回覆的整理：心靈小語挑句、解讀截斷、空白回應的錯誤訊息
// 用法：cd worker && node ../test/ai-parse.mjs
import assert from 'node:assert/strict';
import { pickQuote, cleanReading, getReading } from '../worker/src/ai.js';

// 心靈小語：各種 AI 常見的多餘輸出
assert.equal(pickQuote('想法多是好事，今天挑一個最想做的，先完成它。'), '想法多是好事，今天挑一個最想做的，先完成它。');
assert.equal(pickQuote('「想法多是好事，今天挑一個最想做的，先完成它。」'), '想法多是好事，今天挑一個最想做的，先完成它。');
assert.equal(pickQuote('好的，以下是今天的心靈小語：\n\n「慢慢來沒關係，今天把一件小事做好就很棒。」\n\n這句話鼓勵讀者放慢腳步。'), '慢慢來沒關係，今天把一件小事做好就很棒。');
assert.equal(pickQuote('**今日心靈小語**\n1. 把心放寬，今天的路就會走得比較輕鬆。'), '把心放寬，今天的路就會走得比較輕鬆。');
assert.equal(pickQuote('把心放寬，今天的路就會走得比較輕鬆。這句話適合需要放下壓力的人，因為火象星座常常給自己太多期待，所以提醒他們休息。'), '把心放寬，今天的路就會走得比較輕鬆。');
assert.equal(pickQuote(''), null);
assert.equal(pickQuote('Here is your quote.'), null);

// 解讀：去 Markdown、合併段落、過長截斷
assert.equal(cleanReading('**今天**流日走到交友宮。\n\n人際順利。'), '今天流日走到交友宮。人際順利。');
const long = '今天流日走到交友宮，人際上容易遇到願意幫忙的人。'.repeat(8);
const c = cleanReading(long);
assert.ok(c.length <= 160 && c.endsWith('。'), c);

// 空白回應（只有 thinking）：錯誤訊息要帶出 stop_reason 與內容種類，並改用備用句
const kv = new Map();
const env = {
  FORTUNE_KV: { get: async k => kv.get(k) ?? null, put: async (k, v) => kv.set(k, v) },
  ARCAR: { fetch: async () => new Response(JSON.stringify({ model: 'm', stop_reason: 'max_tokens', content: [{ type: 'thinking', thinking: '...' }], usage: { output_tokens: 300 } }), { status: 200 }) }
};
const errs = [];
const orig = console.error; console.error = (...a) => errs.push(a.join(' '));
const r = await getReading(env, '2026-10-22', { dayGz: '己巳', dayMing: '子女宮', dayMingStars: '紫微七殺', hasSha: false, lu: 'x', ji: 'y', stars: 3 });
console.error = orig;
assert.equal(r.fallback, true);
assert.match(errs.join('\n'), /stop_reason=max_tokens/);
assert.match(errs.join('\n'), /內容種類=thinking/);
assert.equal(kv.size, 0, '備用句不寫入快取');

console.log('AI 回覆整理：all checks passed');
