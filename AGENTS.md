---
project: 英語學扶資源
category: GAS學習扶助
status: 維護中
version: "@21"
url: https://script.google.com/macros/s/AKfycbz9yWdBRA26XbOAOsHkOsBwUP6Ul2bw-zCbYaB94z1431R28FVyFZ_xN_FY6Iw_9vYaIg/exec
next_action: "—"
updated: 2026-04-30
---

# AGENTS.md — 新北英語學扶資源庫

教師查詢英語學扶數位資源的 Web App。試算表更新即自動同步，**不需重新部署**。

> 詳細版本歷程、Bug 修復、編輯團隊見 `專案進度記錄.md`。

---

## 部署

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

---

## 部署後驗證清單

- 開卡片版（`/exec`）→ 左側三層下拉（年級/領域/類型）有值，可篩出資源卡片
- 開樹狀版（`?page=scroll`）→ 手風琴展開後有資源連結
- 若有新`更新紀錄`資料：右上角鈴鐺有紅點提示，點開有更新清單

## 使用者說「收工」時：四件事，缺一不可

**這不是「更新文件」清單。第 1 和第 4 項不是文件，卻最常被漏掉。**

**1. `git commit`（最常被漏掉的一件）**

```bash
git status --short          # 有東西就代表要 commit
git add -A
git commit                  # 訊息寫清楚做了什麼
```

**commit 一律做，不需要問使用者。push 才要先問。** 這兩件事不同。
（這個資料夾若不是 git repo，本項跳過。）

> 2026-09-10 的教訓：某個專案一整天 2300 行改動全部只躺在工作區，
> 因為當時的收工流程裡沒有這一條。

**2. frontmatter** — 更新專案 `CLAUDE.md`（沒有就找 `AGENTS.md`）頂端 `---` 區塊的
`status` / `version` / `next_action` / `updated` 四欄，不動其他內容。檔案維持 UTF-8 無 BOM。

**3. `handoff.md`** — 停在哪、本次驗證了什麼、下次接續什麼、有什麼地雷。

**4. 執行備份腳本（整台電腦一次，不是每個專案一次）**

```
G:\我的雲端硬碟\AI設定同步\收工.bat
```

它備份 `C:\Users\wu\` 底下的 AI 設定、記憶與憑證 — 那些雲端硬碟碰不到，
不跑這步，換到另一台電腦就沒有。跑完要等 Google 雲端硬碟顯示「已完成同步處理」。

**換到另一台電腦開工前**，該台先跑 `G:\我的雲端硬碟\AI設定同步\開工.bat`。

若同一次動到多個專案，第 1～3 項每個專案各做一次，第 4 項整台只做一次。
