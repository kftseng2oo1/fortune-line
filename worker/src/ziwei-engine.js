/* 自動產生，請勿手動修改。來源：kftseng2oo1/z1 index.html（紫微斗數AI大師）
 * 重新產生：python3 scripts/extract-ziwei.py <z1 的 index.html> */
const LUNAR_INFO = [
0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a4d0,0x0d150,0x0f252,
0x0d520
];
function lunarMonthDays(y,m){return(LUNAR_INFO[y-1900]&(0x10000>>m))?30:29;}
function leapMonth(y){return LUNAR_INFO[y-1900]&0xf;}
function leapDays(y){if(leapMonth(y))return(LUNAR_INFO[y-1900]&0x10000)?30:29;return 0;}
function lunarYearDays(y){let s=348;for(let i=0x8000;i>0x8;i>>=1)s+=(LUNAR_INFO[y-1900]&i)?1:0;return s+leapDays(y);}

function solarToLunar(sy, sm, sd) {
    // 使用 Date.UTC 確保無時區偏移，Math.floor 確保精確整數
    const base = Date.UTC(1900, 0, 31);
    const target = Date.UTC(sy, sm - 1, sd);
    let offset = Math.floor((target - base) / 86400000);

    let ly = 1900;
    for (; ly < 2101; ly++) {
        const yDays = lunarYearDays(ly);
        if (offset < yDays) break;
        offset -= yDays;
    }
    const leap = leapMonth(ly);
    let lm = 0, isLeapMonth = false;
    for (let i = 1; i <= 12; i++) {
        const mDays = lunarMonthDays(ly, i);
        if (offset < mDays) { lm = i; break; }
        offset -= mDays;
        if (i === leap) {
            const lDays = leapDays(ly);
            if (offset < lDays) { lm = i; isLeapMonth = true; break; }
            offset -= lDays;
        }
    }
    if (lm === 0) lm = 12;
    return { year: ly, month: lm, day: offset + 1, isLeap: isLeapMonth, leapMonth: leap };
}


const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const DZ_INDEX = {}; DI_ZHI.forEach((d,i) => DZ_INDEX[d] = i);
const TG_INDEX = {}; TIAN_GAN.forEach((g,i) => TG_INDEX[g] = i);

const PALACE_NAMES = ['命宮','兄弟宮','夫妻宮','子女宮','財帛宮','疾厄宮','遷移宮','交友宮','官祿宮','田宅宮','福德宮','父母宮'];

// 四化表
const SIHUA = {
    '甲':{祿:'廉貞',權:'破軍',科:'武曲',忌:'太陽'},
    '乙':{祿:'天機',權:'天梁',科:'紫微',忌:'太陰'},
    '丙':{祿:'天同',權:'天機',科:'文昌',忌:'廉貞'},
    '丁':{祿:'太陰',權:'天同',科:'天機',忌:'巨門'},
    '戊':{祿:'貪狼',權:'太陰',科:'右弼',忌:'天機'},
    '己':{祿:'武曲',權:'貪狼',科:'天梁',忌:'文曲'},
    '庚':{祿:'太陽',權:'武曲',科:'太陰',忌:'天同'},
    '辛':{祿:'巨門',權:'太陽',科:'文曲',忌:'文昌'},
    '壬':{祿:'天梁',權:'紫微',科:'左輔',忌:'武曲'},
    '癸':{祿:'破軍',權:'巨門',科:'太陰',忌:'貪狼'}
};
const SH_KEYS = ['祿','權','科','忌'];
const SH_CLS = {祿:'lu',權:'quan',科:'ke',忌:'ji'};


class Palace {
    constructor(palaceIndex, dzIdx, gan) {
        this.index = palaceIndex;         // 宮序 0-11（命宮=0）
        this.dzIdx = dzIdx;               // 地支索引
        this.dz = DI_ZHI[dzIdx];
        this.gan = gan;
        this.name = PALACE_NAMES[palaceIndex];
        this.stars = { m: [], a: [], b: [], minor: [] };
        this.sihua = null;                // 本宮飛化結果（lazy computed）
    }

