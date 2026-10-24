/* 自動產生，請勿手動修改。來源：kftseng2oo1/z1 index.html 的「人格全方位分析」
 * 重新產生：python3 scripts/extract-ziwei.py <z1 的 index.html> */
import { SIHUA, SH_KEYS } from './ziwei-engine.js';
let chartData = null;
function palaceByDz(palaces, dzIdx) {
    return palaces.find(p => p.dzIdx === dzIdx);
}

function findStarInPalaces(palaces, starName) {
    for (const p of palaces) {
        const all = [...p.stars.m, ...p.stars.a, ...p.stars.b, ...p.stars.minor];
        if (all.includes(starName)) return p;
    }
    return null;
}

function computeFly(palaces, gan) {
    const sh = SIHUA[gan];
    if (!sh) return null;
    const result = {};
    for (const k of SH_KEYS) {
        const star = sh[k];
        const target = findStarInPalaces(palaces, star);
        result[k] = { star, targetPalace: target ? target.name : '(盤外)', targetDz: target ? target.dz : '' };
    }
    return result;
}

function detectSelfTrans(palace) {
    const sh = SIHUA[palace.gan];
    if (!sh) return [];
    const all = [...palace.stars.m, ...palace.stars.a, ...palace.stars.b];
    const res = [];
    for (const k of SH_KEYS) {
        if (all.includes(sh[k])) res.push({ type: k, star: sh[k] });
    }
    return res;
}

const MF_BRIGHT = {
    '紫微': ['平','廟','廟','旺','得','旺','廟','廟','旺','平','得','旺'],
    '天機': ['廟','陷','得','旺','利','平','廟','陷','得','旺','利','平'],
    '太陽': ['陷','陷','旺','廟','旺','旺','旺','得','閒','閒','陷','陷'],
    '武曲': ['旺','廟','得','利','廟','平','旺','廟','得','利','廟','平'],
    '天同': ['旺','陷','利','平','平','廟','陷','陷','旺','平','平','廟'],
    '廉貞': ['平','利','廟','平','利','陷','平','利','廟','平','利','陷'],
    '天府': ['廟','廟','廟','得','廟','得','旺','廟','得','旺','廟','得'],
    '太陰': ['廟','廟','旺','陷','陷','陷','陷','利','利','旺','旺','廟'],
    '貪狼': ['旺','廟','平','利','廟','陷','旺','廟','平','利','廟','陷'],
    '巨門': ['旺','陷','廟','廟','陷','旺','旺','陷','廟','廟','陷','旺'],
    '天相': ['廟','廟','廟','陷','得','得','廟','得','廟','陷','得','得'],
    '天梁': ['廟','旺','廟','廟','旺','陷','廟','旺','陷','得','旺','陷'],
    '七殺': ['旺','廟','廟','陷','旺','平','旺','廟','廟','陷','廟','平'],
    '破軍': ['廟','旺','得','陷','旺','平','廟','旺','得','陷','旺','平'],
};
function mfBrightLevel(word) {
    if (word === '廟' || word === '旺') return 1;
    if (word === '陷' || word === '閒') return -1;
    return 0;
}

