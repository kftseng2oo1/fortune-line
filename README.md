# 每日命盤運勢 LINE Bot（階段一：免費版 MVP）

用戶加 LINE 好友、輸入一次生辰，之後點圖文選單「今日運勢」就會收到依自己紫微命盤算出的運勢卡片。輸入方式與 z1 相同：國曆或農曆日期、十三時辰（早子／晚子分開）、性別。
排盤採用紫微斗數，引擎直接從 [紫微斗數AI大師（z1）](https://kftseng2oo1.github.io/z1/) 原始碼抽出，同一組生辰在兩邊排出的命盤完全相同。

「今日運勢」回覆是兩張卡的輪播：第一張是紫微運勢；第二張是「西洋星座參考」，分項星等沿用 [Astro](https://kftseng2oo1.github.io/astro/) 的算法，並附當日心靈小語。仍然只用一次 Reply，不花推播額度。

免費版所有訊息都用 **Reply API** 回覆，不消耗官方帳號的推播額度，用免費的「輕用量」方案即可上線。

## 目錄

```
worker/            Cloudflare Worker（webhook、排盤、AI 解讀、LIFF API）
  src/index.js     路由與 LINE 事件處理
  src/ziwei-engine.js  安星引擎（由 z1 index.html 自動抽出，勿手改）
  src/ziwei.js     生辰驗證、排盤包裝、命盤摘要、人格特質
  src/ziwei-personality.js  人格全方位分析（由 z1 自動抽出，勿手改）
  src/radar.js     六維人格雷達圖 PNG（不用套件；同分數只畫一次，存 KV）
  src/radar-glyphs.js  雷達圖文字點陣（由 scripts/make-radar-glyphs.py 產生）
  src/daily.js     流日命宮、流日四化、星等、宜忌、盤型 hash
  src/astro-engine.js  星座運勢與每日一句（由 astro index.html 自動抽出，勿手改）
  src/astro.js     星座卡：分項星等、月亮星座、血型提示
  src/ai.js        經 arcar 呼叫 AI，結果快取在 KV
  src/iching.js    易經卜卦：三數起卦、抽牌、變卦
  src/iching-data.js   64 卦 384 爻資料（由數位易經 App 自動抽出，勿手改）
  src/line.js      簽章驗證、Reply、Flex 卡片
  wrangler.toml
index.html         LIFF 生辰輸入頁（ES5、無 alert/confirm），由 GitHub Pages 發佈
privacy.html       隱私政策
scripts/
  richmenu.png         圖文選單圖片（2500×1686，2 列 × 3 格）
  make-richmenu.py     重新產生圖片
  setup-richmenu.mjs   建立並套用圖文選單
  extract-ziwei.py     從 z1 重新抽出安星引擎
  extract-astro.py     從 Astro 重新抽出星座運勢
  extract-iching.mjs   從數位易經 App 重新抽出卦爻資料
  make-icon.py         產生 assets/ 裡的圖示
assets/
  icon-1024.png        LINE Login channel 的 App icon
  line-profile-640.png 官方帳號大頭貼（會被裁成圓形，主體已在安全區內）
  favicon-32.png、apple-touch-icon.png、icon-192/512.png  網頁圖示
test/
  webhook-sim.mjs      模擬整段 LINE 對話（11 項檢查）
  engine-parity.mjs    與 z1 原始碼逐宮比對 600 組生辰（含晚子時、農曆輸入）
  astro-parity.mjs     與 Astro 原始碼比對 5,760 組（120 天 × 12 星座 × 4 血型）
```

## 部署步驟

### 1. LINE 官方帳號與 Messaging API

1. 到 [LINE Official Account Manager](https://manager.line.biz/) 建立官方帳號（方案選「輕用量」即可）。
2. 帳號設定 → Messaging API → 啟用，選擇一個 Provider（記住是哪一個，第 2 步要用同一個）。
3. 回應設定：**關閉**「自動回應訊息」與「加入好友的歡迎訊息」，**開啟** Webhook。
4. 到 [LINE Developers Console](https://developers.line.biz/console/) 找到這個 Messaging API channel：
   - Basic settings → 複製 **Channel secret**
   - Messaging API → 發行 **Channel access token (long-lived)**

### 2. LINE Login channel 與 LIFF

1. 在**同一個 Provider** 下新增 **LINE Login** channel（同 Provider 的兩個 channel，用戶 ID 才會相同）。
2. Basic settings → 複製 **Channel ID**（填到 `LINE_LOGIN_CHANNEL_ID`）。
3. LIFF 分頁 → Add：
   - Size：Full
   - Endpoint URL：`https://kftseng2oo1.github.io/fortune-line/`
   - Scopes：勾 **openid**（profile 不需要）
   - 建立後複製 **LIFF ID**
4. 把這個 LINE Login channel 從 Developing 改成 **Published**，否則只有你自己能開。

### 3. Cloudflare Worker

```bash
cd worker
npm install
npx wrangler kv namespace create FORTUNE_KV   # 把輸出的 id 貼到 wrangler.toml
```

編輯 `wrangler.toml`：

- `id` ← 上面的 KV id
- `LIFF_ID`、`LINE_LOGIN_CHANNEL_ID` ← 第 2 步取得的值
- `[[services]]` 的 `service = "arcar"` 要和 Cloudflare 後台 arcar Worker 的實際名稱一致

```bash
npx wrangler secret put LINE_CHANNEL_SECRET
npx wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
npm run deploy
```

部署完成後，回到 LINE Developers → Messaging API → Webhook URL 填：

```
https://fortune-line.kftseng2oo1.workers.dev/webhook
```

按 **Verify** 應顯示 Success，並開啟 **Use webhook**。

### 4. GitHub Pages（LIFF 頁面）

LIFF 頁就是本 repo 根目錄的 `index.html`、`privacy.html`（已附 `.nojekyll`）。

1. 修改 `index.html` 上方兩個值：`LIFF_ID` 與 `API`（Worker 網址，不含 `/webhook`），commit 到 main。
2. Settings → Pages → Source 選 `Deploy from a branch`，Branch 選 `main` / `(root)`。
3. 發佈後網址為 `https://kftseng2oo1.github.io/fortune-line/`，就是第 2 步 LIFF 的 Endpoint URL。

### 5. 圖文選單

```bash
cd scripts
node setup-richmenu.mjs        # 會詢問 access token，貼上後按 Enter
```

想改圖片：編輯 `make-richmenu.py` 後執行 `python3 make-richmenu.py richmenu.png`，再跑一次上面的指令（舊選單會自動刪除）。

### 6. 上線檢查

用手機加好友後依序測試：

- [ ] 加好友收到「輸入生辰」卡片
- [ ] 開 LIFF 輸入生辰，儲存後顯示命宮、四化、大限（可和 z1 對照）
- [ ] 點「今日運勢」收到兩張卡（紫微＋星座），第二次點會更快（命中快取）
- [ ] 星座卡的分項星等與 Astro App 當天相同
- [ ] 點「我的命盤」顯示命宮主星、身宮、五行局、生年四化、目前大限
- [ ] 「資料與隱私」→「刪除我的資料」→ 確定，資料被刪除

看即時記錄：`cd worker && npx wrangler tail`

## 測試

```bash
cd worker
npm test                                          # 模擬 LINE 對話，不需要帳號
npm run parity -- ../../z1/index.html             # z1 更新後，確認引擎仍一致

# 若不一致：重新抽出引擎再測一次
python3 ../scripts/extract-ziwei.py ../../z1/index.html

npm run parity-astro -- ../../astro/index.html     # Astro 更新後確認星座卡一致
python3 ../scripts/extract-astro.py ../../astro/index.html   # 不一致時重新抽出
```

## 設計說明

- **省推播額度**：免費版只用 Reply API（不計則數）；webhook 先回 200，事件用 `waitUntil` 在背景處理。
- **流日算法**：流日命宮以「日支」定位，看它落在本命哪一宮、宮內主星（空宮借對宮）與煞星；流日四化依日干，看祿權科忌飛入本命哪一宮。
- **省 AI 費用**：AI 解讀只依「流日命宮落宮與星曜、有無煞星、化祿與化忌落在流日命宮／對宮／要宮／其他、星等」產生，同特徵的人共用一篇，快取 2 天。實測 10,000 位用戶一天約需 1,800 篇，30,000 位約 2,100 篇（趨於飽和）。四化的確切宮位逐人計算、直接顯示在卡片上。
- **AI 失敗不中斷**：逾時或錯誤時改用固定句型回覆，不寫入快取，下一位用戶會再試一次 AI。
- **星等**：門檻依 400 張命盤 × 120 天的分數分布校準，約 1★10%、2★20%、3★40%、4★20%、5★10%，避免天天低分。
- **隱私**：不存姓名；送給 AI 的只有命理特徵，沒有生日或 LINE ID；LIFF 呼叫一律用 LINE 驗證 ID token 取得 userId，不信任前端。
- **黃曆宜忌**：直接由內建曆法計算，不需要另存 `daily:` 快取。
- **星座卡**：只顯示分項、不給總分，並標成「西洋星座參考」，讓紫微當主角。只取 Astro 在隨機排序之前就決定的內容，因為 Astro 用 `sort(() => r() - .5)` 挑宜忌與總評，結果會隨瀏覽器排序實作不同（iPhone 與 Android 可能不一樣）。
- **大字顯示**：LINE 的 Flex 卡片不能用手指縮放，所以卡片用最寬的 giga 尺寸、字級都上調一級，並開啟 `scaling`，文字會跟著 LINE「設定 → 聊天 → 字型大小」一起放大。
- **星座加分**：星座卡有 5 顆星的分項時，紫微卡多一列「星座加分・今日幸運：愛情、事業」，星座卡該項也標「今日幸運」。最多兩項，約三分之一的日子會出現；把兩套系統的差異變成互補，而不是互相矛盾。
- **血型不知道**：分數取四種血型的平均，標題不顯示血型。
- **易經卜卦**：選類別（事業、愛情、財運等 8 類）→ 打三個數字或按「幫我抽三張牌」→ 回覆卦卡（本卦、動爻、爻辭、該類別的白話指引、變卦）。起卦法同數位易經：第一個數字 ÷8 定上卦，第二、三個數字相加 ÷8 定下卦，三數相加 ÷6 定動爻。爻辭與解讀直接取自 App 資料庫，不呼叫 AI、不需要生辰；選好的類別暫存在 KV `iching:{userId}`，10 分鐘後失效。
- **我的命盤**：兩張卡輪播。第一張「紫微人格特質」：類型標題（例：管理型・穩重包容・執著在福德）、六維雷達圖（領導、智謀、穩定、人緣、感性、行動）、格局基調、優勢與盲點，算法整段取自 z1 的「人格全方位分析」，結果與 z1 相同。第二張是命盤資料與三層人格。雷達圖由 Worker 的 `/radar/{六個分數}.png` 產生，第一次約 15 ms CPU，之後從 KV `radar:v1:` 取。LIFF 存檔後也會顯示同一張圖。
- **心靈小語**：每天每個星座由 AI 寫一句、所有同星座的人共用（一天最多 12 次呼叫），會參考昨天的句子避免重複；AI 失敗時改用 Astro 的 365 句句庫（同一年內每天不重複）。送給 AI 的只有日期與星座，不含任何個人資料。

## KV 資料

| Key | 內容 |
| --- | --- |
| `user:{lineUserId}` | 生辰（含血型）、命盤、方案（free）、同意時間、是否封鎖 |
| `reading:{YYYY-MM-DD}:{hash}` | AI 解讀文字，TTL 2 天 |
| `quote:{YYYY-MM-DD}:{星座}` | 心靈小語，TTL 2 天 |
| `radar:v1:{六個分數}` | 雷達圖 PNG（不過期，同分數的人共用） |
| `iching:{lineUserId}` | 卜卦已選的類別，等使用者輸入數字，TTL 10 分鐘 |

## 下一步：階段二（付費推播）

過關條件：30 位以上好友，且一半的人一週查詢超過 3 次。達標後再做：

- 金流定期定額與回呼（`order:`、`paid:index`）
- 00:30 備料、07:00 推播的兩段 Cron 與失敗重試
- 付費用戶推播頻率設定（每天／重要日子）