    /** 取得對宮（沖宮）索引，命=0對遷=6，財=4對田=10，etc. */
    getOppositePalaceIndex() {
        return (this.index + 6) % 12;
    }

    /** 取得三方四正（本宮＋對宮＋三合二宮）的宮序陣列 */
    getThreeHarmonyGroup() {
        const base = this.index;
        return [
            base,
            (base + 4) % 12,
            (base + 8) % 12,
            (base + 6) % 12   // 對宮補入四正
        ];
    }

    /** 判斷此宮是否為「我宮」（命遷財官三方四正視角）*/
    isSelfGroup(palaceIndex) {
        return this.getThreeHarmonyGroup().includes(palaceIndex);
    }

    /** 六合宮（子-丑、寅-亥、卯-戌、辰-酉、巳-申、午-未）*/
    getLiuHePalaceDz() {
        const liuhe = [1,0,11,10,9,8,7,6,5,4,3,2]; // 每個地支的六合地支索引
        return DI_ZHI[liuhe[this.dzIdx]];
    }

    /** 計算本宮飛化落點（配合全盤 palaces 陣列）*/
    computeSihua(allPalaces) {
        if (!SIHUA[this.gan]) { this.sihua = null; return null; }
        const sh = SIHUA[this.gan];
        const result = {};
        for (const k of SH_KEYS) {
            const starName = sh[k];
            const target = allPalaces.find(p =>
                [...p.stars.m, ...p.stars.a, ...p.stars.b].includes(starName)
            );
            result[k] = {
                star: starName,
                targetPalace: target ? target.name : '(盤外)',
                targetPalaceIndex: target ? target.index : -1,
                targetDz: target ? target.dz : '',
                isSelfTarget: target ? this.isSelfGroup(target.index) : false
            };
        }
        this.sihua = result;
        return result;
    }

    /** 偵測自化 */
    getSelfTransformations() {
        if (!SIHUA[this.gan]) return [];
        const sh = SIHUA[this.gan];
        const all = [...this.stars.m, ...this.stars.a, ...this.stars.b];
        return SH_KEYS
            .filter(k => all.includes(sh[k]))
            .map(k => ({ type: k, star: sh[k] }));
    }
}


// ================================================================
function getYearGanZhi(year) {
    const g = (year - 4) % 10;
    const z = (year - 4) % 12;
    return { gan: TIAN_GAN[g], zhi: DI_ZHI[z], ganIdx: g, zhiIdx: z };
}

// ================================================================
//  2. 五行局 (由命宮的納音五行決定)
// ================================================================
// 宮位天干由年干 + 月份推算（五虎遁）
function getPalaceGan(yearGan, monthOrDzIdx) {
    // 五虎遁年上起月：甲己之年丙作首，乙庚之年戊為頭...
    const startMap = { 0:2, 1:4, 2:6, 3:8, 4:0, 5:2, 6:4, 7:6, 8:8, 9:0 };
    const yIdx = TG_INDEX[yearGan];
    const base = startMap[yIdx];
    // 寅=2 is the first month, so dz index 2 maps to offset 0
    const offset = ((monthOrDzIdx - 2) + 12) % 12;
    return TIAN_GAN[(base + offset) % 10];
}