const PS_DIMS = ['領導', '智謀', '穩定', '人緣', '感性', '行動'];
// 十四主星：六維基準（0–10）、關鍵詞、優點、盲點、廟旺／落陷時的變化
const PS_STAR = {
    '紫微': { d: [9,6,7,5,4,6], k: '帝王氣度', good: '有主見、能統御、氣度大', flaw: '好面子、耳根軟、不喜受制於人', hi: '尊貴有威信，能服眾', lo: '孤君自負、眼高手低' },
    '天機': { d: [4,9,4,6,6,6], k: '機智善謀', good: '反應快、善於企劃分析', flaw: '想太多、定性不足', hi: '謀略精準、應變一流', lo: '多慮浮動、聰明反被聰明誤' },
    '太陽': { d: [7,5,5,8,5,8], k: '熱情外放', good: '光明磊落、樂於付出', flaw: '愛面子、付出多回收少', hi: '名聲貴氣、受人敬重', lo: '勞而少功、外熱內虛' },
    '武曲': { d: [7,5,7,3,3,8], k: '剛毅務實', good: '果決務實、理財能力強', flaw: '剛硬少圓融、不輕易妥協', hi: '財權在握、執行力強', lo: '固執勞碌、財來財去' },
    '天同': { d: [3,5,6,8,7,3], k: '溫和知足', good: '隨和好相處、善於調和', flaw: '鬥志不足、容易安逸', hi: '福氣自來、人生較順', lo: '懶散多煩、偏享受型' },
    '廉貞': { d: [6,6,5,6,7,7], k: '熱情執著', good: '有才藝、做事俐落、敢愛敢恨', flaw: '好勝倔強、愛恨執著', hi: '正派有原則、自律', lo: '衝動惹是非、作繭自縛' },
    '天府': { d: [7,6,9,7,4,4], k: '穩重包容', good: '大器包容、善守成管理', flaw: '保守、不愛冒險', hi: '財庫豐盈、能撐大局', lo: '空庫虛名、優柔寡斷' },
    '太陰': { d: [3,6,6,6,9,3], k: '溫柔細膩', good: '細心體貼、富美感', flaw: '情緒內藏、多愁善感', hi: '溫婉有福、善積蓄', lo: '憂慮多思、情緒起伏' },
    '貪狼': { d: [5,6,3,9,7,7], k: '多才交際', good: '魅力強、多才多藝、交遊廣', flaw: '慾望多、難以專一', hi: '才華得展、交際得利', lo: '貪多嚼不爛、流於享樂' },
    '巨門': { d: [4,8,4,4,5,5], k: '口才分析', good: '分析力強、口才好、追根究柢', flaw: '疑心重、易招口舌', hi: '言之有物、以口為業', lo: '是非纏身、牢騷多' },
    '天相': { d: [5,6,7,8,5,5], k: '正直協調', good: '厚道公正、善於協調服務', flaw: '依附性強、受環境左右', hi: '印星掌權、受信任', lo: '隨波逐流、缺乏主見' },
    '天梁': { d: [7,7,7,6,4,4], k: '老成護蔭', good: '有正義感、樂於照顧人', flaw: '好為人師、清高孤傲', hi: '逢凶化吉、德望高', lo: '愛管閒事、孤僻' },
    '七殺': { d: [8,5,3,3,3,10], k: '剛猛開創', good: '果敢有魄力、能開疆闢土', flaw: '性急衝動、孤剋', hi: '將星得地、能成大功', lo: '有勇無謀、起伏大' },
    '破軍': { d: [6,5,2,5,5,10], k: '求新求變', good: '敢衝敢破、勇於創新', flaw: '衝動善變、消耗大', hi: '破後能立、東山再起', lo: '破而難立、反覆折騰' },
};
// 輔星、煞星對六維的修正與描述
const PS_AUX = {
    '左輔': { d: [0,0,1,2,0,0], t: '得助力、善協調', good: true },
    '右弼': { d: [0,0,1,2,0,0], t: '得助力、善協調', good: true },
    '文昌': { d: [0,2,0,0,1,0], t: '斯文重才學', good: true },
    '文曲': { d: [0,1,0,1,2,0], t: '有才藝、口才佳', good: true },
    '天魁': { d: [1,0,0,1,0,0], t: '貴人多、氣質端正', good: true },
    '天鉞': { d: [1,0,0,1,0,0], t: '貴人多、氣質端正', good: true },
    '祿存': { d: [0,0,2,-1,0,0], t: '謹慎重積蓄、較保守', good: true },
    '天馬': { d: [0,0,-1,0,0,2], t: '好動、閒不下來', good: true },
    '擎羊': { d: [1,0,-1,-2,0,2], t: '剛烈直接、好勝', good: false },
    '陀羅': { d: [0,0,-1,-1,1,-1], t: '拖延糾結、暗中較勁', good: false },
    '火星': { d: [0,0,-2,-1,0,2], t: '性急、情緒易爆發', good: false },
    '鈴星': { d: [0,0,-2,-1,1,0], t: '悶燒、情緒壓抑', good: false },
    '地空': { d: [0,1,-2,0,1,0], t: '想法特殊、不按常理', good: false },
    '地劫': { d: [0,1,-2,0,0,0], t: '理想化、起落較大', good: false },
};
const PS_HUA = {   // 生年四化在命宮主星
    '祿': { d: [0,0,0,1,0.5,0], t: '人緣與福氣加分，性情圓融' },
    '權': { d: [1.5,0,0,0,0,1], t: '主導欲強、能擔責任' },
    '科': { d: [0,1,0.5,0,0,0], t: '重形象、講道理、有條理' },
    '忌': { d: [0,0,-1.5,0,1,0], t: '執著、放不下，對自己要求高' },
};
const PS_PATTERN = {
    '殺破狼':   { name: '開創型', stars: ['七殺','破軍','貪狼'], t: '敢衝敢變，喜歡開疆闢土，人生起伏較大', job: '創業、業務、開拓新市場、專案攻堅', relate: '給他空間和明確目標，不要管得太細' },
    '機月同梁': { name: '幕僚型', stars: ['天機','太陰','天同','天梁'], t: '重安穩，善規劃與服務，做事細膩', job: '公職、專業技術、企劃、教育、服務業', relate: '給安全感，肯定他的細心與付出' },
    '紫府廉武相': { name: '管理型', stars: ['紫微','天府','廉貞','武曲','天相'], t: '重權責與實利，善組織與掌控資源', job: '管理、財務、行政、經營', relate: '尊重他的主導權，溝通講重點、講實際' },
    '巨日':     { name: '傳播型', stars: ['巨門','太陽'], t: '以口才與名聲立足，熱心表達', job: '教育、法律、傳播、顧問、業務', relate: '坦白直接，避免讓他起疑' },
};
const PS_GOOD = { 領導: '具統御與決策力', 智謀: '思考縝密、善於謀劃', 穩定: '穩健可靠、能守成', 人緣: '人緣佳、善交際協調', 感性: '感受力強、富同理心與美感', 行動: '行動力強、說做就做' };
const PS_WEAK = { 領導: '不愛出頭，需要有人推一把', 智謀: '多憑直覺，重要決定宜多做功課', 穩定: '情緒或計畫容易變動，需要規律', 人緣: '較獨立、少圓融，宜多經營關係', 感性: '偏理性務實，容易忽略他人感受', 行動: '想得多做得慢，宜給自己設期限' };
const PS_FIX = {   // 命宮干化忌入某宮：一生的執著點
    '命宮': '執著自我，凡事一肩扛', '兄弟宮': '在意手足同儕，也在意現金週轉', '夫妻宮': '執著感情與伴侶',
    '子女宮': '牽掛子女、部屬或投資', '財帛宮': '對金錢有不安全感，看重收入', '疾厄宮': '在意身體，容易內耗操勞',
    '遷移宮': '在意外界眼光，心常向外求', '交友宮': '重朋友義氣，容易為人所累', '官祿宮': '執著事業成就，容易成為工作狂',
    '田宅宮': '戀家念舊，執著家庭與置產', '福德宮': '想法多，精神容易內耗', '父母宮': '在意長輩上司的評價，重名分與文書',
};
const PS_SELF = { 祿: '命宮自化祿：大方隨和、不計較，但好處也容易守不住', 權: '命宮自化權：自我要求高、好強，不服輸',
                  科: '命宮自化科：重形象、講道理，遇事先求體面', 忌: '命宮自化忌：容易鑽牛角尖、自我否定，宜學會放過自己' };

