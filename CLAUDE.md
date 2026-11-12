---
project: 英語學扶資源
category: GAS學習扶助
status: 維護中
version: "@29"
url: https://script.google.com/macros/s/AKfycbz9yWdBRA26XbOAOsHkOsBwUP6Ul2bw-zCbYaB94z1431R28FVyFZ_xN_FY6Iw_9vYaIg/exec
next_action: "@29 報表建議可一次分析多個年級；研習回饋待處理：Wordwall 改原始網址、Google 搜尋入口頁"
updated: 2026-11-12
---

# CLAUDE.md — 新北英語學扶資源庫

教師查詢英語學扶數位資源的 Web App。試算表更新即自動同步，**不需重新部署**。

> 詳細版本歷程、Bug 修復、編輯團隊見 `專案進度記錄.md`。

---

## 部署

**部署前先改 `Code.js` 最上方的 `APP_VERSION` 與 `APP_UPDATED`**（頁尾顯示用，版本號填這次部署後的號碼）。

```bash
clasp push
clasp deploy --deploymentId AKfycbz9yWdBRA26XbOAOsHkOsBwUP6Ul2bw-zCbYaB94z1431R28FVyFZ_xN_FY6Iw_9vYaIg
```

| 項目 | 值 |
|---|---|
| Script ID | `1xvZpkZDdjXdENlalatyLik63gE0p7lesfC8gS9BOyiqhzTonzOIBqns8` |
| Deployment ID | `AKfycbz9yWdBRA26XbOAOsHkOsBwUP6Ul2bw-zCbYaB94z1431R28FVyFZ_xN_FY6Iw_9vYaIg` |
| Sheets ID | `1DmN1oFXCyqp4XL7C92IsExE-571XJxNenKgSrlaJe_Q` |

| 頁面 | URL |
|---|---|
| 卡片篩選版 | `<base>/exec` |
| 樹狀側邊目錄版（主推）| `<base>/exec?page=scroll` |
| 報表對應資源 | `<base>/exec?page=report` |

---

## 試算表結構

**工作表 `English`** — 欄位：`[0]年級 [1]領域 [2]類型 [3]單元 [4]名稱 [5]形式 [6]網址`

> 第一列為空白列、第二列才是標題。前端用 `filter(row => row[0] && row[0] !== '年級')` 同時過濾空白列與標題列（不要改用 `slice` 跳固定行數）。

**工作表 `更新紀錄`** — 鈴鐺通知用，欄位：`A:發布日期 B:更新類型 C:關聯年級 D:關聯領域/單元 E:更新內容 F:前台顯示狀態 G:備註`

- B 欄下拉：`🆕新增資源 / 🔄內容修正 / 📢系統公告`
- C 欄下拉：`全年級 / 三~六年級 / 歷屆考古題及重點整理`
- F 欄下拉：`顯示 / 隱藏`（隱藏或空白不顯示）

---

## 檔案結構

```
英語學扶資源/
├── Code.js                    後端：getDataFromSheet() 回傳 { resources, logs }；?page=scroll 路由
├── Index.html                 前端：卡片篩選 UI（左側連動下拉 + 關鍵字搜尋）
├── index_scroll.html          前端：樹狀側邊目錄 + 手風琴互動（主推）
├── *.html.bak                 備份（@21 部署前的 UX 版本）
├── 新北英語學扶資源.xlsx       試算表本機備份
└── 專案進度記錄.md             版本歷程
```

---

## 前端關鍵行為

- **鈴鐺通知**：`localStorage('changelog_last_read')` 比對最新日期，新內容才亮紅點，點開後更新已讀
- **樹狀目錄手風琴**：年級→領域→類型→單元三層，同層只能展開一個
- **點選 nav-link 跳錯年級**：手風琴收合會讓頁面驟縮，必用 `e.preventDefault() + scrollIntoView()`，不要用原生 `<a href="#anchor">`
- **頁面之間的連結不可用相對路徑**：GAS 跑在 iframe 裡，相對連結會失效。一律用 `getAppInfo().url`（後端 `ScriptApp.getService().getUrl()`）組完整網址，並加 `target="_top"`
- **type === unit 跳過一層**：例如「考古題 / 考古題」名稱相同時，直接顯示資源卡片，不要再渲染重複手風琴

---

## 復原前一版

```bash
cp index_scroll.html.bak index_scroll.html
clasp push && clasp deploy --deploymentId AKfycbz9yWdBRA26XbOAOsHkOsBwUP6Ul2bw-zCbYaB94z1431R28FVyFZ_xN_FY6Iw_9vYaIg
```

---

## 編輯團隊

新北市碧華國小：吳國榮
新北市更寮國小：王筱瑛
屏東縣竹田國小：劉蘋

---

## 不能動的地方

- **`English` 工作表第一列必須空白**：第二列才是標題列——前端用 `filter(row => row[0] && row[0] !== '年級')` 過濾，若改成第一列標題，資料解析會錯位
- **`更新紀錄` 工作表 B/C/F 欄下拉選單值固定**：前端依固定字串判斷圖示和顯示/隱藏邏輯，不可自行新增選項值
- **線上試算表已修正過的內容一律不可還原**：本機 `新北英語學扶資源.xlsx` 是 2026-02 舊版（215 列，線上 2026-09-20 已 258 列、改過單元名稱與資源形式）。任何腳本都只讀線上現況，**絕不可用本機 xlsx 或重新產生的資料覆寫 Sheets**；要加東西只能新增獨立工作表，且先經使用者確認
- **學扶測驗報告含學生真名**：報表 xlsx 與 `輸出/` 已在 `.gitignore` 排除，不可 commit、不可上傳公開網址。
  規劃中的報表對應功能走 GAS 網頁版，但**姓名必須在瀏覽器端就換成代號才送出**，伺服器端不得收到或儲存姓名（見 `docs/規格_學扶報表對應資源.md` 8.1）

## 報表對應資源（規劃中）

依學扶測驗報告的評量重點，找出基本學習內容細項與對應資源給老師。
- 已上線 @25：`?page=report`。後端 `Report.js`、前端 `index_report.html` ＋ `report_js.html`
- 對照表：`docs/指標資源對照表.md`（v1.3）　規格：`docs/規格_學扶報表對應資源.md`（v1.4）
- **年級比對一律用數字**：報表工作表是「4年級」、設定檔是「四年級」，靠 `gradeNum_`／`sameGrade_` 轉換（見 PITFALLS）

**設定檔放在同一份試算表的五個新工作表**（改完即生效，不必重新部署）：
`指標對應`、`評量重點別名`、`比對規則`、`字詞主題`、`主題別名`。
只新增、不修改 `English` 與 `更新紀錄`。repo 的 `data/` 存同內容 CSV 當備份，執行時以線上為準。

> 2026-09-20 已把舊副本 `工作表2` 改名為 `舊版備份_勿用_2026-02`（215 列，2026-02 版）。
> 已比對確認：它沒有任何 `English` 沒有的資源，15 筆差異是編輯團隊把 Gemini 分享連結換成 Google Sites，另 2 筆（`Gemini - CVC` 重複、`Weather Match!`）已被取代。不要在它上面編輯，也不可當資料來源。

---

## 部署後驗證清單

- 開卡片版（`/exec`）→ 左側三層下拉（年級/領域/類型）有值，可篩出資源卡片
- 開樹狀版（`?page=scroll`）→ 手風琴展開後有資源連結
- 若有新`更新紀錄`資料：右上角鈴鐺有紅點提示，點開有更新清單