// 五行局查表：根據命宮天干+地支的納音五行
// 六十甲子納音：每兩干支一組，同組同納音
// 金四局=4, 木三局=3, 水二局=2, 火六局=6, 土五局=5
//
// 甲子乙丑 海中金(4)  丙寅丁卯 爐中火(6)  戊辰己巳 大林木(3)
// 庚午辛未 路傍土(5)  壬申癸酉 劍鋒金(4)
// 甲戌乙亥 山頭火(6)  丙子丁丑 澗下水(2)  戊寅己卯 城頭土(5)
// 庚辰辛巳 白蠟金(4)  壬午癸未 楊柳木(3)
// 甲申乙酉 泉中水(2)  丙戌丁亥 屋上土(5)  戊子己丑 霹靂火(6)
// 庚寅辛卯 松柏木(3)  壬辰癸巳 長流水(2)
// 甲午乙未 沙中金(4)  丙申丁酉 山下火(6)  戊戌己亥 平地木(3)
// 庚子辛丑 壁上土(5)  壬寅癸卯 金箔金(4)
// 甲辰乙巳 覆燈火(6)  丙午丁未 天河水(2)  戊申己酉 大驛土(5)
// 庚戌辛亥 釵釧金(4)  壬子癸丑 桑柘木(3)
// 甲寅乙卯 大溪水(2)  丙辰丁巳 沙中土(5)  戊午己未 天上火(6)
// 庚申辛酉 石榴木(3)  壬戌癸亥 大海水(2)
const WUXING_JU_TABLE = {
    // 第1組 甲子乙丑 海中金
    '甲子':4,'乙丑':4,
    // 第2組 丙寅丁卯 爐中火
    '丙寅':6,'丁卯':6,
    // 第3組 戊辰己巳 大林木
    '戊辰':3,'己巳':3,
    // 第4組 庚午辛未 路傍土
    '庚午':5,'辛未':5,
    // 第5組 壬申癸酉 劍鋒金
    '壬申':4,'癸酉':4,
    // 第6組 甲戌乙亥 山頭火
    '甲戌':6,'乙亥':6,
    // 第7組 丙子丁丑 澗下水
    '丙子':2,'丁丑':2,
    // 第8組 戊寅己卯 城頭土
    '戊寅':5,'己卯':5,
    // 第9組 庚辰辛巳 白蠟金
    '庚辰':4,'辛巳':4,
    // 第10組 壬午癸未 楊柳木
    '壬午':3,'癸未':3,
    // 第11組 甲申乙酉 泉中水
    '甲申':2,'乙酉':2,
    // 第12組 丙戌丁亥 屋上土
    '丙戌':5,'丁亥':5,
    // 第13組 戊子己丑 霹靂火
    '戊子':6,'己丑':6,
    // 第14組 庚寅辛卯 松柏木
    '庚寅':3,'辛卯':3,
    // 第15組 壬辰癸巳 長流水
    '壬辰':2,'癸巳':2,
    // 第16組 甲午乙未 沙中金
    '甲午':4,'乙未':4,
    // 第17組 丙申丁酉 山下火
    '丙申':6,'丁酉':6,
    // 第18組 戊戌己亥 平地木
    '戊戌':3,'己亥':3,
    // 第19組 庚子辛丑 壁上土
    '庚子':5,'辛丑':5,
    // 第20組 壬寅癸卯 金箔金
    '壬寅':4,'癸卯':4,
    // 第21組 甲辰乙巳 覆燈火
    '甲辰':6,'乙巳':6,
    // 第22組 丙午丁未 天河水
    '丙午':2,'丁未':2,
    // 第23組 戊申己酉 大驛土
    '戊申':5,'己酉':5,
    // 第24組 庚戌辛亥 釵釧金
    '庚戌':4,'辛亥':4,
    // 第25組 壬子癸丑 桑柘木
    '壬子':3,'癸丑':3,
    // 第26組 甲寅乙卯 大溪水
    '甲寅':2,'乙卯':2,
    // 第27組 丙辰丁巳 沙中土
    '丙辰':5,'丁巳':5,
    // 第28組 戊午己未 天上火
    '戊午':6,'己未':6,
    // 第29組 庚申辛酉 石榴木
    '庚申':3,'辛酉':3,
    // 第30組 壬戌癸亥 大海水
    '壬戌':2,'癸亥':2,
};

// 局數名稱：2=水二局, 3=木三局, 4=金四局, 5=土五局, 6=火六局
const JU_NAMES_CORRECT = { 2:'水二局', 3:'木三局', 4:'金四局', 5:'土五局', 6:'火六局' };