function psBright(star, dz) {
    const w = (typeof MF_BRIGHT !== 'undefined' && MF_BRIGHT[star]) ? MF_BRIGHT[star][dz] : '';
    return { w, lv: w ? mfBrightLevel(w) : 0 };
}
// 某宮的主星（空宮借對宮）
function psMains(palaces, p) {
    if (p.stars.m.length) return { stars: p.stars.m, dz: p.dzIdx, borrowed: false };
    const opp = palaceByDz(palaces, (p.dzIdx + 6) % 12);
    return { stars: opp ? opp.stars.m : [], dz: opp ? opp.dzIdx : p.dzIdx, borrowed: true };
}
function psKeyword(palaces, p) {
    const M = psMains(palaces, p);
    if (!M.stars.length) return '（無主星）';
    return (M.borrowed ? '借' : '') + M.stars.map(s => {
        const b = psBright(s, M.dz);
        return s + (b.w ? `(${b.w})` : '') + (PS_STAR[s] ? '・' + PS_STAR[s].k : '');
    }).join('、');
}

function analyzePersonality() {
    if (!chartData) return null;
    const P = chartData.palaces;
    const byName = n => P.find(p => p.name === n);
    const ming = byName('命宮'), qian = byName('遷移宮'), cai = byName('財帛宮'), guan = byName('官祿宮'), fu = byName('福德宮');
    const shen = P.find(p => p.isShen) || ming;
    const sameShen = shen === ming;
    const bSh = SIHUA[chartData.yearGan];

    // ── 六維：主星加權平均 ──
    const sum = [0,0,0,0,0,0]; let wsum = 0;
    const basis = { good: [], flaw: [] };
    const addPalace = (p, w, label) => {
        const M = psMains(P, p);
        const ww = M.borrowed ? w * 0.7 : w;
        M.stars.forEach(s => {
            const st = PS_STAR[s]; if (!st) return;
            const b = psBright(s, M.dz);
            const d = st.d.slice();
            if (b.lv > 0) { d[0] += 0.5; d[2] += 0.5; }
            if (b.lv < 0) { d[0] -= 1; d[2] -= 1; }
            d.forEach((v, i) => sum[i] += v * ww / M.stars.length);
            if (label === '命') {
                basis.good.push({ t: st.good + (b.lv > 0 ? `，${st.hi}` : ''), why: `${s}${b.w ? b.w : ''}坐命` });
                basis.flaw.push({ t: st.flaw + (b.lv < 0 ? `，${st.lo}` : ''), why: `${s}${b.w ? b.w : ''}坐命` });
            }
        });
        if (M.stars.length) wsum += ww;
    };
    addPalace(ming, sameShen ? 1.3 : 1.0, '命');
    addPalace(qian, 0.5); addPalace(cai, 0.35); addPalace(guan, 0.35); addPalace(fu, 0.6);
    if (!sameShen) addPalace(shen, 0.6);
    const base = sum.map(v => wsum ? v / wsum : 5);

    // ── 修正：輔煞（命 1、福德與身 0.5）、生年四化 ──
    const mod = [0,0,0,0,0,0];
    const auxNotes = [];
    [[ming, 1, '命'], [fu, 0.5, '福德'], ...(sameShen ? [] : [[shen, 0.5, '身']])].forEach(([p, f, lab]) => {
        [...p.stars.a, ...p.stars.b].forEach(s => {
            const a = PS_AUX[s]; if (!a) return;
            a.d.forEach((v, i) => mod[i] += v * f);
            if (lab === '命') {
                auxNotes.push({ star: s, t: a.t, good: a.good });
                (a.good ? basis.good : basis.flaw).push({ t: a.t, why: `${s}在命` });
            } else if (!a.good) {
                basis.flaw.push({ t: a.t, why: lab === '福德' ? `內心：${s}在福德` : `後天：${s}在身宮` });
            }
        });
    });
    const mingHua = [];
    [...ming.stars.m, ...ming.stars.a].forEach(s => SH_KEYS.forEach(k => {
        if (bSh[k] === s) { mingHua.push({ star: s, k }); PS_HUA[k].d.forEach((v, i) => mod[i] += v); }
    }));
    const dims = base.map((v, i) => Math.max(5, Math.min(98, Math.round(v * 10 + mod[i] * 4))));

    // ── 格局分型（命宮三方四正主星） ──
    const sf = [ming, qian, cai, guan].flatMap(p => psMains(P, p).stars);
    const mingStars = psMains(P, ming).stars;
    let pattern = null, best = -1;
    Object.entries(PS_PATTERN).forEach(([key, pt]) => {
        const c = sf.filter(s => pt.stars.includes(s)).length + mingStars.filter(s => pt.stars.includes(s)).length * 2;
        if (c > best) { best = c; pattern = { key, ...pt }; }
    });

    // ── 飛星心性 ──
    const mFly = computeFly(P, ming.gan);
    const fixP = mFly && mFly['忌'] ? mFly['忌'].targetPalace : '';
    const luP  = mFly && mFly['祿'] ? mFly['祿'].targetPalace : '';
    let laiyin = P.filter(p => p.gan === chartData.yearGan);
    if (laiyin.length > 1) laiyin = laiyin.filter(p => p.dzIdx !== 0 && p.dzIdx !== 1);
    laiyin = laiyin[0] || null;
    const selfT = detectSelfTrans(ming);

    // ── 優勢與盲點（六維補充） ──
    const order = dims.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
    const topDims = order.slice(0, 2).map(x => PS_DIMS[x[1]]);
    const lowDims = order.slice(-2).map(x => PS_DIMS[x[1]]).filter((d, j) => order.slice(-2)[j][0] < 55);
    topDims.forEach(d => basis.good.push({ t: PS_GOOD[d], why: `六維${d}突出` }));
    lowDims.forEach(d => basis.flaw.push({ t: PS_WEAK[d], why: `六維${d}偏低` }));
    mingHua.forEach(h => (h.k === '忌' ? basis.flaw : basis.good).push({ t: PS_HUA[h.k].t, why: `生年${h.star}化${h.k}在命` }));
    selfT.forEach(s => (s.type === '忌' ? basis.flaw : basis.good).push({ t: PS_SELF[s.type].split('：')[1], why: `命宮${s.star}自化${s.type}` }));

    const mainKey = mingStars.length ? mingStars.map(s => PS_STAR[s] ? PS_STAR[s].k : s).join('、') : '性格隨環境變化';
    const headline = `${pattern ? pattern.name : ''}・${mainKey}${fixP ? `・執著在${fixP.replace('宮', '')}` : ''}`;

    return { ming, qian, cai, guan, fu, shen, sameShen, dims, pattern, fixP, luP, laiyin, selfT, mingHua, auxNotes,
             good: basis.good.slice(0, 6), flaw: basis.flaw.slice(0, 6), topDims, lowDims, headline };
}


/* chart = calculateChart() 的原始結果 */
export function personalityOf(chart) { chartData = chart; try { return analyzePersonality(); } finally { chartData = null; } }
export { PS_DIMS, psKeyword };
