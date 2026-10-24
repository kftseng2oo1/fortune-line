/* 六維人格雷達圖 → PNG（LINE 的 Flex 不能顯示 SVG，所以在 Worker 裡直接畫）
 * 版面與配色照搬 z1 的 psRadarSvg（viewBox 220×228），放大 4 倍輸出 880×912。
 * 不用任何套件：多邊形掃描線填色（4 條子掃描線反鋸齒）＋預先產生的字形點陣＋PNG 編碼。
 * 一張約 15 ms CPU；同一組分數只畫一次，結果存在 KV（index.js 的 /radar/ 路由）。 */
import { GLYPHS } from './radar-glyphs.js';

const DIMS = ['領導', '智謀', '穩定', '人緣', '感性', '行動'];
const SCALE = 4, W = 220 * SCALE, H = 228 * SCALE;
const SS = 4;   /* 每個像素的子掃描線數 */

function glyphAlpha(gl) {
  if (!gl.bytes) { const bin = atob(gl.a); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); gl.bytes = u; }
  return gl.bytes;
}
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

function canvas() {
  const px = new Uint8Array(W * H * 3).fill(255);
  const cov = new Float32Array(W + 2), dlt = new Float32Array(W + 2);   /* 邊緣的部分覆蓋＋區間差分 */
  /* 填一個多邊形（偶奇規則），alpha 0–1 */
  function fill(pts, color, alpha = 1) {
    const [r, g, b] = hex(color);
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(H - 1, Math.ceil(y1));
    const n = pts.length, P = new Float64Array(n * 2), xs = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) { P[i * 2] = pts[i][0]; P[i * 2 + 1] = pts[i][1]; }
    for (let y = y0; y <= y1; y++) {
      let lo = W, hi = -1;
      for (let s = 0; s < SS; s++) {
        const sy = y + (s + 0.5) / SS;
        let m = 0;
        for (let i = 0; i < n; i++) {
          const j = i + 1 === n ? 0 : i + 1;
          const ax = P[i * 2], ay = P[i * 2 + 1], bx = P[j * 2], by = P[j * 2 + 1];
          if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) {
            const x = ax + (sy - ay) / (by - ay) * (bx - ax);
            let k = m++;
            while (k > 0 && xs[k - 1] > x) { xs[k] = xs[k - 1]; k--; }   /* 插入排序：通常只有 2 個交點 */
            xs[k] = x;
          }
        }
        const len = m;
        for (let k = 0; k + 1 < len; k += 2) {
          const a = Math.max(0, xs[k]), c = Math.min(W, xs[k + 1]);
          if (c <= a) continue;
          const ia = Math.floor(a), ic = Math.min(W - 1, Math.floor(c));
          if (ia < lo) lo = ia;
          if (ic > hi) hi = ic;
          if (ia === ic) { cov[ia] += (c - a) / SS; continue; }
          cov[ia] += (ia + 1 - a) / SS;
          dlt[ia + 1] += 1 / SS; dlt[ic] -= 1 / SS;
          cov[ic] += (c - ic) / SS;
        }
      }
      let run = 0;
      for (let ix = lo; ix <= hi; ix++) {
        run += dlt[ix]; dlt[ix] = 0;
        let t = cov[ix] + run; cov[ix] = 0;
        t = (t > 1 ? 1 : t) * alpha;
        if (t <= 0) continue;
        const o = (y * W + ix) * 3;
        px[o] += (r - px[o]) * t; px[o + 1] += (g - px[o + 1]) * t; px[o + 2] += (b - px[o + 2]) * t;
      }
    }
  }
  function line(a, b, width, color) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * width / 2, ny = dx / len * width / 2;
    fill([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], color);
  }
  function dot(c, rad, color) {
    const pts = [];
    for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2; pts.push([c[0] + rad * Math.cos(t), c[1] + rad * Math.sin(t)]); }
    fill(pts, color);
  }
  /* 置中文字；y 是基線（同 SVG text） */
  function text(str, cx, baseline, kind, color) {
    const gs = [...str].map(ch => GLYPHS[kind + ch]).filter(Boolean);
    const total = gs.reduce((s, g) => s + g.adv, 0);
    let x = Math.round(cx - total / 2);
    const [r, g, b] = hex(color);
    for (const gl of gs) {
      const a = glyphAlpha(gl);
      const top = Math.round(baseline) - gl.asc, left = x + gl.l;
      for (let j = 0; j < gl.h; j++) for (let i = 0; i < gl.w; i++) {
        const t = a[j * gl.w + i] / 255;
        const X = left + i, Y = top + j;
        if (!t || X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const o = (Y * W + X) * 3;
        px[o] += (r - px[o]) * t; px[o + 1] += (g - px[o + 1]) * t; px[o + 2] += (b - px[o + 2]) * t;
      }
      x += gl.adv;
    }
  }
  return { px, fill, line, dot, text };
}

/* 雷達圖原始像素（RGB） */
export function radarPixels(dims) {
  const c = canvas();
  const N = 6, R = 78 * SCALE, cx = 110 * SCALE, cy = 106 * SCALE;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  for (const f of [0.25, 0.5, 0.75, 1]) {
    const ring = Array.from({ length: N }, (_, i) => pt(i, R * f));
    for (let i = 0; i < N; i++) c.line(ring[i], ring[(i + 1) % N], (f === 1 ? 1.2 : 0.6) * SCALE, '#d8ccb0');
    for (const p of ring) c.dot(p, (f === 1 ? 0.6 : 0.3) * SCALE, '#d8ccb0');
  }
  for (let i = 0; i < N; i++) c.line([cx, cy], pt(i, R), 0.6 * SCALE, '#e2d8c2');
  const poly = dims.map((v, i) => pt(i, R * v / 100));
  c.fill(poly, '#c0392b', 0.18);
  for (let i = 0; i < N; i++) { c.line(poly[i], poly[(i + 1) % N], 1.6 * SCALE, '#c0392b'); c.dot(poly[i], 0.8 * SCALE, '#c0392b'); }
  for (const p of poly) c.dot(p, 2.6 * SCALE, '#c0392b');
  DIMS.forEach((d, i) => {
    const [x, y] = pt(i, R + 16 * SCALE);
    c.text(d, x, y + 4 * SCALE, 'b', '#5a4630');
    c.text(String(dims[i]), x, y + 16 * SCALE, 'r', '#a08c6a');
  });
  return c.px;
}

/* ---------- PNG 編碼 ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
async function zlib(raw) {
  const s = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'));   /* 'deflate' = zlib 格式，正是 PNG 要的 */
  return new Uint8Array(await new Response(s).arrayBuffer());
}
export async function radarPng(dims) {
  const px = radarPixels(dims);
  const raw = new Uint8Array((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);   /* 每列前面補 filter 0 */
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H); ihdr[8] = 8; ihdr[9] = 2;   /* 8-bit RGB */
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', await zlib(raw)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/* 網址上的六個分數 → 陣列；不合法回 null */
export function parseDims(s) {
  const d = String(s || '').split('-').map(Number);
  return d.length === 6 && d.every(v => Number.isInteger(v) && v >= 0 && v <= 100) ? d : null;
}
export const RADAR_RATIO = '220:228';