// 納音名稱對照（用於顯示）
const NAYIN_NAMES = {
    '甲子':'海中金','乙丑':'海中金','丙寅':'爐中火','丁卯':'爐中火',
    '戊辰':'大林木','己巳':'大林木','庚午':'路傍土','辛未':'路傍土',
    '壬申':'劍鋒金','癸酉':'劍鋒金','甲戌':'山頭火','乙亥':'山頭火',
    '丙子':'澗下水','丁丑':'澗下水','戊寅':'城頭土','己卯':'城頭土',
    '庚辰':'白蠟金','辛巳':'白蠟金','壬午':'楊柳木','癸未':'楊柳木',
    '甲申':'泉中水','乙酉':'泉中水','丙戌':'屋上土','丁亥':'屋上土',
    '戊子':'霹靂火','己丑':'霹靂火','庚寅':'松柏木','辛卯':'松柏木',
    '壬辰':'長流水','癸巳':'長流水','甲午':'沙中金','乙未':'沙中金',
    '丙申':'山下火','丁酉':'山下火','戊戌':'平地木','己亥':'平地木',
    '庚子':'壁上土','辛丑':'壁上土','壬寅':'金箔金','癸卯':'金箔金',
    '甲辰':'覆燈火','乙巳':'覆燈火','丙午':'天河水','丁未':'天河水',
    '戊申':'大驛土','己酉':'大驛土','庚戌':'釵釧金','辛亥':'釵釧金',
    '壬子':'桑柘木','癸丑':'桑柘木','甲寅':'大溪水','乙卯':'大溪水',
    '丙辰':'沙中土','丁巳':'沙中土','戊午':'天上火','己未':'天上火',
    '庚申':'石榴木','辛酉':'石榴木','壬戌':'大海水','癸亥':'大海水',
};

function getWuxingJu(mingGan, mingDz) {
    const key = mingGan + mingDz;
    return WUXING_JU_TABLE[key] || 2;
}

// ================================================================
//  3. 命宮、身宮定位
// ================================================================
function getMingGongDz(lunarMonth, hourIdx) {
    // 命宮地支：正月在寅，順數至生月，再逆數至生時（子時算第0步）
    // 公式：(2 + month - 1 - hourIdx + 12) % 12
    const idx = ((2 + lunarMonth - 1 - hourIdx) % 12 + 12) % 12;
    return idx; // index into DI_ZHI
}

function getShenGongDz(lunarMonth, hourIdx) {
    // 身宮地支：正月在寅，順數至生月，再順數至生時（子時算第0步）
    // 公式：(2 + month - 1 + hourIdx) % 12
    const idx = (2 + lunarMonth - 1 + hourIdx) % 12;
    return idx;
}

// ================================================================
//  4. 安紫微星 (餘數定宮、商數定步法)
// ================================================================
// 「六五四三二，酉午亥辰丑」
// 餘數對應宮位表：
const ZIWEI_REMAINDER = {
    2: { 1: 1 },             // 水二局: 餘1=丑
    3: { 1: 4, 2: 1 },       // 木三局: 餘1=辰, 餘2=丑
    4: { 1: 11, 2: 4, 3: 1 },// 金四局: 餘1=亥, 餘2=辰, 餘3=丑
    5: { 1: 6, 2: 11, 3: 4, 4: 1 }, // 土五局: 餘1=午, 餘2=亥, 餘3=辰, 餘4=丑
    6: { 1: 5, 2: 6, 3: 0, 4: 7, 5: 9 }, // 火六局: 餘1=巳, 餘2=午, 餘3=子, 餘4=未, 餘5=酉
};

function getZiweiDz(lunarDay, juNum) {
    // 借數法：找最小的 x≥0 使 (日+x) 能被局數整除，商為 q
    // 從寅宮起數 q 步（寅=第1步）；借數 x 為奇數則逆退 x 宮，偶數則順進 x 宮
    let x = 0;
    while ((lunarDay + x) % juNum !== 0) x++;
    const q = (lunarDay + x) / juNum;
    let pos = 2 + q - 1;
    pos += (x % 2 === 1) ? -x : x;
    return ((pos % 12) + 12) % 12;
}

// ================================================================
//  5. 十四主星安星
// ================================================================
// 紫微星系 (紫微, 天機, 太陽, 武曲, 天同, 廉貞)
function getZiweiGroup(ziweiDzIdx) {
    // Offsets from 紫微 position (counterclockwise)
    // 紫微→天機: -1, 空→太陽: -3, 武曲: -4, 天同: -5, 空→廉貞: -8
    return {
        '紫微': ziweiDzIdx,
        '天機': (ziweiDzIdx - 1 + 12) % 12,
        '太陽': (ziweiDzIdx - 3 + 12) % 12,
        '武曲': (ziweiDzIdx - 4 + 12) % 12,
        '天同': (ziweiDzIdx - 5 + 12) % 12,
        '廉貞': (ziweiDzIdx - 8 + 12) % 12,
    };
}

// 天府星系 (天府, 太陰, 貪狼, 巨門, 天梁, 七殺, 破軍, 天相)
function getTianfuGroup(ziweiDzIdx) {
    // 天府 mirrors 紫微: if 紫微 at dz, 天府 at (寅+寅 - dz) = (4 - dz)
    // Actually: 紫微與天府以寅-申軸對稱
    const tianfuIdx = (4 - ziweiDzIdx + 12) % 12;
    // The rest follow sequentially from 天府
    return {
        '天府': tianfuIdx,
        '太陰': (tianfuIdx + 1) % 12,
        '貪狼': (tianfuIdx + 2) % 12,
        '巨門': (tianfuIdx + 3) % 12,
        '天相': (tianfuIdx + 4) % 12,
        '天梁': (tianfuIdx + 5) % 12,
        '七殺': (tianfuIdx + 6) % 12,
        '破軍': (tianfuIdx + 10) % 12,
    };
}

// ================================================================
//  6. 輔助星安星
// ================================================================

// 文昌、文曲 (依出生時辰)
function getWenStars(hourIdx) {
    // 文昌：戌起子時逆行
    const wenchangIdx = (10 - hourIdx + 12) % 12;
    // 文曲：辰起子時順行
    const wenquIdx = (4 + hourIdx) % 12;
    return { '文昌': wenchangIdx, '文曲': wenquIdx };
}

// 左輔、右弼 (依農曆月)
function getZuoYou(lunarMonth) {
    // 左輔：辰起正月順行
    const zuofuIdx = (4 + lunarMonth - 1) % 12;
    // 右弼：戌起正月逆行
    const youbiIdx = (10 - lunarMonth + 1 + 12) % 12;
    return { '左輔': zuofuIdx, '右弼': youbiIdx };
}

// 天魁、天鉞 (依年干)
function getKuiYue(yearGan) {
    const table = {
        '甲': { '天魁': '丑', '天鉞': '未' },
        '乙': { '天魁': '子', '天鉞': '申' },
        '丙': { '天魁': '亥', '天鉞': '酉' },
        '丁': { '天魁': '亥', '天鉞': '酉' },
        '戊': { '天魁': '丑', '天鉞': '未' },
        '己': { '天魁': '子', '天鉞': '申' },
        '庚': { '天魁': '丑', '天鉞': '未' },
        '辛': { '天魁': '午', '天鉞': '寅' },
        '壬': { '天魁': '卯', '天鉞': '巳' },
        '癸': { '天魁': '卯', '天鉞': '巳' },
    };
    const t = table[yearGan];
    return { '天魁': DZ_INDEX[t['天魁']], '天鉞': DZ_INDEX[t['天鉞']] };
}

// 擎羊、陀羅、火星、鈴星
function getShaStars(yearGan, hourIdx, yearZhi) {
    // 擎羊：年干定位
    const qingyangTable = { '甲':'卯','乙':'辰','丙':'午','丁':'未','戊':'午','己':'未','庚':'酉','辛':'戌','壬':'子','癸':'丑' };
    // 陀羅：擎羊前一位
    const tuoluoTable = { '甲':'丑','乙':'寅','丙':'辰','丁':'巳','戊':'辰','己':'巳','庚':'未','辛':'申','壬':'戌','癸':'亥' };

    const qyIdx = DZ_INDEX[qingyangTable[yearGan]];
    const tlIdx = DZ_INDEX[tuoluoTable[yearGan]];

    // 火星：寅午戌年丑起、申子辰年寅起、巳酉丑年卯起、亥卯未年酉起，子時起順行至生時
    // 鈴星：寅午戌年卯起，其餘年份戌起，子時起順行至生時
    const zIdx = DZ_INDEX[yearZhi];
    const group = [2, 6, 10].includes(zIdx) ? 'yinwuxu'
                : [8, 0, 4].includes(zIdx)  ? 'shenzichen'
                : [5, 9, 1].includes(zIdx)  ? 'siyouchou' : 'haimaowei';
    const huoStart  = { yinwuxu: 1, shenzichen: 2, siyouchou: 3, haimaowei: 9 }[group];
    const lingStart = group === 'yinwuxu' ? 3 : 10;
    const huoxingIdx  = (huoStart + hourIdx) % 12;
    const lingxingIdx = (lingStart + hourIdx) % 12;

    return {
        '擎羊': qyIdx,
        '陀羅': tlIdx,
        '火星': huoxingIdx,
        '鈴星': lingxingIdx,
    };
}

// 地空、地劫 (依時辰)
function getDiKongJie(hourIdx) {
    // 地劫：亥起子時順行
    const dijieIdx = (11 + hourIdx) % 12;
    // 地空：亥起子時逆行
    const dikongIdx = (11 - hourIdx + 12) % 12;
    return { '地空': dikongIdx, '地劫': dijieIdx };
}

// 祿存 (依年干)
function getLucun(yearGan) {
    const table = { '甲':'寅','乙':'卯','丙':'巳','丁':'午','戊':'巳','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子' };
    return { '祿存': DZ_INDEX[table[yearGan]] };
}

// 天馬 (依年支)
function getTianma(yearZhi) {
    const table = { '寅':'申','申':'寅','巳':'亥','亥':'巳','子':'寅','午':'申','卯':'巳','酉':'亥','辰':'寅','戌':'申','丑':'亥','未':'巳' };
    return { '天馬': DZ_INDEX[table[yearZhi]] };
}

// ================================================================
//  7. 大限計算
// ================================================================
function getDaxianStart(juNum) {
    return juNum; // 大限起始歲數 = 五行局數 - simplified: actually ju number + some offset
    // Typically: 水二局起2歲, 木三局起3歲, etc.
}

function getDaxianDirection(yearGanIdx, gender) {
    // 陽男陰女順行，陰男陽女逆行
    const isYangGan = (yearGanIdx % 2 === 0);
    const isMale = (gender === 'M');
    return (isYangGan === isMale) ? 1 : -1; // 1=順, -1=逆
}

// ================================================================
//  8. MASTER: 完整排盤
// ================================================================
function calculateChart(lunarYear, lunarMonth, lunarDay, hourIdx, gender, isLeap) {
    const yearGZ = getYearGanZhi(lunarYear);
    const yearGan = yearGZ.gan;
    const yearZhi = yearGZ.zhi;

    // 閏月：初一～十五算本月，十六起算下一個月（影響命宮、身宮、左輔、右弼）
    let effectiveMonth = lunarMonth;
    if (isLeap && lunarDay > 15) effectiveMonth = lunarMonth % 12 + 1;

    // 1. 命宮地支
    const mingDzIdx = getMingGongDz(effectiveMonth, hourIdx);
    const shenDzIdx = getShenGongDz(effectiveMonth, hourIdx);

    // 2. 命宮天干 (五虎遁)
    const mingGan = getPalaceGan(yearGan, mingDzIdx);

    // 3. 五行局
    const juNum = getWuxingJu(mingGan, DI_ZHI[mingDzIdx]);

    // 4. 十二宮排列（使用 Palace 物件類別）
    const palaces = [];
    for (let i = 0; i < 12; i++) {
        const actualDzIdx = (mingDzIdx - i + 12) % 12;
        const pGan = getPalaceGan(yearGan, actualDzIdx);
        const p = new Palace(i, actualDzIdx, pGan);
        p.isMing = (i === 0);
        p.isShen = (actualDzIdx === shenDzIdx);
        palaces.push(p);
    }

    // 5. 安紫微星
    const ziweiDzIdx = getZiweiDz(lunarDay, juNum);

    // 6. 安十四主星
    const ziweiGroup = getZiweiGroup(ziweiDzIdx);
    const tianfuGroup = getTianfuGroup(ziweiDzIdx);
    const mainStars = { ...ziweiGroup, ...tianfuGroup };

    // Place main stars
    for (const [star, dzIdx] of Object.entries(mainStars)) {
        const p = palaces.find(pp => pp.dzIdx === dzIdx);
        if (p) p.stars.m.push(star);
    }

    // 7. 輔助星
    const wenStars = getWenStars(hourIdx);
    const zuoyou = getZuoYou(effectiveMonth);
    const kuiyue = getKuiYue(yearGan);
    const lucun = getLucun(yearGan);
    const tianma = getTianma(yearZhi);

    const assistStars = { ...wenStars, ...zuoyou, ...kuiyue, ...lucun, ...tianma };
    for (const [star, dzIdx] of Object.entries(assistStars)) {
        const p = palaces.find(pp => pp.dzIdx === dzIdx);
        if (p) p.stars.a.push(star);
    }

    // 8. 煞星
    const shaStars = getShaStars(yearGan, hourIdx, yearZhi);
    const dikj = getDiKongJie(hourIdx);
    const badStars = { ...shaStars, ...dikj };
    for (const [star, dzIdx] of Object.entries(badStars)) {
        const p = palaces.find(pp => pp.dzIdx === dzIdx);
        if (p) p.stars.b.push(star);
    }

    // 9. 大限
    // 順行：從命宮往地支增加方向（子→丑→寅→...）
    // 逆行：從命宮往地支減少方向（子→亥→戌→...）
    const daxianStart = juNum;
    const daxianDir = getDaxianDirection(yearGZ.ganIdx, gender);

    const daxianList = []; // ordered list of daxian periods
    for (let i = 0; i < 12; i++) {
        const idx = (mingDzIdx + daxianDir * i + 120) % 12;   // 第一大限就在命宮
        const p = palaces.find(pp => pp.dzIdx === idx);
        if (p) {
            const startAge = daxianStart + i * 10;
            const endAge = startAge + 9;
            p.daxian = `${startAge}-${endAge}`;
            p.daxianStart = startAge;
            p.daxianEnd = endAge;
            daxianList.push({ palaceName: p.name, dz: p.dz, gan: p.gan, dzIdx: idx, startAge, endAge });
        }
    }

    return {
        yearGan, yearZhi, mingDzIdx, shenDzIdx,
        mingGan, juNum, palaces,
        ziweiDzIdx, lunarYear: lunarYear,
        lunarMonth: lunarMonth, effectiveMonth: effectiveMonth, hourIdx: hourIdx,
        daxianDir: daxianDir > 0 ? '順行' : '逆行',
        daxianList,
        mainStarsMap: mainStars,
        assistStarsMap: assistStars,
        gender,
    };
}


export { solarToLunar, leapMonth, lunarMonthDays, leapDays, calculateChart, getYearGanZhi, TIAN_GAN, DI_ZHI, PALACE_NAMES, SIHUA, SH_KEYS, JU_NAMES_CORRECT };
